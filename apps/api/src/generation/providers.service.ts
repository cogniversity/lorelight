import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from './adapters/llm-factory.service';
import { encrypt } from '../common/crypto.util';
import { CreateLlmProviderDto } from './dto/create-provider.dto';
import { UpdateLlmProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly factory: LlmFactoryService,
  ) {}

  // ── List ─────────────────────────────────────────────────────────────────

  async listProviders(seriesId: string) {
    const configs = await this.prisma.llmProviderConfig.findMany({
      where: { seriesId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return configs.map(c => this.toDto(c));
  }

  // ── Create ───────────────────────────────────────────────────────────────

  async createProvider(seriesId: string, dto: CreateLlmProviderDto) {
    const encKey = this.config.get<string>('app.secretEncryptionKey') ?? '';
    let encryptedKey: string | undefined;
    if (dto.apiKey) {
      encryptedKey = encrypt(dto.apiKey, encKey);
    }

    // If this is marked as default, unset others
    if (dto.isDefault) {
      await this.prisma.llmProviderConfig.updateMany({
        where: { seriesId },
        data: { isDefault: false },
      });
    }

    const config = await this.prisma.llmProviderConfig.create({
      data: {
        seriesId,
        provider: dto.provider,
        displayName: dto.displayName,
        baseUrl: dto.baseUrl ?? null,
        model: dto.model,
        encryptedKey: encryptedKey ?? null,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        maxTokens: dto.maxTokens ?? 4096,
        temperature: dto.temperature ?? 0.7,
      },
    });

    return this.toDto(config);
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async updateProvider(
    seriesId: string,
    configId: string,
    dto: UpdateLlmProviderDto,
  ) {
    const existing = await this.findOrFail(seriesId, configId);
    const encKey = this.config.get<string>('app.secretEncryptionKey') ?? '';

    if (dto.isDefault) {
      await this.prisma.llmProviderConfig.updateMany({
        where: { seriesId, NOT: { id: configId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.llmProviderConfig.update({
      where: { id: configId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.apiKey !== undefined && { encryptedKey: encrypt(dto.apiKey, encKey) }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
      },
    });

    return this.toDto(updated);
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async deleteProvider(seriesId: string, configId: string) {
    await this.findOrFail(seriesId, configId);
    await this.prisma.llmProviderConfig.delete({ where: { id: configId } });
    return { deleted: true, configId };
  }

  // ── Test Connection ──────────────────────────────────────────────────────

  async testProvider(seriesId: string, configId: string) {
    const config = await this.findOrFail(seriesId, configId);
    const adapter = this.factory.build(config);

    const start = Date.now();
    try {
      const result = await adapter.generateStructured(
        'You are a helpful assistant. Respond with valid JSON only.',
        'Reply with {"status":"ok","message":"connection test successful"}',
        { type: 'object', properties: { status: { type: 'string' } } },
      );
      return {
        success: true,
        latencyMs: Date.now() - start,
        response: result.parsed,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err?.message ?? String(err),
      };
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  async findOrFail(seriesId: string, configId: string) {
    const config = await this.prisma.llmProviderConfig.findFirst({
      where: { id: configId, seriesId },
    });
    if (!config) throw new NotFoundException('Provider config not found');
    return config;
  }

  /** Strips encryptedKey from public responses */
  private toDto(c: {
    id: string;
    seriesId: string | null;
    provider: string;
    displayName: string;
    baseUrl: string | null;
    model: string;
    isDefault: boolean;
    isActive: boolean;
    maxTokens: number;
    temperature: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: c.id,
      seriesId: c.seriesId ?? undefined,
      provider: c.provider,
      displayName: c.displayName,
      baseUrl: c.baseUrl ?? undefined,
      model: c.model,
      isDefault: c.isDefault,
      isActive: c.isActive,
      maxTokens: c.maxTokens,
      temperature: c.temperature,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
