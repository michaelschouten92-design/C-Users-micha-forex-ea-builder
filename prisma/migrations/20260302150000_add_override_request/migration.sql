-- CreateTable
CREATE TABLE "OverrideRequest" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestRecordId" TEXT NOT NULL,
    "requestNote" TEXT,
    "requestedBy" TEXT NOT NULL DEFAULT 'operator',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approveNote" TEXT,
    "approveRecordId" TEXT,
    "rejectNote" TEXT,
    "rejectRecordId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "applyRecordId" TEXT,
    "expiredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "configVersion" TEXT NOT NULL,
    "thresholdsHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverrideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OverrideRequest_strategyId_status_idx" ON "OverrideRequest"("strategyId", "status");
CREATE INDEX "OverrideRequest_status_expiresAt_idx" ON "OverrideRequest"("status", "expiresAt");

-- Partial unique: at most 1 active override per strategy
CREATE UNIQUE INDEX "OverrideRequest_strategyId_active_key"
  ON "OverrideRequest" ("strategyId")
  WHERE "status" IN ('PENDING', 'APPROVED');
