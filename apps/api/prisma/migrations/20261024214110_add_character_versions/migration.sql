-- CreateEnum
CREATE TYPE "StoryAnchorType" AS ENUM ('SERIES', 'SEASON', 'EPISODE', 'ACT', 'SCENE');

-- CreateTable
CREATE TABLE "CharacterVersion" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "description" TEXT,
    "facialFeatures" TEXT,
    "visualSilhouetteDress" TEXT,
    "visualDescription" TEXT,
    "voiceProfile" TEXT,
    "voiceDescription" TEXT,
    "costumeDescription" TEXT,
    "mannerisms" TEXT,
    "imageAssetId" TEXT,
    "inheritMainImage" BOOLEAN NOT NULL DEFAULT true,
    "generatedPrompt" TEXT,
    "startType" "StoryAnchorType" NOT NULL DEFAULT 'SERIES',
    "startId" TEXT,
    "endType" "StoryAnchorType",
    "endId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterVersion_entityId_position_idx" ON "CharacterVersion"("entityId", "position");

-- CreateIndex
CREATE INDEX "CharacterVersion_imageAssetId_idx" ON "CharacterVersion"("imageAssetId");

-- CreateIndex
CREATE INDEX "CharacterVersion_externalId_idx" ON "CharacterVersion"("externalId");

-- AddForeignKey
ALTER TABLE "CharacterVersion" ADD CONSTRAINT "CharacterVersion_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterVersion" ADD CONSTRAINT "CharacterVersion_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
