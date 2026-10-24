// ── User & Access ──────────────────────────────────────────────
export enum SeriesRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  WRITER = 'WRITER',
  PRODUCER = 'PRODUCER',
  VIEWER = 'VIEWER',
}

// ── World entities ─────────────────────────────────────────────
export enum WorldEntityType {
  CHARACTER = 'CHARACTER',
  LOCATION = 'LOCATION',
  ARTIFACT = 'ARTIFACT',
  ORGANIZATION = 'ORGANIZATION',
  TIMELINE_EVENT = 'TIMELINE_EVENT',
}

export enum WorldEntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNKNOWN = 'UNKNOWN',
  DECEASED = 'DECEASED',
  DESTROYED = 'DESTROYED',
  MISSING = 'MISSING',
  RESTRICTED = 'RESTRICTED',
  DISBANDED = 'DISBANDED',
  CANON = 'CANON',
  DRAFT = 'DRAFT',
}

// ── Manuscript ─────────────────────────────────────────────────
export enum EpisodeStatus {
  OUTLINE = 'OUTLINE',
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PRODUCTION = 'PRODUCTION',
  COMPLETE = 'COMPLETE',
}

export enum SceneStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PRODUCTION = 'PRODUCTION',
  COMPLETE = 'COMPLETE',
}

export enum ClipStatus {
  PLANNED = 'PLANNED',
  READY = 'READY',
  GENERATED = 'GENERATED',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  FINAL = 'FINAL',
}

export enum ScriptBlockType {
  HEADING = 'HEADING',
  ACTION = 'ACTION',
  DIALOGUE = 'DIALOGUE',
  PARENTHETICAL = 'PARENTHETICAL',
  TRANSITION = 'TRANSITION',
  NOTE = 'NOTE',
}

// ── Bible ──────────────────────────────────────────────────────
export enum BibleEntryType {
  PREMISE = 'PREMISE',
  THEMES = 'THEMES',
  CANON_RULES = 'CANON_RULES',
  LORE = 'LORE',
  TIMELINE = 'TIMELINE',
  CUSTOM = 'CUSTOM',
}

// ── Assets ─────────────────────────────────────────────────────
export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  STORYBOARD = 'STORYBOARD',
  OTHER = 'OTHER',
}

export enum AssetStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
}

// ── Generation ─────────────────────────────────────────────────
export enum LlmProvider {
  OPENAI = 'OPENAI',
  OLLAMA = 'OLLAMA',
  LLAMACPP = 'LLAMACPP',
}

export enum GenerationStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PromptStatus {
  DRAFT = 'DRAFT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
