-- CreateEnum
CREATE TYPE "AudioProvider" AS ENUM ('MAGE');

-- CreateTable
CREATE TABLE "AudioProviderConfig" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "provider" "AudioProvider" NOT NULL DEFAULT 'MAGE',
    "displayName" TEXT NOT NULL DEFAULT 'Mage Seed Audio',
    "model" TEXT NOT NULL DEFAULT 'seed-audio-1.0',
    "encryptedKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudioProviderConfig_seriesId_isActive_idx" ON "AudioProviderConfig"("seriesId", "isActive");

-- AddForeignKey
ALTER TABLE "AudioProviderConfig" ADD CONSTRAINT "AudioProviderConfig_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
