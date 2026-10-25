-- ============================================================
-- Migration: add_asset_lifecycle
-- Renames CharacterVersion → WorldEntityVersion (preserving rows),
-- adds location/artifact fields to WorldEntityVersion,
-- adds asset provenance columns,
-- creates AssetAssignment table with enums,
-- and backfills existing assignments from WorldEntity FK pointers.
-- ============================================================

-- ── 1. Rename CharacterVersion table ────────────────────────
ALTER TABLE "CharacterVersion" RENAME TO "WorldEntityVersion";

-- Rename constraint + indexes
ALTER TABLE "WorldEntityVersion" RENAME CONSTRAINT "CharacterVersion_pkey" TO "WorldEntityVersion_pkey";

-- Drop old indexes (they were auto-named after CharacterVersion)
DROP INDEX IF EXISTS "CharacterVersion_entityId_position_idx";
DROP INDEX IF EXISTS "CharacterVersion_imageAssetId_idx";
DROP INDEX IF EXISTS "CharacterVersion_externalId_idx";

-- Recreate with new names
CREATE INDEX "WorldEntityVersion_entityId_position_idx" ON "WorldEntityVersion"("entityId", "position");
CREATE INDEX "WorldEntityVersion_imageAssetId_idx" ON "WorldEntityVersion"("imageAssetId");
CREATE INDEX "WorldEntityVersion_externalId_idx" ON "WorldEntityVersion"("externalId");

-- Rename the FK on WorldEntity image relation (asset table relation)
-- The FK constraint on WorldEntityVersion referencing WorldEntity was auto-named
ALTER TABLE "WorldEntityVersion" RENAME CONSTRAINT "CharacterVersion_entityId_fkey" TO "WorldEntityVersion_entityId_fkey";
ALTER TABLE "WorldEntityVersion" RENAME CONSTRAINT "CharacterVersion_imageAssetId_fkey" TO "WorldEntityVersion_imageAssetId_fkey";

-- ── 2. Add location/artifact-specific columns ────────────────
ALTER TABLE "WorldEntityVersion"
  ADD COLUMN IF NOT EXISTS "architectureNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "moodNotes"         TEXT,
  ADD COLUMN IF NOT EXISTS "lightingNotes"     TEXT,
  ADD COLUMN IF NOT EXISTS "environmentNotes"  TEXT,
  ADD COLUMN IF NOT EXISTS "weatherNotes"      TEXT,
  ADD COLUMN IF NOT EXISTS "origin"            TEXT,
  ADD COLUMN IF NOT EXISTS "currentOwner"      TEXT,
  ADD COLUMN IF NOT EXISTS "importance"        TEXT;

-- ── 3. Asset provenance ──────────────────────────────────────

CREATE TYPE "AssetSource" AS ENUM ('UPLOADED', 'GENERATED_MAGE');

ALTER TABLE "Asset"
  ADD COLUMN IF NOT EXISTS "source"                 "AssetSource" NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN IF NOT EXISTS "generationPrompt"        TEXT,
  ADD COLUMN IF NOT EXISTS "generationProvider"      TEXT,
  ADD COLUMN IF NOT EXISTS "generationModel"         TEXT,
  ADD COLUMN IF NOT EXISTS "generationRequestId"     TEXT,
  ADD COLUMN IF NOT EXISTS "generationDurationSec"   INTEGER;

CREATE INDEX IF NOT EXISTS "Asset_seriesId_source_idx" ON "Asset"("seriesId", "source");

-- ── 4. AssetAssignment enums + table ────────────────────────

CREATE TYPE "AssetAssignmentRole" AS ENUM (
  'PROFILE_PHOTO', 'VOICE_SAMPLE', 'REFERENCE_IMAGE', 'VERSION_IMAGE', 'PRODUCTION_MEDIA'
);
CREATE TYPE "AssetAssignmentStatus" AS ENUM ('ASSIGNED', 'ABANDONED');
CREATE TYPE "AssetAssignmentTargetType" AS ENUM (
  'ENTITY', 'ENTITY_VERSION', 'ACT', 'SCENE', 'CLIP'
);

