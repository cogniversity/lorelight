import { LlmProvider, GenerationStatus, PromptStatus } from './enums';

export interface LlmProviderConfigDto {
  id: string; seriesId?: string; provider: LlmProvider;
  displayName: string; baseUrl?: string; model: string;
  isDefault: boolean; isActive: boolean;
  maxTokens: number; temperature: number; createdAt: string;
}

export interface CreateLlmProviderConfigDto {
  provider: LlmProvider; displayName: string; baseUrl?: string; model: string;
  apiKey?: string; isDefault?: boolean;
  maxTokens?: number; temperature?: number;
}

export interface TestProviderConnectionDto { configId: string; }
export interface TestProviderConnectionResultDto { success: boolean; latencyMs: number; error?: string; }

export interface GenerateClipPromptsDto {
  clipId: string; providerConfigId?: string; forceRegenerate?: boolean;
}

export interface GeneratedPromptsDto {
  runId: string; clipId: string; status: GenerationStatus;
  imagePrompt?: string; videoPrompt?: string;
  voicePrompt?: string; audioPrompt?: string; negativePrompt?: string;
  compiledVideoPrompt?: string;
  provider: LlmProvider; model: string;
  inputTokens?: number; outputTokens?: number;
  durationMs?: number; promptStatus: PromptStatus;
  createdAt: string;
}

export interface AcceptPromptsDto {
  runId: string; clipId: string;
  imagePrompt?: string; videoPrompt?: string;
  voicePrompt?: string; audioPrompt?: string; negativePrompt?: string;
}

export interface GenerationRunListDto { items: GeneratedPromptsDto[]; total: number; }

export interface AudioProviderConfigDto {
  id: string;
  seriesId: string;
  provider: 'MAGE';
  displayName: string;
  model: 'seed-audio-1.0';
  isActive: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAudioProviderConfigDto {
  apiKey: string;
  displayName?: string;
  isActive?: boolean;
}

export interface GenerateVoiceSampleDto {
  voiceProfile?: string;
  sampleText?: string;
}
