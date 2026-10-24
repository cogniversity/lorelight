-- CreateEnum
CREATE TYPE "SeriesRole" AS ENUM ('OWNER', 'ADMIN', 'WRITER', 'PRODUCER', 'VIEWER');

-- CreateEnum
CREATE TYPE "BibleEntryType" AS ENUM ('PREMISE', 'THEMES', 'CANON_RULES', 'LORE', 'TIMELINE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorldEntityType" AS ENUM ('CHARACTER', 'LOCATION', 'ARTIFACT', 'ORGANIZATION', 'TIMELINE_EVENT');

-- CreateEnum
CREATE TYPE "WorldEntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNKNOWN', 'DECEASED', 'DESTROYED', 'MISSING', 'RESTRICTED', 'DISBANDED', 'CANON', 'DRAFT');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('OUTLINE', 'DRAFT', 'REVIEW', 'APPROVED', 'PRODUCTION', 'COMPLETE');

-- CreateEnum
CREATE TYPE "SceneStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PRODUCTION', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ScriptBlockType" AS ENUM ('HEADING', 'ACTION', 'DIALOGUE', 'PARENTHETICAL', 'TRANSITION', 'NOTE');

-- CreateEnum
CREATE TYPE "ClipStatus" AS ENUM ('PLANNED', 'READY', 'GENERATED', 'REVIEW', 'APPROVED', 'FINAL');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STORYBOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'UPLOADED', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LlmProvider" AS ENUM ('OPENAI', 'OLLAMA', 'LLAMACPP');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "premise" TEXT NOT NULL DEFAULT '',
    "posterUrl" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "role" "SeriesRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeriesMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleEntry" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "type" "BibleEntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BibleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEntity" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "type" "WorldEntityType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "externalId" TEXT,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "WorldEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "color" TEXT,
    "tags" TEXT[],
    "visualDescription" TEXT,
    "voiceDescription" TEXT,
    "costumeDescription" TEXT,
    "mannerisms" TEXT,
    "goals" TEXT,
    "motivations" TEXT,
    "fears" TEXT,
    "biography" TEXT,
    "architectureNotes" TEXT,
    "moodNotes" TEXT,
    "lightingNotes" TEXT,
    "environmentNotes" TEXT,
    "weatherNotes" TEXT,
    "imagePrompt" TEXT,
    "environmentPrompt" TEXT,
    "videoPrompt" TEXT,
    "origin" TEXT,
    "currentOwner" TEXT,
    "importance" TEXT,
    "purpose" TEXT,
    "leadership" TEXT,
    "members" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "status" "EpisodeStatus" NOT NULL DEFAULT 'OUTLINE',
    "estimatedRuntime" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Act" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "purpose" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Act_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT,
    "locationId" TEXT,
    "timeOfDay" TEXT,
    "interior" BOOLEAN NOT NULL DEFAULT true,
    "status" "SceneStatus" NOT NULL DEFAULT 'DRAFT',
    "duration" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptBlock" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "type" "ScriptBlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "characterId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "storyBeat" TEXT NOT NULL DEFAULT '',
    "action" TEXT,
    "dialogue" TEXT,
    "emotion" TEXT,
    "duration" TEXT,
    "targetDurationSec" INTEGER NOT NULL DEFAULT 7,
    "cameraShot" TEXT,
    "cameraAngle" TEXT,
    "cameraMovement" TEXT,
    "composition" TEXT,
    "lens" TEXT,
    "lighting" TEXT,
    "voiceNotes" TEXT,
    "ambientAudio" TEXT,
    "sfx" TEXT,
    "music" TEXT,
    "imagePrompt" TEXT,
    "videoPrompt" TEXT,
    "voicePrompt" TEXT,
    "audioPrompt" TEXT,
    "negativePrompt" TEXT,
    "status" "ClipStatus" NOT NULL DEFAULT 'PLANNED',
    "position" INTEGER NOT NULL DEFAULT 0,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneEntity" (
    "sceneId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "SceneEntity_pkey" PRIMARY KEY ("sceneId","entityId")
);

