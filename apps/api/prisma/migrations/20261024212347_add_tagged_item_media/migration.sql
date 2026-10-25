-- AlterTable
ALTER TABLE "Act" ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "isFinal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "versionNotes" TEXT;

-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "Scene" ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "WorldEntity" ADD COLUMN     "referenceImageAssetId" TEXT;

-- CreateTable
CREATE TABLE "AssetActLink" (
    "assetId" TEXT NOT NULL,
    "actId" TEXT NOT NULL,

    CONSTRAINT "AssetActLink_pkey" PRIMARY KEY ("assetId","actId")
);

-- CreateIndex
CREATE INDEX "WorldEntity_referenceImageAssetId_idx" ON "WorldEntity"("referenceImageAssetId");

-- AddForeignKey
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_referenceImageAssetId_fkey" FOREIGN KEY ("referenceImageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetActLink" ADD CONSTRAINT "AssetActLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetActLink" ADD CONSTRAINT "AssetActLink_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act"("id") ON DELETE CASCADE ON UPDATE CASCADE;
