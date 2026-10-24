import { AssetType, AssetStatus } from './enums';

export interface AssetDto {
  id: string; seriesId: string; type: AssetType; status: AssetStatus;
  title: string; description?: string; tags: string[];
  filename: string; mimeType: string; sizeBytes: number;
  version: number; thumbnailUrl?: string; downloadUrl?: string;
  linkedEntityId?: string; linkedEntityType?: string;
  linkedSceneId?: string; linkedClipId?: string;
  uploadedById: string; uploadedByName: string;
  createdAt: string; updatedAt: string;
}

export interface InitiateUploadDto {
  filename: string; mimeType: string; sizeBytes: number;
  title?: string; description?: string; tags?: string[];
  linkedEntityId?: string; linkedEntityType?: string;
  linkedSceneId?: string; linkedClipId?: string;
}

export interface InitiateUploadResponseDto {
  assetId: string; uploadUrl: string; expiresIn: number;
}

export interface CompleteUploadDto { assetId: string; }
export interface UpdateAssetDto { title?: string; description?: string; tags?: string[]; status?: AssetStatus; }
export interface AssetListDto { items: AssetDto[]; total: number; page: number; limit: number; }
