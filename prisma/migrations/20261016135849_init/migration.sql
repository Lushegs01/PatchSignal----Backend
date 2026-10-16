-- CreateEnum
CREATE TYPE "Provenance" AS ENUM ('observed', 'reported', 'hypothesis', 'unknown');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('intake', 'analyzed', 'inspected', 'hypothesized', 'ran', 'packaged');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'Reproduced', 'Not_reproduced', 'Inconclusive');

-- CreateEnum
CREATE TYPE "RunRole" AS ENUM ('target', 'control');

-- CreateEnum
CREATE TYPE "RunOutcome" AS ENUM ('passed', 'failed', 'error', 'timeout');

-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expected" TEXT,
    "actual" TEXT,
    "steps" TEXT,
    "environment" TEXT,
    "errorText" TEXT,
    "commitSha" TEXT,
    "controlSha" TEXT,
    "stage" "Stage" NOT NULL DEFAULT 'intake',
    "status" "Status" NOT NULL DEFAULT 'pending',
    "modelId" TEXT,
    "promptVersion" TEXT DEFAULT 'v0.1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "provenance" "Provenance" NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "blocking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "triggerConditions" TEXT NOT NULL,
    "expectedFailure" TEXT NOT NULL,
    "evidenceNeeded" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestArtifact" (
    "id" TEXT NOT NULL,
    "hypothesisId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "framework" TEXT NOT NULL DEFAULT 'vitest',

    CONSTRAINT "TestArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "hypothesisId" TEXT NOT NULL,
    "role" "RunRole" NOT NULL,
    "revisionSha" TEXT,
    "imageDigest" TEXT,
    "command" TEXT NOT NULL,
    "exitCode" INTEGER,
    "outcome" "RunOutcome" NOT NULL,
    "durationMs" INTEGER,
    "reportJson" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "rule" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "geminiFileUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_publicId_key" ON "Attachment"("publicId");

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestArtifact" ADD CONSTRAINT "TestArtifact_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
