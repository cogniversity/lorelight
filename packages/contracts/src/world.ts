import { WorldEntityType, WorldEntityStatus } from './enums';

export interface WorldEntityDto {
  id: string; seriesId: string; type: WorldEntityType;
  displayName: string; externalId?: string;
  subtitle: string; description: string;
  status: WorldEntityStatus; color?: string;
  tags: string[]; sceneCount: number;
  age?: number; ethnicity?: string; skinTone?: string;
  visualDescription?: string; facialFeatures?: string;
  visualSilhouetteDress?: string; voiceDescription?: string;
  voiceProfile?: string; costumeDescription?: string; mannerisms?: string;
  biography?: string; profilePhotoAssetId?: string; voiceSampleAssetId?: string;
  referenceImageAssetId?: string; imagePrompt?: string;
  architectureNotes?: string; moodNotes?: string;
  lightingNotes?: string; environmentNotes?: string;
  origin?: string; currentOwner?: string; importance?: string;
  purpose?: string; leadership?: string;
  createdAt: string; updatedAt: string;
}

export interface CreateWorldEntityDto {
  type: WorldEntityType; displayName: string; externalId?: string;
  subtitle?: string; description?: string;
  status?: WorldEntityStatus; color?: string; tags?: string[];
  age?: number; ethnicity?: string; skinTone?: string;
  visualDescription?: string; facialFeatures?: string;
  visualSilhouetteDress?: string; voiceDescription?: string;
  voiceProfile?: string; costumeDescription?: string; mannerisms?: string;
  biography?: string; profilePhotoAssetId?: string; voiceSampleAssetId?: string;
  referenceImageAssetId?: string;
  architectureNotes?: string; moodNotes?: string;
  lightingNotes?: string; environmentNotes?: string;
  origin?: string; currentOwner?: string; importance?: string;
  purpose?: string; leadership?: string;
}

export interface UpdateWorldEntityDto extends Partial<CreateWorldEntityDto> {}

export interface WorldEntityListDto {
  items: WorldEntityDto[]; total: number; page: number; limit: number;
}

export type StoryAnchorType = 'SERIES' | 'SEASON' | 'EPISODE' | 'ACT' | 'SCENE';

export interface WorldEntityVersionDto {
  id: string;
  entityId: string;
  name: string;
  externalId?: string;
  effectiveExternalId: string;
  description?: string;
  age?: number;
  ethnicity?: string;
  skinTone?: string;
  facialFeatures?: string;
  visualSilhouetteDress?: string;
  visualDescription?: string;
  voiceProfile?: string;
  voiceDescription?: string;
  costumeDescription?: string;
  mannerisms?: string;
  architectureNotes?: string;
  moodNotes?: string;
  lightingNotes?: string;
  environmentNotes?: string;
  weatherNotes?: string;
  origin?: string;
  currentOwner?: string;
  importance?: string;
  imageAssetId?: string;
  inheritMainImage: boolean;
  effectiveImageAssetId?: string;
  generatedPrompt?: string;
  startType: StoryAnchorType;
  startId?: string;
  endType?: StoryAnchorType;
  endId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorldEntityVersionDto {
  name: string;
  externalId?: string;
  description?: string;
  age?: number;
  ethnicity?: string;
  skinTone?: string;
  facialFeatures?: string;
  visualSilhouetteDress?: string;
  visualDescription?: string;
  voiceProfile?: string;
  voiceDescription?: string;
  costumeDescription?: string;
  mannerisms?: string;
  architectureNotes?: string;
  moodNotes?: string;
  lightingNotes?: string;
  environmentNotes?: string;
  weatherNotes?: string;
  origin?: string;
  currentOwner?: string;
  importance?: string;
  imageAssetId?: string;
  inheritMainImage?: boolean;
  startType?: StoryAnchorType;
  startId?: string;
  endType?: StoryAnchorType;
  endId?: string;
}

/** @deprecated Use WorldEntityVersionDto. */
export type CharacterVersionDto = WorldEntityVersionDto;
/** @deprecated Use CreateWorldEntityVersionDto. */
export type CreateCharacterVersionDto = CreateWorldEntityVersionDto;
