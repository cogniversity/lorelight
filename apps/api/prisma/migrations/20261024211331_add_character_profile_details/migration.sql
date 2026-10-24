-- AlterTable
ALTER TABLE "WorldEntity" ADD COLUMN     "facialFeatures" TEXT,
ADD COLUMN     "profilePhotoAssetId" TEXT,
ADD COLUMN     "visualSilhouetteDress" TEXT,
ADD COLUMN     "voiceProfile" TEXT,
ADD COLUMN     "voiceSampleAssetId" TEXT;

-- CreateIndex
CREATE INDEX "WorldEntity_profilePhotoAssetId_idx" ON "WorldEntity"("profilePhotoAssetId");

-- CreateIndex
CREATE INDEX "WorldEntity_voiceSampleAssetId_idx" ON "WorldEntity"("voiceSampleAssetId");

-- AddForeignKey
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_profilePhotoAssetId_fkey" FOREIGN KEY ("profilePhotoAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_voiceSampleAssetId_fkey" FOREIGN KEY ("voiceSampleAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
