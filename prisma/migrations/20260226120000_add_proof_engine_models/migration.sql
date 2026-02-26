-- CreateEnum
CREATE TYPE "LadderLevel" AS ENUM ('SUBMITTED', 'VALIDATED', 'VERIFIED', 'PROVEN', 'INSTITUTIONAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "handle" TEXT;

-- AlterTable
ALTER TABLE "VerifiedStrategyPage" ADD COLUMN     "ladderLevel" "LadderLevel" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN     "lastLevelComputedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProofEventLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "strategyId" TEXT,
    "ownerId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "referrer" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofThreshold" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "label" TEXT,

    CONSTRAINT "ProofThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofEventLog_type_createdAt_idx" ON "ProofEventLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ProofEventLog_strategyId_type_createdAt_idx" ON "ProofEventLog"("strategyId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ProofEventLog_ownerId_type_createdAt_idx" ON "ProofEventLog"("ownerId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ProofEventLog_createdAt_idx" ON "ProofEventLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProofThreshold_key_key" ON "ProofThreshold"("key");

-- CreateIndex
CREATE INDEX "ProofThreshold_key_idx" ON "ProofThreshold"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "VerifiedStrategyPage_ladderLevel_isPublic_idx" ON "VerifiedStrategyPage"("ladderLevel", "isPublic");
