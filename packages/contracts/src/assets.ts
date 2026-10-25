import { AssetType, AssetStatus } from './enums';

export interface AssetDto {
  id: string; seriesId: string; type: AssetType; status: AssetStatus;
  title: string; description?: string; tags: string[];
  filename: string; mimeType: string; sizeBytes: number;
  version: number; versionNotes?: string; isFinal: boolean;
  thumbnailUrl?: string; downloadUrl?: string;
  linkedEntityId?: string; linkedEntityType?: string;
  linkedActId?: string; linkedSceneId?: string; linkedClipId?: string;
  source: 'UPLOAD' | 'MAGE_SEED_AUDIO';
  generationPrompt?: string;
  generationProvider?: string;
  generationModel?: string;
  generationRequestId?: string;
  generationDurationSec?: number;
  assignments: AssetAssignmentDto[];
  uploadedById: string; uploadedByName: string;
  createdAt: string; updatedAt: string;
}

export interface AssetAssignmentDto {
  id: string;
  role: 'PROFILE_PHOTO' | 'VOICE_SAMPLE' | 'REFERENCE_IMAGE' | 'VERSION_IMAGE' | 'PRODUCTION_MEDIA';
  status: 'ASSIGNED' | 'ABANDONED';
  targetType: 'ENTITY' | 'ENTITY_VERSION' | 'ACT' | 'SCENE' | 'CLIP';
  targetId: string;
  note?: string;
  replacedByAssetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateUploadDto {
  filename: string; mimeType: string; sizeBytes: number;
  title?: string; description?: string; tags?: string[];
  versionNotes?: string; isFinal?: boolean;
  linkedEntityId?: string; linkedEntityType?: string;
  linkedActId?: string; linkedSceneId?: string; linkedClipId?: string;
}

export interface InitiateUploadResponseDto {
  assetId: string; uploadUrl: string; expiresIn: number;
}

export interface CompleteUploadDto { assetId: string; }
export interface UpdateAssetDto {
  title?: string; description?: string; tags?: string[];
  status?: AssetStatus; versionNotes?: string; isFinal?: boolean;
}
export interface AssetListDto { items: AssetDto[]; total: number; page: number; limit: number; }
