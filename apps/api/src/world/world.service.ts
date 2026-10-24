import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorldEntityDto } from './dto/create-world-entity.dto';
import { QueryWorldDto } from './dto/query-world.dto';
import { UpdateWorldEntityDto } from './dto/update-world-entity.dto';

@Injectable()
export class WorldService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private normaliseExternalId(raw: string | undefined): string | undefined {
    return raw ? raw.toLowerCase() : undefined;
  }

  private async assertExternalIdUnique(
    seriesId: string,
    externalId: string,
    excludeId?: string,
  ) {
    const conflict = await this.prisma.worldEntity.findFirst({
      where: {
        seriesId,
        externalId,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        `externalId '${externalId}' is already used by another entity in this series`,
      );
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async listEntities(seriesId: string, query: QueryWorldDto) {
    const { type, q } = query;

    const where: Prisma.WorldEntityWhereInput = { seriesId };

    if (type) where.type = type;

    if (q) {
      const term = q.trim();
      where.OR = [
        { displayName: { contains: term, mode: 'insensitive' } },
        { subtitle: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term } },
      ];
    }

    return this.prisma.worldEntity.findMany({
      where,
      orderBy: [{ type: 'asc' }, { displayName: 'asc' }],
      select: {
        id: true,
        seriesId: true,
        type: true,
        displayName: true,
        externalId: true,
        subtitle: true,
        status: true,
        color: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getEntity(seriesId: string, entityId: string) {
    const entity = await this.prisma.worldEntity.findFirst({
      where: { id: entityId, seriesId },
    });
    if (!entity) throw new NotFoundException('World entity not found');
    return entity;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async createEntity(seriesId: string, dto: CreateWorldEntityDto) {
    const externalId = this.normaliseExternalId(dto.externalId);

    if (externalId) {
      await this.assertExternalIdUnique(seriesId, externalId);
    }

    return this.prisma.worldEntity.create({
      data: {
        seriesId,
        type: dto.type,
        displayName: dto.displayName,
        externalId: externalId ?? null,
        subtitle: dto.subtitle ?? '',
        description: dto.description ?? '',
        status: dto.status,
        color: dto.color,
        tags: dto.tags ?? [],
        // Character
        visualDescription: dto.visualDescription,
        voiceDescription: dto.voiceDescription,
        costumeDescription: dto.costumeDescription,
        mannerisms: dto.mannerisms,
        goals: dto.goals,
        motivations: dto.motivations,
        fears: dto.fears,
        biography: dto.biography,
        // Location
        architectureNotes: dto.architectureNotes,
        moodNotes: dto.moodNotes,
        lightingNotes: dto.lightingNotes,
        environmentNotes: dto.environmentNotes,
        weatherNotes: dto.weatherNotes,
        imagePrompt: dto.imagePrompt,
        environmentPrompt: dto.environmentPrompt,
        videoPrompt: dto.videoPrompt,
        // Artifact
        origin: dto.origin,
        currentOwner: dto.currentOwner,
        importance: dto.importance,
        // Organization
        purpose: dto.purpose,
        leadership: dto.leadership,
        members: dto.members,
      },
    });
  }

  async updateEntity(
    seriesId: string,
    entityId: string,
    dto: UpdateWorldEntityDto,
  ) {
    await this.getEntity(seriesId, entityId); // ensure it exists & belongs to series

    // externalId: normalise to lowercase if provided; omit key entirely if not in DTO
    const hasExternalId = 'externalId' in dto;
    const externalId = this.normaliseExternalId(dto.externalId);

    if (externalId) {
      await this.assertExternalIdUnique(seriesId, externalId, entityId);
    }

    // Destructure type out — entity type is immutable after creation.
    const { type: _type, externalId: _raw, ...rest } = dto;

    return this.prisma.worldEntity.update({
      where: { id: entityId },
      data: {
        ...rest,
        ...(hasExternalId && { externalId: externalId ?? null }),
      },
    });
  }

  async deleteEntity(seriesId: string, entityId: string) {
    await this.getEntity(seriesId, entityId);
    return this.prisma.worldEntity.delete({ where: { id: entityId } });
  }
}