CREATE TABLE "AssetAssignment" (
  "id"                TEXT NOT NULL,
  "assetId"           TEXT NOT NULL,
  "seriesId"          TEXT NOT NULL,
  "targetType"        "AssetAssignmentTargetType" NOT NULL,
  "targetId"          TEXT NOT NULL,
  "role"              "AssetAssignmentRole" NOT NULL,
  "status"            "AssetAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "note"              TEXT,
  "replacedByAssetId" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetAssignment_assetId_fkey"           FOREIGN KEY ("assetId")           REFERENCES "Asset"("id")  ON DELETE CASCADE,
  CONSTRAINT "AssetAssignment_seriesId_fkey"          FOREIGN KEY ("seriesId")          REFERENCES "Series"("id") ON DELETE CASCADE,
  CONSTRAINT "AssetAssignment_replacedByAssetId_fkey" FOREIGN KEY ("replacedByAssetId") REFERENCES "Asset"("id")
);

CREATE INDEX "AssetAssignment_assetId_idx"                  ON "AssetAssignment"("assetId");
CREATE INDEX "AssetAssignment_seriesId_targetType_targetId_idx" ON "AssetAssignment"("seriesId", "targetType", "targetId");
CREATE INDEX "AssetAssignment_status_idx"                   ON "AssetAssignment"("status");

-- ── 5. Backfill existing assignments from WorldEntity FKs ───

-- profilePhotoAssetId
INSERT INTO "AssetAssignment" ("id", "assetId", "seriesId", "targetType", "targetId", "role", "status", "createdAt", "updatedAt")
SELECT
  concat('ba_pp_', we.id),
  we."profilePhotoAssetId",
  we."seriesId",
  'ENTITY'::"AssetAssignmentTargetType",
  we.id,
  'PROFILE_PHOTO'::"AssetAssignmentRole",
  'ASSIGNED'::"AssetAssignmentStatus",
  we."createdAt",
  we."updatedAt"
FROM "WorldEntity" we
WHERE we."profilePhotoAssetId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- voiceSampleAssetId
INSERT INTO "AssetAssignment" ("id", "assetId", "seriesId", "targetType", "targetId", "role", "status", "createdAt", "updatedAt")
SELECT
  concat('ba_vs_', we.id),
  we."voiceSampleAssetId",
  we."seriesId",
  'ENTITY'::"AssetAssignmentTargetType",
  we.id,
  'VOICE_SAMPLE'::"AssetAssignmentRole",
  'ASSIGNED'::"AssetAssignmentStatus",
  we."createdAt",
  we."updatedAt"
FROM "WorldEntity" we
WHERE we."voiceSampleAssetId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- referenceImageAssetId
INSERT INTO "AssetAssignment" ("id", "assetId", "seriesId", "targetType", "targetId", "role", "status", "createdAt", "updatedAt")
SELECT
  concat('ba_ri_', we.id),
  we."referenceImageAssetId",
  we."seriesId",
  'ENTITY'::"AssetAssignmentTargetType",
  we.id,
  'REFERENCE_IMAGE'::"AssetAssignmentRole",
  'ASSIGNED'::"AssetAssignmentStatus",
  we."createdAt",
  we."updatedAt"
FROM "WorldEntity" we
WHERE we."referenceImageAssetId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- WorldEntityVersion imageAssetId (non-inherited)
INSERT INTO "AssetAssignment" ("id", "assetId", "seriesId", "targetType", "targetId", "role", "status", "createdAt", "updatedAt")
SELECT
  concat('ba_vi_', wev.id),
  wev."imageAssetId",
  we."seriesId",
  'ENTITY_VERSION'::"AssetAssignmentTargetType",
  wev.id,
  'VERSION_IMAGE'::"AssetAssignmentRole",
  'ASSIGNED'::"AssetAssignmentStatus",
  wev."createdAt",
  wev."updatedAt"
FROM "WorldEntityVersion" wev
JOIN "WorldEntity" we ON we.id = wev."entityId"
WHERE wev."imageAssetId" IS NOT NULL AND wev."inheritMainImage" = false
ON CONFLICT DO NOTHING;