-- CreateTable
CREATE TABLE "ClipEntity" (
    "clipId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "ClipEntity_pkey" PRIMARY KEY ("clipId","entityId")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVariant" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,

    CONSTRAINT "AssetVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetEntityLink" (
    "assetId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "AssetEntityLink_pkey" PRIMARY KEY ("assetId","entityId")
);

-- CreateTable
CREATE TABLE "AssetSceneLink" (
    "assetId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,

    CONSTRAINT "AssetSceneLink_pkey" PRIMARY KEY ("assetId","sceneId")
);

-- CreateTable
CREATE TABLE "AssetClipLink" (
    "assetId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,

    CONSTRAINT "AssetClipLink_pkey" PRIMARY KEY ("assetId","clipId")
);

-- CreateTable
CREATE TABLE "LlmProviderConfig" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT,
    "provider" "LlmProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseUrl" TEXT,
    "model" TEXT NOT NULL,
    "encryptedKey" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "guideVersion" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "rawResponse" TEXT,
    "imagePrompt" TEXT,
    "videoPrompt" TEXT,
    "voicePrompt" TEXT,
    "audioPrompt" TEXT,
    "negativePrompt" TEXT,
    "compiledVideoPrompt" TEXT,
    "promptStatus" "PromptStatus" NOT NULL DEFAULT 'DRAFT',
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");

-- CreateIndex
CREATE INDEX "SeriesMembership_seriesId_idx" ON "SeriesMembership"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesMembership_userId_seriesId_key" ON "SeriesMembership"("userId", "seriesId");

-- CreateIndex
CREATE INDEX "BibleEntry_seriesId_idx" ON "BibleEntry"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "BibleEntry_seriesId_type_key" ON "BibleEntry"("seriesId", "type");

-- CreateIndex
CREATE INDEX "WorldEntity_seriesId_type_idx" ON "WorldEntity"("seriesId", "type");

-- CreateIndex
CREATE INDEX "WorldEntity_seriesId_displayName_idx" ON "WorldEntity"("seriesId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "WorldEntity_seriesId_externalId_key" ON "WorldEntity"("seriesId", "externalId");

-- CreateIndex
CREATE INDEX "Season_seriesId_idx" ON "Season"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_seriesId_number_key" ON "Season"("seriesId", "number");

-- CreateIndex
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_number_key" ON "Episode"("seasonId", "number");

-- CreateIndex
CREATE INDEX "Act_episodeId_idx" ON "Act"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Act_episodeId_number_key" ON "Act"("episodeId", "number");

-- CreateIndex
CREATE INDEX "Scene_actId_idx" ON "Scene"("actId");

-- CreateIndex
CREATE INDEX "Scene_episodeId_idx" ON "Scene"("episodeId");

-- CreateIndex
CREATE INDEX "ScriptBlock_sceneId_idx" ON "ScriptBlock"("sceneId");

-- CreateIndex
CREATE INDEX "Clip_sceneId_idx" ON "Clip"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_seriesId_type_idx" ON "Asset"("seriesId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVariant_storageKey_key" ON "AssetVariant"("storageKey");

-- CreateIndex
CREATE INDEX "AssetVariant_assetId_idx" ON "AssetVariant"("assetId");

-- CreateIndex
CREATE INDEX "LlmProviderConfig_seriesId_idx" ON "LlmProviderConfig"("seriesId");

-- CreateIndex
CREATE INDEX "GenerationRun_clipId_idx" ON "GenerationRun"("clipId");

-- CreateIndex
CREATE INDEX "GenerationRun_seriesId_idx" ON "GenerationRun"("seriesId");

-- CreateIndex
CREATE INDEX "ActivityEvent_seriesId_idx" ON "ActivityEvent"("seriesId");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_idx" ON "ActivityEvent"("userId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesMembership" ADD CONSTRAINT "SeriesMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesMembership" ADD CONSTRAINT "SeriesMembership_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleEntry" ADD CONSTRAINT "BibleEntry_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Act" ADD CONSTRAINT "Act_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptBlock" ADD CONSTRAINT "ScriptBlock_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEntity" ADD CONSTRAINT "SceneEntity_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEntity" ADD CONSTRAINT "SceneEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipEntity" ADD CONSTRAINT "ClipEntity_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipEntity" ADD CONSTRAINT "ClipEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVariant" ADD CONSTRAINT "AssetVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEntityLink" ADD CONSTRAINT "AssetEntityLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEntityLink" ADD CONSTRAINT "AssetEntityLink_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSceneLink" ADD CONSTRAINT "AssetSceneLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSceneLink" ADD CONSTRAINT "AssetSceneLink_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetClipLink" ADD CONSTRAINT "AssetClipLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetClipLink" ADD CONSTRAINT "AssetClipLink_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmProviderConfig" ADD CONSTRAINT "LlmProviderConfig_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LlmProviderConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
