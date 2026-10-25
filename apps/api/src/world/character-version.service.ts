import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StoryAnchorType, WorldEntity, WorldEntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from '../generation/adapters/llm-factory.service';
import { ActivityService } from '../activity/activity.service';
import {
  CreateCharacterVersionDto,
  GenerateBaseCharacterPromptDto,
  UpdateCharacterVersionDto,
} from './dto/character-version.dto';

const PROMPT_SCHEMA = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'A reusable canonical visual prompt',
    },
  },
  required: ['prompt'],
};

@Injectable()
export class CharacterVersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmFactory: LlmFactoryService,
    private readonly activity: ActivityService,
  ) {}

  async list(seriesId: string, entityId: string) {
    const entity = await this.getEntity(seriesId, entityId);
    const versions = await this.prisma.worldEntityVersion.findMany({
      where: { entityId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return versions.map(version => this.toDto(version, entity));
  }

  async create(
    seriesId: string,
    entityId: string,
    userId: string,
    dto: CreateCharacterVersionDto,
  ) {
    const entity = await this.getEntity(seriesId, entityId);
    const normalized = await this.validateInput(seriesId, entityId, dto, entity.type);
    const position = await this.prisma.worldEntityVersion.count({
      where: { entityId },
    });
    const version = await this.prisma.$transaction(async tx => {
      const created = await tx.worldEntityVersion.create({
        data: {
          entityId,
          position,
          ...normalized,
        },
      });
      if (created.imageAssetId && !created.inheritMainImage) {
        await tx.assetAssignment.create({
          data: {
            assetId: created.imageAssetId,
            seriesId,
            targetType: 'ENTITY_VERSION',
            targetId: created.id,
            role: 'VERSION_IMAGE',
          },
        });
      }
      return created;
    });
    await this.activity.log(
      seriesId,
      userId,
      'ENTITY_VERSION_CREATED',
      'WorldEntityVersion',
      version.id,
      `${entity.displayName}: ${version.name}`,
    );
    return this.toDto(version, entity);
  }

  async update(
    seriesId: string,
    entityId: string,
    versionId: string,
    userId: string,
    dto: UpdateCharacterVersionDto,
  ) {
    const entity = await this.getEntity(seriesId, entityId);
    const existing = await this.getVersion(entityId, versionId);
    const merged: CreateCharacterVersionDto = {
      name: dto.name ?? existing.name,
      externalId:
        'externalId' in dto ? dto.externalId : existing.externalId ?? undefined,
      description: dto.description ?? existing.description ?? undefined,
      // Character
      age: dto.age ?? existing.age ?? undefined,
      ethnicity: dto.ethnicity ?? existing.ethnicity ?? undefined,
      skinTone: dto.skinTone ?? existing.skinTone ?? undefined,
      facialFeatures: dto.facialFeatures ?? existing.facialFeatures ?? undefined,
      visualSilhouetteDress:
        dto.visualSilhouetteDress ??
        existing.visualSilhouetteDress ??
        undefined,
      visualDescription:
        dto.visualDescription ?? existing.visualDescription ?? undefined,
      voiceProfile: dto.voiceProfile ?? existing.voiceProfile ?? undefined,
      voiceDescription:
        dto.voiceDescription ?? existing.voiceDescription ?? undefined,
      costumeDescription:
        dto.costumeDescription ?? existing.costumeDescription ?? undefined,
      mannerisms: dto.mannerisms ?? existing.mannerisms ?? undefined,
      // Location
      architectureNotes: dto.architectureNotes ?? existing.architectureNotes ?? undefined,
      moodNotes: dto.moodNotes ?? existing.moodNotes ?? undefined,
      lightingNotes: dto.lightingNotes ?? existing.lightingNotes ?? undefined,
      environmentNotes: dto.environmentNotes ?? existing.environmentNotes ?? undefined,
      weatherNotes: dto.weatherNotes ?? existing.weatherNotes ?? undefined,
      // Artifact
      origin: dto.origin ?? existing.origin ?? undefined,
      currentOwner: dto.currentOwner ?? existing.currentOwner ?? undefined,
      importance: dto.importance ?? existing.importance ?? undefined,
      // Shared
      imageAssetId:
        'imageAssetId' in dto
          ? dto.imageAssetId
          : existing.imageAssetId ?? undefined,
      inheritMainImage:
        dto.inheritMainImage ?? existing.inheritMainImage,
      startType: dto.startType ?? existing.startType,
      startId: 'startId' in dto ? dto.startId : existing.startId ?? undefined,
      endType: 'endType' in dto ? dto.endType : existing.endType ?? undefined,
      endId: 'endId' in dto ? dto.endId : existing.endId ?? undefined,
    };
    const normalized = await this.validateInput(seriesId, entityId, merged, entity.type);
    const nextImageAssetId = normalized.inheritMainImage
      ? null
      : normalized.imageAssetId;
    const previousImageAssetId = existing.inheritMainImage
      ? null
      : existing.imageAssetId;
    const imageChanged = previousImageAssetId !== nextImageAssetId;
    const version = await this.prisma.$transaction(async tx => {
      const updated = await tx.worldEntityVersion.update({
        where: { id: versionId },
        data: normalized,
      });
      if (imageChanged && previousImageAssetId) {
        await tx.assetAssignment.updateMany({
          where: {
            seriesId,
            targetType: 'ENTITY_VERSION',
            targetId: versionId,
            role: 'VERSION_IMAGE',
            status: 'ASSIGNED',
          },
          data: {
            status: 'ABANDONED',
            replacedByAssetId: nextImageAssetId,
            replacementNote: nextImageAssetId
              ? `Replaced by a different version image on ${new Date().toISOString()}.`
              : `Version returned to its inherited image on ${new Date().toISOString()}.`,
          },
        });
      }
      if (imageChanged && nextImageAssetId) {
        await tx.assetAssignment.create({
          data: {
            assetId: nextImageAssetId,
            seriesId,
            targetType: 'ENTITY_VERSION',
            targetId: versionId,
            role: 'VERSION_IMAGE',
          },
        });
      }
      return updated;
    });
    await this.activity.log(
      seriesId,
      userId,
      'ENTITY_VERSION_UPDATED',
      'WorldEntityVersion',
      version.id,
      `${entity.displayName}: ${version.name}`,
    );
    return this.toDto(version, entity);
  }

  async remove(
    seriesId: string,
    entityId: string,
    versionId: string,
    userId: string,
  ) {
    await this.getEntity(seriesId, entityId);
    await this.getVersion(entityId, versionId);
    await this.prisma.$transaction([
      this.prisma.assetAssignment.updateMany({
        where: {
          seriesId,
          targetType: 'ENTITY_VERSION',
          targetId: versionId,
          status: 'ASSIGNED',
        },
        data: {
          status: 'ABANDONED',
          replacementNote: `Entity version deleted on ${new Date().toISOString()}.`,
        },
      }),
      this.prisma.worldEntityVersion.delete({ where: { id: versionId } }),
    ]);
    await this.activity.log(
      seriesId,
      userId,
      'ENTITY_VERSION_DELETED',
      'WorldEntityVersion',
      versionId,
    );
  }

  async resolve(
    seriesId: string,
    entityId: string,
    anchorType: StoryAnchorType,
    anchorId?: string,
  ) {
    const entity = await this.getEntity(seriesId, entityId);
    const order = await this.buildStoryOrder(seriesId);
    const targetOrder = this.anchorOrder(order, anchorType, anchorId);
    const versions = await this.prisma.worldEntityVersion.findMany({
      where: { entityId },
      orderBy: [{ position: 'desc' }, { createdAt: 'desc' }],
    });
    const applicable = versions
      .map(version => ({
        version,
        start: this.anchorOrder(order, version.startType, version.startId ?? undefined),
        end: version.endType
          ? this.anchorOrder(
              order,
              version.endType,
              version.endId ?? undefined,
              true,
            )
          : Number.POSITIVE_INFINITY,
      }))
      .filter(item => item.start <= targetOrder && targetOrder <= item.end)
      .sort((a, b) => b.start - a.start || b.version.position - a.version.position)[0];
    return applicable ? this.toDto(applicable.version, entity) : null;
  }

  async generatePrompt(
    seriesId: string,
    entityId: string,
    versionId: string,
    userId: string,
  ) {
    const entity = await this.getEntity(seriesId, entityId);
    const version = await this.getVersion(entityId, versionId);
    const providerConfig = await this.prisma.llmProviderConfig.findFirst({
      where: {
        isActive: true,
        OR: [{ seriesId }, { seriesId: null }],
      },
      orderBy: [{ seriesId: 'desc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    if (!providerConfig) {
      throw new BadRequestException(
        'No active LLM provider is configured for this series.',
      );
    }

    const effectiveAlias =
      version.externalId ?? entity.externalId ?? entity.displayName;
    const prompt = this.buildPromptRequest(entity, version, effectiveAlias);
    const adapter = this.llmFactory.build(providerConfig);
    const result = await adapter.generateStructured(
      'You are a cinematic visual prompt specialist. Return valid JSON only, using exactly this shape: {"prompt":"..."}. The prompt value must be a non-empty string.',
      `${prompt}\n\nReturn exactly one JSON object with the single property "prompt".`,
      PROMPT_SCHEMA,
    );
    const generatedPrompt = this.extractGeneratedPrompt(result.parsed);
    if (!generatedPrompt) {
      throw new BadRequestException(
        this.invalidPromptResponseMessage(result.parsed),
      );
    }
    const updated = await this.prisma.worldEntityVersion.update({
      where: { id: versionId },
      data: { generatedPrompt },
    });
    await this.activity.log(
      seriesId,
      userId,
      'ENTITY_VERSION_PROMPT_GENERATED',
      'WorldEntityVersion',
      versionId,
      `Provider ${providerConfig.provider}/${providerConfig.model}`,
    );
    return this.toDto(updated, entity);
  }

  async generateBasePrompt(
    seriesId: string,
    entityId: string,
    userId: string,
    dto: GenerateBaseCharacterPromptDto,
  ) {
    const entity = await this.getEntity(seriesId, entityId);
    const providerConfig = await this.prisma.llmProviderConfig.findFirst({
      where: {
        isActive: true,
        OR: [{ seriesId }, { seriesId: null }],
      },
      orderBy: [{ seriesId: 'desc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    if (!providerConfig) {
      throw new BadRequestException(
        'No active LLM provider is configured for this series.',
      );
    }

    const displayName = dto.displayName?.trim() || entity.displayName;
    const externalId =
      dto.externalId?.trim() || entity.externalId || displayName;
    const request = `Create the canonical base visual generation prompt for this entity.

Name: ${displayName}
Prompt alias: ${externalId}
Description: ${dto.description ?? entity.description ?? 'Not specified'}
Age: ${dto.age ?? entity.age ?? 20}
Ethnicity: ${dto.ethnicity ?? entity.ethnicity ?? 'Not specified'}
Skin tone: ${dto.skinTone ?? entity.skinTone ?? 'Fitzpatrick Type II Pinkish-ivory skin'}
Facial features: ${dto.facialFeatures ?? entity.facialFeatures ?? 'Not specified'}
Visual silhouette & dress: ${dto.visualSilhouetteDress ?? entity.visualSilhouetteDress ?? 'Not specified'}
Overall visual profile: ${dto.visualDescription ?? entity.visualDescription ?? 'Not specified'}
Costume: ${dto.costumeDescription ?? entity.costumeDescription ?? 'Not specified'}
Mannerisms/posture: ${dto.mannerisms ?? entity.mannerisms ?? 'Not specified'}
Voice profile (identity context only): ${dto.voiceProfile ?? entity.voiceProfile ?? 'Not specified'}

This is the main, canonical appearance from which story-specific versions may diverge. Include stable age appearance, facial geometry, hair, body silhouette, posture, clothing, materials, palette, and distinguishing details. Do not include camera, scene, background, or action instructions.`;
    const adapter = this.llmFactory.build(providerConfig);
    const result = await adapter.generateStructured(
      'You are a cinematic visual prompt specialist. Return valid JSON only, using exactly this shape: {"prompt":"..."}. The prompt value must be a non-empty string.',
      `${request}\n\nReturn exactly one JSON object with the single property "prompt".`,
      PROMPT_SCHEMA,
    );
    const imagePrompt = this.extractGeneratedPrompt(result.parsed);
    if (!imagePrompt) {
      throw new BadRequestException(
        this.invalidPromptResponseMessage(result.parsed),
      );
    }
    const updated = await this.prisma.worldEntity.update({
      where: { id: entityId },
      data: { imagePrompt },
    });
    await this.activity.log(
      seriesId,
      userId,
      'BASE_ENTITY_PROMPT_GENERATED',
      'WorldEntity',
      entityId,
      `Provider ${providerConfig.provider}/${providerConfig.model}`,
    );
    return updated;
  }

  private async validateInput(
    seriesId: string,
    entityId: string,
    dto: CreateCharacterVersionDto,
    _entityType?: WorldEntityType,
  ) {
    const externalId = dto.externalId?.trim().toLowerCase() || null;
    if (externalId) {
      const [entityConflict, versionConflict] = await Promise.all([
        this.prisma.worldEntity.findFirst({
          where: { seriesId, externalId, id: { not: entityId } },
          select: { id: true },
        }),
        this.prisma.worldEntityVersion.findFirst({
          where: {
            externalId,
            entityId: { not: entityId },
            entity: { seriesId },
          },
          select: { id: true },
        }),
      ]);
      if (entityConflict || versionConflict) {
        throw new ConflictException(
          `External ID '${externalId}' belongs to another entity in this series.`,
        );
      }
    }

    if (dto.imageAssetId) {
      const image = await this.prisma.asset.findFirst({
        where: { id: dto.imageAssetId, seriesId, type: 'IMAGE' },
        select: { id: true },
      });
      if (!image) {
        throw new BadRequestException(
          'Version image must be an image asset from this series.',
        );
      }
    }

    const order = await this.buildStoryOrder(seriesId);
    const startType = dto.startType ?? StoryAnchorType.SERIES;
    const startId = startType === StoryAnchorType.SERIES ? null : dto.startId;
    const endType = dto.endType ?? null;
    const endId = !endType || endType === StoryAnchorType.SERIES ? null : dto.endId;
    const startOrder = this.anchorOrder(order, startType, startId ?? undefined);
    const endOrder = endType
      ? this.anchorOrder(order, endType, endId ?? undefined, true)
      : Number.POSITIVE_INFINITY;
    if (startOrder > endOrder) {
      throw new BadRequestException('Version ending point must follow its starting point.');
    }

    return {
      name: dto.name.trim(),
      externalId,
      description: dto.description || null,
      // Character
      age: dto.age ?? null,
      ethnicity: dto.ethnicity?.trim() || null,
      skinTone: dto.skinTone?.trim() || null,
      facialFeatures: dto.facialFeatures || null,
      visualSilhouetteDress: dto.visualSilhouetteDress || null,
      visualDescription: dto.visualDescription || null,
      voiceProfile: dto.voiceProfile || null,
      voiceDescription: dto.voiceDescription || null,
      costumeDescription: dto.costumeDescription || null,
      mannerisms: dto.mannerisms || null,
      // Location
      architectureNotes: dto.architectureNotes || null,
      moodNotes: dto.moodNotes || null,
      lightingNotes: dto.lightingNotes || null,
      environmentNotes: dto.environmentNotes || null,
      weatherNotes: dto.weatherNotes || null,
      // Artifact
      origin: dto.origin || null,
      currentOwner: dto.currentOwner || null,
      importance: dto.importance || null,
      // Shared
      imageAssetId: dto.imageAssetId || null,
      inheritMainImage: dto.inheritMainImage ?? true,
      startType,
      startId,
      endType,
      endId,
    };
  }

  private async getEntity(seriesId: string, entityId: string) {
    const entity = await this.prisma.worldEntity.findFirst({
      where: {
        id: entityId,
        seriesId,
        type: { in: ['CHARACTER', 'LOCATION', 'ARTIFACT'] },
      },
    });
    if (!entity) throw new NotFoundException('Entity not found');
    return entity;
  }

  private async getVersion(entityId: string, versionId: string) {
    const version = await this.prisma.worldEntityVersion.findFirst({
      where: { id: versionId, entityId },
    });
    if (!version) throw new NotFoundException('Entity version not found');
    return version;
  }

  private async buildStoryOrder(seriesId: string) {
    const seasons = await this.prisma.season.findMany({
      where: { seriesId },
      orderBy: [{ position: 'asc' }, { number: 'asc' }],
      include: {
        episodes: {
          orderBy: [{ position: 'asc' }, { number: 'asc' }],
          include: {
            acts: {
              orderBy: [{ position: 'asc' }, { number: 'asc' }],
              include: {
                scenes: {
                  orderBy: [{ position: 'asc' }, { number: 'asc' }],
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    const order = new Map<string, number>();
    let index = 1;
    for (const season of seasons) {
      order.set(`${StoryAnchorType.SEASON}:${season.id}`, index++);
      for (const episode of season.episodes) {
        order.set(`${StoryAnchorType.EPISODE}:${episode.id}`, index++);
        for (const act of episode.acts) {
          order.set(`${StoryAnchorType.ACT}:${act.id}`, index++);
          for (const scene of act.scenes) {
            order.set(`${StoryAnchorType.SCENE}:${scene.id}`, index++);
            order.set(`END:${StoryAnchorType.SCENE}:${scene.id}`, index - 1);
          }
          order.set(`END:${StoryAnchorType.ACT}:${act.id}`, index - 1);
        }
        order.set(`END:${StoryAnchorType.EPISODE}:${episode.id}`, index - 1);
      }
      order.set(`END:${StoryAnchorType.SEASON}:${season.id}`, index - 1);
    }
    return order;
  }

  private anchorOrder(
    order: Map<string, number>,
    type: StoryAnchorType,
    id?: string,
    end = false,
  ) {
    if (type === StoryAnchorType.SERIES) {
      return end ? Number.POSITIVE_INFINITY : 0;
    }
    if (!id) throw new BadRequestException(`${type} anchor requires an ID.`);
    const value = order.get(`${end ? 'END:' : ''}${type}:${id}`);
    if (value === undefined) {
      throw new BadRequestException(`${type} anchor is not part of this series.`);
    }
    return value;
  }

  private buildPromptRequest(
    entity: WorldEntity,
    version: {
      name: string;
      description: string | null;
      age: number | null;
      ethnicity: string | null;
      skinTone: string | null;
      facialFeatures: string | null;
      visualSilhouetteDress: string | null;
      visualDescription: string | null;
      voiceProfile: string | null;
      costumeDescription: string | null;
      mannerisms: string | null;
      architectureNotes: string | null;
      moodNotes: string | null;
      lightingNotes: string | null;
      environmentNotes: string | null;
      weatherNotes: string | null;
      origin: string | null;
      currentOwner: string | null;
      importance: string | null;
    },
    effectiveAlias: string,
  ) {
    const type = entity.type;
    if (type === 'CHARACTER') {
      return `Create a canonical visual generation prompt for this character version.

Character: ${entity.displayName}
Prompt alias: ${effectiveAlias}
Version: ${version.name}
Version context: ${version.description ?? entity.description ?? 'Not specified'}
Age: ${version.age ?? entity.age ?? 20}
Ethnicity: ${version.ethnicity ?? entity.ethnicity ?? 'Not specified'}
Skin tone: ${version.skinTone ?? entity.skinTone ?? 'Fitzpatrick Type II Pinkish-ivory skin'}
Facial features: ${version.facialFeatures ?? entity.facialFeatures ?? 'Not specified'}
Visual silhouette & dress: ${version.visualSilhouetteDress ?? entity.visualSilhouetteDress ?? 'Not specified'}
Overall visual profile: ${version.visualDescription ?? entity.visualDescription ?? 'Not specified'}
Costume: ${version.costumeDescription ?? entity.costumeDescription ?? 'Not specified'}
Mannerisms/posture: ${version.mannerisms ?? entity.mannerisms ?? 'Not specified'}
Voice profile (identity context only): ${version.voiceProfile ?? entity.voiceProfile ?? 'Not specified'}

Preserve stable identity traits while making this version visually distinct. Include age appearance, facial geometry, hair, body silhouette, posture, clothing, materials, palette, and distinguishing details. Do not include camera, scene, background, or action instructions.`;
    }
    if (type === 'LOCATION') {
      return `Create a canonical visual generation prompt for this location version.

Location: ${entity.displayName}
Prompt alias: ${effectiveAlias}
Version: ${version.name}
Context: ${version.description ?? entity.description ?? 'Not specified'}
Architecture: ${version.architectureNotes ?? entity.architectureNotes ?? 'Not specified'}
Mood: ${version.moodNotes ?? entity.moodNotes ?? 'Not specified'}
Lighting: ${version.lightingNotes ?? entity.lightingNotes ?? 'Not specified'}
Environment: ${version.environmentNotes ?? entity.environmentNotes ?? 'Not specified'}
Weather: ${version.weatherNotes ?? entity.weatherNotes ?? 'Not specified'}

Produce a precise, reusable visual prompt capturing the essence of this location in the given story context.`;
    }
    // ARTIFACT
    return `Create a canonical visual generation prompt for this artifact version.

Artifact: ${entity.displayName}
Prompt alias: ${effectiveAlias}
Version: ${version.name}
Context: ${version.description ?? entity.description ?? 'Not specified'}
Origin: ${version.origin ?? entity.origin ?? 'Not specified'}
Current owner: ${version.currentOwner ?? entity.currentOwner ?? 'Not specified'}
Importance: ${version.importance ?? entity.importance ?? 'Not specified'}

Produce a precise, reusable visual prompt for this artifact in its story-specific state.`;
  }

  private toDto(version: any, entity: WorldEntity) {
    const mainImageId = entity.type === 'CHARACTER'
      ? entity.profilePhotoAssetId
      : entity.referenceImageAssetId;
    return {
      ...version,
      effectiveExternalId:
        version.externalId ?? entity.externalId ?? entity.displayName,
      effectiveImageAssetId:
        version.inheritMainImage || !version.imageAssetId
          ? mainImageId
          : version.imageAssetId,
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
    };
  }

  private extractGeneratedPrompt(parsed: Record<string, unknown>) {
    const preferredKeys = [
      'prompt',
      'visualPrompt',
      'visual_prompt',
      'imagePrompt',
      'image_prompt',
      'description',
      'text',
      'output',
      'content',
    ];
    for (const key of preferredKeys) {
      const value = parsed?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }

    const stringValues = Object.values(parsed ?? {}).filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );
    return stringValues.length === 1 ? stringValues[0].trim() : '';
  }

  private invalidPromptResponseMessage(parsed: Record<string, unknown>) {
    const keys = Object.keys(parsed ?? {});
    return keys.length
      ? `The provider returned JSON without a usable prompt (fields: ${keys.join(', ')}).`
      : 'The provider returned an empty JSON response.';
  }
}
