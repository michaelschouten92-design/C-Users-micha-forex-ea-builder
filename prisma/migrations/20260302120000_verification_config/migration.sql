-- CreateEnum
CREATE TYPE "VerificationConfigStatus" AS ENUM ('ACTIVE', 'DEPRECATED');

-- CreateTable
CREATE TABLE "VerificationConfig" (
    "id" TEXT NOT NULL,
    "configVersion" TEXT NOT NULL,
    "thresholdsHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" "VerificationConfigStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deprecatedAt" TIMESTAMP(3),
    "activatedBy" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "VerificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique on configVersion
CREATE UNIQUE INDEX "VerificationConfig_configVersion_key" ON "VerificationConfig"("configVersion");

-- CreateIndex: unique on thresholdsHash
CREATE UNIQUE INDEX "VerificationConfig_thresholdsHash_key" ON "VerificationConfig"("thresholdsHash");

-- CreateIndex: status lookup
CREATE INDEX "VerificationConfig_status_idx" ON "VerificationConfig"("status");

-- CreateIndex: thresholdsHash lookup
CREATE INDEX "VerificationConfig_thresholdsHash_idx" ON "VerificationConfig"("thresholdsHash");

-- Enforce at most one ACTIVE config at the database level.
-- PostgreSQL partial unique index: only one row can have status = 'ACTIVE'.
-- Attempts to INSERT or UPDATE a second row with ACTIVE status will fail
-- with a unique constraint violation (P2002 in Prisma).
CREATE UNIQUE INDEX "VerificationConfig_single_active"
    ON "VerificationConfig" ("status")
    WHERE "status" = 'ACTIVE';
