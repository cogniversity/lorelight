import { EpisodeStatus, SceneStatus, ClipStatus, ScriptBlockType } from './enums';

export interface SeasonDto {
  id: string; seriesId: string; number: number; title: string;
  synopsis?: string; position: number; episodeCount: number; createdAt: string;
}

export interface EpisodeDto {
  id: string; seasonId: string; number: number; title: string;
  synopsis: string; status: EpisodeStatus; estimatedRuntime?: string;
  progress: number; position: number; actCount: number; sceneCount: number; clipCount: number;
  createdAt: string; updatedAt: string;
}

export interface ActDto {
  id: string; episodeId: string; number: number; title: string;
  summary?: string; purpose?: string; position: number; sceneCount: number;
}

export interface SceneDto {
  id: string; actId: string; episodeId: string; number: number;
  title: string; summary: string; purpose?: string;
  locationId?: string; locationName?: string;
  timeOfDay?: string; interior: boolean;
  status: SceneStatus; duration?: string;
  position: number; clipCount: number;
  characterIds: string[]; characterNames: string[];
  createdAt: string; updatedAt: string;
}

export interface ScriptBlockDto {
  id: string; sceneId: string; type: ScriptBlockType;
  content: string; characterId?: string; characterName?: string;
  position: number;
}

export interface ClipDto {
  id: string; sceneId: string; sceneTitle: string; episodeId: string; episodeTitle: string;
  number: number; title: string; storyBeat: string;
  action?: string; dialogue?: string; emotion?: string;
  duration?: string; targetDurationSec: number;
  cameraShot?: string; cameraAngle?: string; cameraMovement?: string;
  composition?: string; lens?: string; lighting?: string;
  voiceNotes?: string; ambientAudio?: string; sfx?: string; music?: string;
  imagePrompt?: string; videoPrompt?: string; voicePrompt?: string;
  audioPrompt?: string; negativePrompt?: string;
  status: ClipStatus; position: number;
  characterIds: string[]; locationId?: string;
  assetIds: string[]; hasGeneratedPrompts: boolean;
  createdAt: string; updatedAt: string;
}

export interface ManuscriptTreeDto {
  seasons: (SeasonDto & { episodes: (EpisodeDto & { acts: (ActDto & { scenes: (SceneDto & { clips: ClipDto[] })[] })[] })[] })[];
}

// Create/update DTOs
export interface CreateSeasonDto { number: number; title: string; synopsis?: string; position?: number; }
export interface UpdateSeasonDto extends Partial<CreateSeasonDto> {}
export interface CreateEpisodeDto {
  seasonId: string; number: number; title: string; synopsis?: string;
  status?: EpisodeStatus; estimatedRuntime?: string; position?: number;
}
export interface UpdateEpisodeDto extends Partial<Omit<CreateEpisodeDto, 'seasonId'>> { progress?: number; }
export interface CreateActDto { episodeId: string; number: number; title: string; summary?: string; purpose?: string; position?: number; }
export interface UpdateActDto extends Partial<Omit<CreateActDto, 'episodeId'>> {}
export interface CreateSceneDto {
  actId: string; number: number; title: string; summary?: string; purpose?: string;
  locationId?: string; timeOfDay?: string; interior?: boolean;
  status?: SceneStatus; duration?: string; position?: number;
  characterIds?: string[];
}
export interface UpdateSceneDto extends Partial<Omit<CreateSceneDto, 'actId'>> {}
export interface CreateScriptBlockDto { type: ScriptBlockType; content: string; characterId?: string; position?: number; }
export interface UpdateScriptBlockDto extends Partial<CreateScriptBlockDto> {}
export interface CreateClipDto {
  sceneId: string; number: number; title: string; storyBeat?: string;
  action?: string; dialogue?: string; emotion?: string;
  duration?: string; targetDurationSec?: number;
  cameraShot?: string; cameraAngle?: string; cameraMovement?: string;
  composition?: string; lens?: string; lighting?: string;
  voiceNotes?: string; ambientAudio?: string; sfx?: string; music?: string;
  status?: ClipStatus; position?: number;
  characterIds?: string[]; locationId?: string;
}
export interface UpdateClipDto extends Partial<Omit<CreateClipDto, 'sceneId'>> {
  imagePrompt?: string; videoPrompt?: string; voicePrompt?: string;
  audioPrompt?: string; negativePrompt?: string;
}
export interface ReorderDto { ids: string[]; }
