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
  include: { uploadedBy: { select: { id: true; name: true } } };
}>;

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
        filename: dto.filename,
        storageKey: `assets/${seriesId}/__pending__/${dto.filename}`, // temporary
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
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

    const updated = await this.prisma.asset.update({
      where: { id: asset.id },
      data: { status: 'UPLOADED' },
      include: { uploadedBy: { select: { id: true, name: true } } },
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
        include: { uploadedBy: { select: { id: true, name: true } } },
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
        include: { uploadedBy: { select: { id: true, name: true } } },
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
    });
    if (!existing) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    return this.toDto(updated);
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

    await this.prisma.asset.delete({ where: { id: assetId } });
    return { deleted: true, assetId };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toDto(asset: AssetWithUser, downloadUrl?: string) {
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
