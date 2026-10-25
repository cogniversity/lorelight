import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt, encrypt } from '../common/crypto.util';
import { CreateAudioProviderDto } from './dto/audio-provider.dto';

const MAGE_BASE_URL = 'https://api.mage.space';

@Injectable()
export class AudioProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list(seriesId: string) {
    const providers = await this.prisma.audioProviderConfig.findMany({
      where: { seriesId },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map(provider => ({
      id: provider.id,
      seriesId: provider.seriesId,
      provider: provider.provider,
      displayName: provider.displayName,
      model: provider.model,
      isActive: provider.isActive,
      hasApiKey: true,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
    }));
  }

  async create(seriesId: string, dto: CreateAudioProviderDto) {
    if (!dto.apiKey.trim().startsWith('mage_sk_')) {
      throw new BadRequestException('Mage API keys must start with mage_sk_.');
    }
    const encryptionKey =
      this.config.get<string>('app.secretEncryptionKey') ?? '';
    if (encryptionKey.length < 32) {
      throw new BadRequestException(
        'SECRET_ENCRYPTION_KEY must contain at least 32 characters before provider keys can be stored.',
      );
    }
    if (dto.isActive !== false) {
      await this.prisma.audioProviderConfig.updateMany({
        where: { seriesId },
        data: { isActive: false },
      });
    }
    const provider = await this.prisma.audioProviderConfig.create({
      data: {
        seriesId,
        provider: 'MAGE',
        displayName: dto.displayName?.trim() || 'Mage Seed Audio',
        model: 'seed-audio-1.0',
        encryptedKey: encrypt(dto.apiKey.trim(), encryptionKey),
        isActive: dto.isActive ?? true,
      },
    });
    return (await this.list(seriesId)).find(item => item.id === provider.id);
  }

  async remove(seriesId: string, id: string) {
    await this.findOrFail(seriesId, id);
    await this.prisma.audioProviderConfig.delete({ where: { id } });
    return { deleted: true, id };
  }

  async test(seriesId: string, id: string) {
    const provider = await this.findOrFail(seriesId, id);
    const response = await fetch(`${MAGE_BASE_URL}/v1/account`, {
      headers: { Authorization: `Bearer ${this.decryptKey(provider.encryptedKey)}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await this.readBody(response);
    if (!response.ok) {
      throw new BadGatewayException(
        this.errorMessage(body, `Mage connection failed (${response.status})`),
      );
    }
    return { success: true, account: body };
  }

  async getActiveKey(seriesId: string) {
    const provider = await this.prisma.audioProviderConfig.findFirst({
      where: { seriesId, isActive: true, provider: 'MAGE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!provider) {
      throw new BadRequestException(
        'No active Mage audio provider is configured for this series.',
      );
    }
    return {
      apiKey: this.decryptKey(provider.encryptedKey),
      model: provider.model,
      providerId: provider.id,
      baseUrl: MAGE_BASE_URL,
    };
  }

  private async findOrFail(seriesId: string, id: string) {
    const provider = await this.prisma.audioProviderConfig.findFirst({
      where: { id, seriesId },
    });
    if (!provider) throw new NotFoundException('Audio provider not found');
    return provider;
  }

  private decryptKey(value: string) {
    const encryptionKey =
      this.config.get<string>('app.secretEncryptionKey') ?? '';
    const candidateKeys = [...new Set([encryptionKey, ''])];
    for (const candidate of candidateKeys) {
      try {
        return decrypt(value, candidate);
      } catch {
        // Try the legacy empty-key encryption used by earlier local builds.
      }
    }
    throw new BadRequestException(
      'The stored Mage API key cannot be decrypted. Delete and re-add the Mage audio provider in Series Settings.',
    );
  }

  private async readBody(response: Response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text.slice(0, 500) };
    }
  }

  private errorMessage(body: any, fallback: string) {
    return body?.error?.message ?? body?.message ?? fallback;
  }
}
