import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from './minio.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';
import {
  CompleteAssetVersionDto,
  InitiateAssetVersionDto,
} from './dto/asset-version.dto';
import { Prisma } from '@prisma/client';

type AssetWithUser = Prisma.AssetGetPayload<{
  include: {
    uploadedBy: { select: { id: true; name: true } };
    entityLinks: true;
    actLinks: true;
    sceneLinks: true;
    clipLinks: true;
  };
}> & { assignments?: any[] };

type AssignmentTarget = {
  targetType: 'ENTITY' | 'ACT' | 'SCENE' | 'CLIP';
  targetId: string;
};

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  // ── Initiate Upload ──────────────────────────────────────────────────────

  async initiateUpload(
    seriesId: string,
    userId: string,
    dto: InitiateUploadDto,
  ) {
    const [entity, act, scene, clip] = await Promise.all([
      dto.linkedEntityId
        ? this.prisma.worldEntity.findFirst({
            where: { id: dto.linkedEntityId, seriesId },
            select: { id: true },
          })
        : null,
      dto.linkedActId
        ? this.prisma.act.findFirst({
            where: { id: dto.linkedActId, episode: { season: { seriesId } } },
            select: { id: true },
          })
        : null,
      dto.linkedSceneId
        ? this.prisma.scene.findFirst({
            where: { id: dto.linkedSceneId, episode: { season: { seriesId } } },
            select: { id: true },
          })
        : null,
      dto.linkedClipId
        ? this.prisma.clip.findFirst({
            where: { id: dto.linkedClipId, scene: { episode: { season: { seriesId } } } },
            select: { id: true },
          })
        : null,
    ]);
    if (dto.linkedEntityId && !entity) throw new BadRequestException('Linked entity is not in this series');
    if (dto.linkedActId && !act) throw new BadRequestException('Linked act is not in this series');
    if (dto.linkedSceneId && !scene) throw new BadRequestException('Linked scene is not in this series');
    if (dto.linkedClipId && !clip) throw new BadRequestException('Linked clip is not in this series');

    // Create a placeholder record first to obtain the generated id
    const asset = await this.prisma.asset.create({
      data: {
        seriesId,
        uploadedById: userId,
        type: dto.type,
        status: 'PENDING',
        title: dto.title ?? dto.filename,
        description: dto.description ?? null,
        tags: dto.tags ?? [],
        versionNotes: dto.versionNotes ?? null,
        isFinal: dto.isFinal ?? false,
        filename: dto.filename,
        storageKey: `assets/${seriesId}/__pending__/${dto.filename}`, // temporary
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        provenance: {
          create: { source: 'UPLOAD' },
        },
      },
    });

    // Build the final storage key using the real asset id
    const storageKey = `assets/${seriesId}/${asset.id}/${dto.filename}`;
    await this.prisma.asset.update({ where: { id: asset.id }, data: { storageKey } });

    // Create optional link records
    const linkOps: Promise<unknown>[] = [];
    if (dto.linkedEntityId) {
      linkOps.push(
        this.prisma.assetEntityLink.create({
          data: { assetId: asset.id, entityId: dto.linkedEntityId },
        }),
      );
    }
    if (dto.linkedActId) {
      linkOps.push(
        this.prisma.assetActLink.create({
          data: { assetId: asset.id, actId: dto.linkedActId },
        }),
      );
    }
    if (dto.linkedSceneId) {
      linkOps.push(
        this.prisma.assetSceneLink.create({
          data: { assetId: asset.id, sceneId: dto.linkedSceneId },
        }),
      );
    }
    if (dto.linkedClipId) {
      linkOps.push(
        this.prisma.assetClipLink.create({
          data: { assetId: asset.id, clipId: dto.linkedClipId },
        }),
      );
    }
    if (linkOps.length) await Promise.all(linkOps);

    // Generate presigned PUT URL (15 minutes)
    const uploadUrl = await this.minio.presignedPutUrl(storageKey, 900);

    return { assetId: asset.id, uploadUrl, expiresIn: 900 };
  }

  // ── Complete Upload ──────────────────────────────────────────────────────

  async completeUpload(seriesId: string, dto: CompleteUploadDto) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.assetId, seriesId },
      include: {
        entityLinks: true,
        actLinks: true,
        sceneLinks: true,
        clipLinks: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status !== 'PENDING') {
      throw new BadRequestException('Asset is not in PENDING state');
    }

    const exists = await this.minio.objectExists(asset.storageKey);
    if (!exists) {
      throw new BadRequestException(
        'Object not found in storage — make sure the PUT upload completed successfully',
      );
    }

    const updated = await this.prisma.$transaction(async tx => {
      if (asset.isFinal) {
        await this.assignFinalProductionMedia(
          tx,
          seriesId,
          asset.id,
          this.assignmentTargets(asset),
        );
      }
      return tx.asset.update({
        where: { id: asset.id },
        data: { status: 'UPLOADED' },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          entityLinks: true,
          actLinks: true,
          sceneLinks: true,
          clipLinks: true,
          assignments: true,
          provenance: true,
        },
      });
    });

    return this.toDto(updated);
  }

  // ── List Assets ──────────────────────────────────────────────────────────

  async listAssets(seriesId: string, query: AssetQueryDto) {
    const { type, status, q, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = { seriesId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { filename: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          entityLinks: true,
          actLinks: true,
          sceneLinks: true,
          clipLinks: true,
          assignments: true,
          provenance: true,
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { items: items.map(a => this.toDto(a)), total, page, limit };
  }

  // ── Get Asset ────────────────────────────────────────────────────────────

  async getAsset(seriesId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        variants: { orderBy: { label: 'desc' } },
        entityLinks: true,
        actLinks: true,
        sceneLinks: true,
        clipLinks: true,
        assignments: true,
        provenance: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    let downloadUrl: string | undefined;
    if (asset.status !== 'PENDING') {
      try {
        downloadUrl = await this.minio.presignedGetUrl(asset.storageKey, 3600);
      } catch (err) {
        this.logger.warn(`Failed to generate download URL for ${assetId}: ${err}`);
      }
    }

    return this.toDto(asset, downloadUrl);
  }

  async getDownload(seriesId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId },
      select: {
        storageKey: true,
        filename: true,
        status: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === 'PENDING') {
      throw new BadRequestException('Asset upload is not complete');
    }
    return {
      filename: asset.filename,
      downloadUrl: await this.minio.presignedDownloadUrl(
        asset.storageKey,
        asset.filename,
        300,
      ),
      expiresIn: 300,
    };
  }

  // ── Asset Versions ───────────────────────────────────────────────────────

  async initiateVersion(
    seriesId: string,
    assetId: string,
    dto: InitiateAssetVersionDto,
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const version = asset.version + 1;
    const storageKey = `assets/${seriesId}/${assetId}/v${version}/${dto.filename}`;
    const uploadUrl = await this.minio.presignedPutUrl(storageKey, 900);
    return { assetId, version, uploadUrl, expiresIn: 900 };
  }

  async completeVersion(
    seriesId: string,
    assetId: string,
    dto: CompleteAssetVersionDto,
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (dto.version !== asset.version + 1) {
      throw new BadRequestException('Asset version is stale');
    }

    const storageKey = `assets/${seriesId}/${assetId}/v${dto.version}/${dto.filename}`;
    const stat = await this.minio.getObjectStat(storageKey);
    if (!stat) {
      throw new BadRequestException('Version object not found in storage');
    }

    const updated = await this.prisma.$transaction(async tx => {
      await tx.assetVariant.create({
        data: {
          assetId,
          label: `version-${asset.version}`,
          storageKey: asset.storageKey,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
        },
      });
      return tx.asset.update({
        where: { id: assetId },
        data: {
          version: dto.version,
          filename: dto.filename,
          storageKey,
          mimeType: dto.mimeType,
          sizeBytes: stat.size,
          status: 'UPLOADED',
        },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          entityLinks: true,
          actLinks: true,
          sceneLinks: true,
          clipLinks: true,
          assignments: true,
          provenance: true,
        },
      });
    });

    return this.toDto(updated);
  }

  // ── Update Asset ─────────────────────────────────────────────────────────

  async updateAsset(
    seriesId: string,
    assetId: string,
    dto: UpdateAssetDto,
  ) {
    const existing = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId },
      include: {
        entityLinks: true,
        actLinks: true,
        sceneLinks: true,
        clipLinks: true,
        assignments: true,
        provenance: true,
      },
    });
    if (!existing) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.$transaction(async tx => {
      if (dto.isFinal === true) {
        await this.assignFinalProductionMedia(
          tx,
          seriesId,
          assetId,
          this.assignmentTargets(existing),
        );
      } else if (dto.isFinal === false && existing.isFinal) {
        await tx.assetAssignment.updateMany({
          where: {
            assetId,
            seriesId,
            role: 'PRODUCTION_MEDIA',
            status: 'ASSIGNED',
          },
          data: {
            status: 'ABANDONED',
            replacementNote: `Final selection removed on ${new Date().toISOString()}.`,
          },
        });
      }

      return tx.asset.update({
        where: { id: assetId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.versionNotes !== undefined && { versionNotes: dto.versionNotes }),
          ...(dto.isFinal !== undefined && { isFinal: dto.isFinal }),
        },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          entityLinks: true,
          actLinks: true,
          sceneLinks: true,
          clipLinks: true,
          assignments: true,
          provenance: true,
        },
      });
    });

    return this.toDto(updated);
  }

  // ── Assignment History ───────────────────────────────────────────────────

  async getAssignmentHistory(seriesId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId },
      select: { id: true },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const assignments = await this.prisma.assetAssignment.findMany({
      where: { assetId, seriesId },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map(a => ({
      id: a.id,
      role: a.role,
      status: a.status,
      targetType: a.targetType,
      targetId: a.targetId,
      note: a.replacementNote,
      replacedByAssetId: a.replacedByAssetId,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  async getEntityAssetAssignments(seriesId: string, entityId: string) {
    const entity = await this.prisma.worldEntity.findFirst({
      where: { id: entityId, seriesId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Entity not found');

    const assignments = await this.prisma.assetAssignment.findMany({
      where: { seriesId, targetType: 'ENTITY', targetId: entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            title: true,
            type: true,
            filename: true,
            mimeType: true,
            provenance: true,
            createdAt: true,
          },
        },
      },
    });

    return assignments.map(a => ({
      id: a.id,
      role: a.role,
      status: a.status,
      targetType: a.targetType,
      targetId: a.targetId,
      note: a.replacementNote,
      replacedByAssetId: a.replacedByAssetId,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      asset: a.asset
        ? {
            id: a.asset.id,
            title: a.asset.title,
            type: a.asset.type,
            filename: a.asset.filename,
            mimeType: a.asset.mimeType,
            source: a.asset.provenance?.source ?? 'UPLOAD',
            generationProvider: a.asset.provenance?.provider,
            generationModel: a.asset.provenance?.model,
            generationRequestId: a.asset.provenance?.requestId,
            createdAt: a.asset.createdAt.toISOString(),
          }
        : null,
    }));
  }

  async abandonAssignment(
    seriesId: string,
    assetId: string,
    assignmentId: string,
    note?: string,
  ) {
    const assignment = await this.prisma.assetAssignment.findFirst({
      where: { id: assignmentId, assetId, seriesId },
    });
    if (!assignment) throw new NotFoundException('Asset assignment not found');
    if (assignment.status === 'ABANDONED') return assignment;

    return this.prisma.$transaction(async tx => {
      if (assignment.targetType === 'ENTITY') {
        const data =
          assignment.role === 'PROFILE_PHOTO'
            ? { profilePhotoAssetId: null }
            : assignment.role === 'VOICE_SAMPLE'
              ? { voiceSampleAssetId: null }
              : assignment.role === 'REFERENCE_IMAGE'
                ? { referenceImageAssetId: null }
                : {};
        if (Object.keys(data).length) {
          await tx.worldEntity.updateMany({
            where: { id: assignment.targetId, seriesId },
            data,
          });
        }
      } else if (
        assignment.targetType === 'ENTITY_VERSION' &&
        assignment.role === 'VERSION_IMAGE'
      ) {
        await tx.worldEntityVersion.updateMany({
          where: {
            id: assignment.targetId,
            entity: { seriesId },
            imageAssetId: assetId,
          },
          data: { imageAssetId: null, inheritMainImage: true },
        });
      }
      return tx.assetAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'ABANDONED',
          replacementNote:
            note?.trim() ||
            `Manually abandoned on ${new Date().toISOString()}.`,
        },
      });
    });
  }

  // ── Delete Asset ─────────────────────────────────────────────────────────

  async deleteAsset(seriesId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, seriesId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    // Best-effort delete from MinIO
    try {
      await this.minio.deleteObject(asset.storageKey);
    } catch (err) {
      this.logger.warn(
        `Could not remove object ${asset.storageKey} from MinIO: ${err}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.assetAssignment.updateMany({
        where: { replacedByAssetId: assetId },
        data: { replacedByAssetId: null },
      }),
      this.prisma.asset.delete({ where: { id: assetId } }),
    ]);
    return { deleted: true, assetId };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private assignmentTargets(asset: {
    entityLinks: Array<{ entityId: string }>;
    actLinks: Array<{ actId: string }>;
    sceneLinks: Array<{ sceneId: string }>;
    clipLinks: Array<{ clipId: string }>;
  }): AssignmentTarget[] {
    return [
      ...asset.entityLinks.map(link => ({
        targetType: 'ENTITY' as const,
        targetId: link.entityId,
      })),
      ...asset.actLinks.map(link => ({
        targetType: 'ACT' as const,
        targetId: link.actId,
      })),
      ...asset.sceneLinks.map(link => ({
        targetType: 'SCENE' as const,
        targetId: link.sceneId,
      })),
      ...asset.clipLinks.map(link => ({
        targetType: 'CLIP' as const,
        targetId: link.clipId,
      })),
    ];
  }

  private async assignFinalProductionMedia(
    tx: Prisma.TransactionClient,
    seriesId: string,
    assetId: string,
    targets: AssignmentTarget[],
  ) {
    if (!targets.length) return;

    await tx.asset.updateMany({
      where: {
        id: { not: assetId },
        seriesId,
        OR: targets.map(target => {
          switch (target.targetType) {
            case 'ENTITY':
              return { entityLinks: { some: { entityId: target.targetId } } };
            case 'ACT':
              return { actLinks: { some: { actId: target.targetId } } };
            case 'SCENE':
              return { sceneLinks: { some: { sceneId: target.targetId } } };
            case 'CLIP':
              return { clipLinks: { some: { clipId: target.targetId } } };
          }
        }),
      },
      data: { isFinal: false },
    });

    for (const target of targets) {
      const current = await tx.assetAssignment.findFirst({
        where: {
          seriesId,
          ...target,
          role: 'PRODUCTION_MEDIA',
          status: 'ASSIGNED',
        },
      });
      if (current?.assetId === assetId) continue;
      if (current) {
        await tx.assetAssignment.update({
          where: { id: current.id },
          data: {
            status: 'ABANDONED',
            replacedByAssetId: assetId,
            replacementNote: `Replaced by final asset ${assetId}.`,
          },
        });
      }
      await tx.assetAssignment.create({
        data: {
          assetId,
          seriesId,
          ...target,
          role: 'PRODUCTION_MEDIA',
        },
      });
    }
  }

  private toDto(asset: AssetWithUser, downloadUrl?: string) {
    const a = asset as any;
    return {
      id: asset.id,
      seriesId: asset.seriesId,
      type: asset.type,
      status: asset.status,
      title: asset.title,
      description: asset.description ?? undefined,
      tags: asset.tags,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      version: asset.version,
      versionNotes: asset.versionNotes ?? undefined,
      isFinal: asset.isFinal,
      // Provenance
      source: a.provenance?.source ?? 'UPLOAD',
      generationPrompt: a.provenance?.prompt ?? undefined,
      generationProvider: a.provenance?.provider ?? undefined,
      generationModel: a.provenance?.model ?? undefined,
      generationRequestId: a.provenance?.requestId ?? undefined,
      generationDurationSec: a.provenance?.durationSeconds ?? undefined,
      entityIds: asset.entityLinks?.map(link => link.entityId) ?? [],
      actIds: asset.actLinks?.map(link => link.actId) ?? [],
      sceneIds: asset.sceneLinks?.map(link => link.sceneId) ?? [],
      clipIds: asset.clipLinks?.map(link => link.clipId) ?? [],
      assignments: a.assignments?.map((assignment: any) => ({
        id: assignment.id,
        role: assignment.role,
        status: assignment.status,
        targetType: assignment.targetType,
        targetId: assignment.targetId,
        note: assignment.replacementNote ?? undefined,
        replacedByAssetId: assignment.replacedByAssetId ?? undefined,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
      })) ?? [],
      versions: (
        asset as AssetWithUser & {
          variants?: Array<{
            id: string;
            label: string;
            mimeType: string;
            sizeBytes: bigint;
          }>;
        }
      ).variants?.map(variant => ({
        id: variant.id,
        label: variant.label,
        mimeType: variant.mimeType,
        sizeBytes: Number(variant.sizeBytes),
      })) ?? [],
      downloadUrl,
      uploadedById: asset.uploadedById,
      uploadedByName: asset.uploadedBy?.name ?? '',
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }
}
