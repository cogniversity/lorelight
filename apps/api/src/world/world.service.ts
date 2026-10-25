import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorldEntityDto } from './dto/create-world-entity.dto';
import { QueryWorldDto } from './dto/query-world.dto';
import { UpdateWorldEntityDto } from './dto/update-world-entity.dto';

const DEFAULT_CHARACTER_AGE = 20;
const DEFAULT_CHARACTER_SKIN_TONE =
  'Fitzpatrick Type II Pinkish-ivory skin';

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
    const [entityConflict, versionConflict] = await Promise.all([
      this.prisma.worldEntity.findFirst({
        where: {
          seriesId,
          externalId,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      }),
      this.prisma.worldEntityVersion.findFirst({
        where: {
          externalId,
          entity: { seriesId },
          ...(excludeId ? { entityId: { not: excludeId } } : {}),
        },
        select: { id: true },
      }),
    ]);
    if (entityConflict || versionConflict) {
      throw new ConflictException(
        `externalId '${externalId}' is already used by another entity in this series`,
      );
    }
  }

  private async assertSeriesAsset(
    seriesId: string,
    assetId: string | undefined,
    expectedType: 'IMAGE' | 'AUDIO',
  ) {
    if (!assetId) return;
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId, type: expectedType },
      select: { id: true },
    });
    if (!asset) {
      throw new BadRequestException(
        `${expectedType === 'IMAGE' ? 'Image' : 'Voice sample'} asset must belong to this series and be ${expectedType.toLowerCase()}.`,
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
    if (
      dto.type !== 'CHARACTER' &&
      (dto.profilePhotoAssetId ||
        dto.voiceSampleAssetId ||
        dto.age !== undefined ||
        dto.ethnicity !== undefined ||
        dto.skinTone !== undefined)
    ) {
      throw new BadRequestException(
        'Character demographics and media can only be assigned to characters.',
      );
    }
    await Promise.all([
      this.assertSeriesAsset(seriesId, dto.profilePhotoAssetId, 'IMAGE'),
      this.assertSeriesAsset(seriesId, dto.voiceSampleAssetId, 'AUDIO'),
      this.assertSeriesAsset(seriesId, dto.referenceImageAssetId, 'IMAGE'),
    ]);

    return this.prisma.$transaction(async tx => {
      const entity = await tx.worldEntity.create({
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
        age: dto.type === 'CHARACTER'
          ? dto.age ?? DEFAULT_CHARACTER_AGE
          : null,
        ethnicity: dto.type === 'CHARACTER' ? dto.ethnicity : null,
        skinTone: dto.type === 'CHARACTER'
          ? dto.skinTone?.trim() || DEFAULT_CHARACTER_SKIN_TONE
          : null,
        visualDescription: dto.visualDescription,
        facialFeatures: dto.facialFeatures,
        visualSilhouetteDress: dto.visualSilhouetteDress,
        voiceDescription: dto.voiceDescription,
        voiceProfile: dto.voiceProfile,
        costumeDescription: dto.costumeDescription,
        mannerisms: dto.mannerisms,
        goals: dto.goals,
        motivations: dto.motivations,
        fears: dto.fears,
        biography: dto.biography,
        profilePhotoAssetId: dto.profilePhotoAssetId,
        voiceSampleAssetId: dto.voiceSampleAssetId,
        referenceImageAssetId: dto.referenceImageAssetId,
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
      const assignments = [
        dto.profilePhotoAssetId
          ? { assetId: dto.profilePhotoAssetId, role: 'PROFILE_PHOTO' as const }
          : null,
        dto.voiceSampleAssetId
          ? { assetId: dto.voiceSampleAssetId, role: 'VOICE_SAMPLE' as const }
          : null,
        dto.referenceImageAssetId
          ? { assetId: dto.referenceImageAssetId, role: 'REFERENCE_IMAGE' as const }
          : null,
      ].filter((item): item is NonNullable<typeof item> => !!item);
      if (assignments.length) {
        await tx.assetAssignment.createMany({
          data: assignments.map(assignment => ({
            ...assignment,
            seriesId,
            targetType: 'ENTITY',
            targetId: entity.id,
          })),
        });
      }
      return entity;
    });
  }

  async updateEntity(
    seriesId: string,
    entityId: string,
    dto: UpdateWorldEntityDto,
  ) {
    const existing = await this.getEntity(seriesId, entityId);
    if (
      existing.type !== 'CHARACTER' &&
      (dto.profilePhotoAssetId ||
        dto.voiceSampleAssetId ||
        dto.age !== undefined ||
        dto.ethnicity !== undefined ||
        dto.skinTone !== undefined)
    ) {
      throw new BadRequestException(
        'Character demographics and media can only be assigned to characters.',
      );
    }
    await Promise.all([
      this.assertSeriesAsset(seriesId, dto.profilePhotoAssetId, 'IMAGE'),
      this.assertSeriesAsset(seriesId, dto.voiceSampleAssetId, 'AUDIO'),
      this.assertSeriesAsset(seriesId, dto.referenceImageAssetId, 'IMAGE'),
    ]);

    // externalId: normalise to lowercase if provided; omit key entirely if not in DTO
    const hasExternalId = 'externalId' in dto;
    const externalId = this.normaliseExternalId(dto.externalId);

    if (externalId) {
      await this.assertExternalIdUnique(seriesId, externalId, entityId);
    }

    // Destructure type out — entity type is immutable after creation.
    const { type: _type, externalId: _raw, ...rest } = dto;

    // Determine which media fields are actually changing so we can
    // abandon old assignments and create new ones.
    const mediaChanges: Array<{
      role: 'PROFILE_PHOTO' | 'VOICE_SAMPLE' | 'REFERENCE_IMAGE';
      oldAssetId: string | null;
      newAssetId: string | null;
    }> = [];

    if (
      'profilePhotoAssetId' in dto &&
      dto.profilePhotoAssetId !== existing.profilePhotoAssetId
    ) {
      mediaChanges.push({
        role: 'PROFILE_PHOTO',
        oldAssetId: existing.profilePhotoAssetId,
        newAssetId: dto.profilePhotoAssetId ?? null,
      });
    }
    if (
      'voiceSampleAssetId' in dto &&
      dto.voiceSampleAssetId !== existing.voiceSampleAssetId
    ) {
      mediaChanges.push({
        role: 'VOICE_SAMPLE',
        oldAssetId: existing.voiceSampleAssetId,
        newAssetId: dto.voiceSampleAssetId ?? null,
      });
    }
    if (
      'referenceImageAssetId' in dto &&
      dto.referenceImageAssetId !== existing.referenceImageAssetId
    ) {
      mediaChanges.push({
        role: 'REFERENCE_IMAGE',
        oldAssetId: existing.referenceImageAssetId,
        newAssetId: dto.referenceImageAssetId ?? null,
      });
    }

    return this.prisma.$transaction(async tx => {
      // Handle assignment lifecycle for each changed media field
      for (const change of mediaChanges) {
        if (change.oldAssetId) {
          const prevAssignment = await tx.assetAssignment.findFirst({
            where: {
              seriesId,
              targetType: 'ENTITY',
              targetId: entityId,
              role: change.role,
              status: 'ASSIGNED',
            },
          });
          if (prevAssignment) {
            await tx.assetAssignment.update({
              where: { id: prevAssignment.id },
              data: {
                status: 'ABANDONED',
                replacedByAssetId: change.newAssetId,
                replacementNote: change.newAssetId
                  ? `Replaced by a different asset on ${new Date().toISOString()}.`
                  : `Removed from entity on ${new Date().toISOString()}.`,
              },
            });
          }
        }
        if (change.newAssetId) {
          await tx.assetAssignment.create({
            data: {
              assetId: change.newAssetId,
              seriesId,
              targetType: 'ENTITY',
              targetId: entityId,
              role: change.role,
              status: 'ASSIGNED',
            },
          });
        }
      }

      return tx.worldEntity.update({
        where: { id: entityId },
        data: {
          ...rest,
          ...(hasExternalId && { externalId: externalId ?? null }),
        },
      });
    });
  }

  async deleteEntity(seriesId: string, entityId: string) {
    await this.getEntity(seriesId, entityId);
    return this.prisma.$transaction(async tx => {
      const versionIds = (
        await tx.worldEntityVersion.findMany({
          where: { entityId },
          select: { id: true },
        })
      ).map(version => version.id);
      await tx.assetAssignment.updateMany({
        where: {
          seriesId,
          status: 'ASSIGNED',
          OR: [
            { targetType: 'ENTITY', targetId: entityId },
            ...(versionIds.length
              ? [{ targetType: 'ENTITY_VERSION' as const, targetId: { in: versionIds } }]
              : []),
          ],
        },
        data: {
          status: 'ABANDONED',
          replacementNote: `Target entity deleted on ${new Date().toISOString()}.`,
        },
      });
      return tx.worldEntity.delete({ where: { id: entityId } });
    });
  }
}
