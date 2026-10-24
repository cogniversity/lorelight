-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'APPLIED', 'REJECTED', 'STALE', 'FAILED');

-- CreateTable
CREATE TABLE "SourceManuscript" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "revisionNum" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceManuscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManuscriptRevision" (
    "id" TEXT NOT NULL,
    "manuscriptId" TEXT NOT NULL,
    "revisionNum" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManuscriptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeProposal" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "commandType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "targetPath" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "beforeSnap" JSONB,
    "afterSnap" JSONB,
    "validationErrors" TEXT,
    "appliedRecordId" TEXT,
    "providerConfigId" TEXT,
    "promptSnapshot" TEXT,
    "humanReadable" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceManuscript_seriesId_key" ON "SourceManuscript"("seriesId");

-- CreateIndex
CREATE INDEX "ManuscriptRevision_manuscriptId_idx" ON "ManuscriptRevision"("manuscriptId");

-- CreateIndex
CREATE UNIQUE INDEX "ManuscriptRevision_manuscriptId_revisionNum_key" ON "ManuscriptRevision"("manuscriptId", "revisionNum");

-- CreateIndex
CREATE INDEX "ChatThread_seriesId_userId_idx" ON "ChatThread"("seriesId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_idx" ON "ChatMessage"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeProposal_idempotencyKey_key" ON "ChangeProposal"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ChangeProposal_seriesId_idx" ON "ChangeProposal"("seriesId");

-- CreateIndex
CREATE INDEX "ChangeProposal_threadId_idx" ON "ChangeProposal"("threadId");

-- AddForeignKey
ALTER TABLE "SourceManuscript" ADD CONSTRAINT "SourceManuscript_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptRevision" ADD CONSTRAINT "ManuscriptRevision_manuscriptId_fkey" FOREIGN KEY ("manuscriptId") REFERENCES "SourceManuscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptRevision" ADD CONSTRAINT "ManuscriptRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeProposal" ADD CONSTRAINT "ChangeProposal_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeProposal" ADD CONSTRAINT "ChangeProposal_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeProposal" ADD CONSTRAINT "ChangeProposal_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeProposal" ADD CONSTRAINT "ChangeProposal_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
