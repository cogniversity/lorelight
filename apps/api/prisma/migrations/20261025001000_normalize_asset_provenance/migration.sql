-- Normalize provenance into the planned one-to-one table.
CREATE TYPE "AssetProvenanceSource" AS ENUM ('UPLOAD', 'MAGE_SEED_AUDIO');

CREATE TABLE "AssetProvenance" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "source" "AssetProvenanceSource" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "requestId" TEXT,
    "prompt" TEXT,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetProvenance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssetProvenance_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "AssetProvenance_assetId_key"
  ON "AssetProvenance"("assetId");
CREATE INDEX "AssetProvenance_source_idx"
  ON "AssetProvenance"("source");
CREATE INDEX "AssetProvenance_provider_model_idx"
  ON "AssetProvenance"("provider", "model");

INSERT INTO "AssetProvenance" (
  "id", "assetId", "source", "provider", "model", "requestId",
  "prompt", "durationSeconds", "createdAt", "updatedAt"
)
SELECT
  concat('prov_', md5(a."id")),
  a."id",
  CASE
    WHEN a."source" = 'GENERATED_MAGE'::"AssetSource"
      THEN 'MAGE_SEED_AUDIO'::"AssetProvenanceSource"
    ELSE 'UPLOAD'::"AssetProvenanceSource"
  END,
  a."generationProvider",
  a."generationModel",
  a."generationRequestId",
  a."generationPrompt",
  a."generationDurationSec",
  a."createdAt",
  a."updatedAt"
FROM "Asset" a;

DROP INDEX IF EXISTS "Asset_seriesId_source_idx";
ALTER TABLE "Asset"
  DROP COLUMN "source",
  DROP COLUMN "generationPrompt",
  DROP COLUMN "generationProvider",
  DROP COLUMN "generationModel",
  DROP COLUMN "generationRequestId",
  DROP COLUMN "generationDurationSec";
DROP TYPE "AssetSource";

ALTER TABLE "AssetAssignment"
  RENAME COLUMN "note" TO "replacementNote";

-- Keep a single current assignment per target and role under concurrent writes.
CREATE UNIQUE INDEX "AssetAssignment_current_target_role_key"
  ON "AssetAssignment"("seriesId", "targetType", "targetId", "role")
  WHERE "status" = 'ASSIGNED';

-- Backfill selected production media that predates assignment history.
INSERT INTO "AssetAssignment" (
  "id", "assetId", "seriesId", "targetType", "targetId", "role",
  "status", "createdAt", "updatedAt"
)
SELECT
  concat('ba_pm_act_', md5(a."id" || ':' || l."actId")),
  a."id", a."seriesId", 'ACT'::"AssetAssignmentTargetType", l."actId",
  'PRODUCTION_MEDIA'::"AssetAssignmentRole",
  'ASSIGNED'::"AssetAssignmentStatus", a."createdAt", a."updatedAt"
FROM "Asset" a
JOIN "AssetActLink" l ON l."assetId" = a."id"
WHERE a."isFinal" = true
ON CONFLICT DO NOTHING;

INSERT INTO "AssetAssignment" (
  "id", "assetId", "seriesId", "targetType", "targetId", "role",
  "status", "createdAt", "updatedAt"
)
SELECT
  concat('ba_pm_scene_', md5(a."id" || ':' || l."sceneId")),
  a."id", a."seriesId", 'SCENE'::"AssetAssignmentTargetType", l."sceneId",
  'PRODUCTION_MEDIA'::"AssetAssignmentRole",
  'ASSIGNED'::"AssetAssignmentStatus", a."createdAt", a."updatedAt"
FROM "Asset" a
JOIN "AssetSceneLink" l ON l."assetId" = a."id"
WHERE a."isFinal" = true
ON CONFLICT DO NOTHING;

INSERT INTO "AssetAssignment" (
  "id", "assetId", "seriesId", "targetType", "targetId", "role",
  "status", "createdAt", "updatedAt"
)
SELECT
  concat('ba_pm_clip_', md5(a."id" || ':' || l."clipId")),
  a."id", a."seriesId", 'CLIP'::"AssetAssignmentTargetType", l."clipId",
  'PRODUCTION_MEDIA'::"AssetAssignmentRole",
  'ASSIGNED'::"AssetAssignmentStatus", a."createdAt", a."updatedAt"
FROM "Asset" a
JOIN "AssetClipLink" l ON l."assetId" = a."id"
WHERE a."isFinal" = true
ON CONFLICT DO NOTHING;
