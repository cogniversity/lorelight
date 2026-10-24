import { WorldEntityType, WorldEntityStatus } from './enums';

export interface WorldEntityDto {
  id: string; seriesId: string; type: WorldEntityType;
  displayName: string; externalId?: string;
  subtitle: string; description: string;
  status: WorldEntityStatus; color?: string;
  tags: string[]; sceneCount: number;
  visualDescription?: string; voiceDescription?: string;
  costumeDescription?: string; mannerisms?: string;
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
  visualDescription?: string; voiceDescription?: string;
  costumeDescription?: string; mannerisms?: string;
  architectureNotes?: string; moodNotes?: string;
  lightingNotes?: string; environmentNotes?: string;
  origin?: string; currentOwner?: string; importance?: string;
  purpose?: string; leadership?: string;
}

export interface UpdateWorldEntityDto extends Partial<CreateWorldEntityDto> {}

export interface WorldEntityListDto {
  items: WorldEntityDto[]; total: number; page: number; limit: number;
}
