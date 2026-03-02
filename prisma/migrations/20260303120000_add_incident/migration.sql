-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL,
    "triggerRecordId" TEXT NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "snapshotHash" TEXT,
    "configVersion" TEXT NOT NULL,
    "thresholdsHash" TEXT NOT NULL,
    "ackDeadlineAt" TIMESTAMP(3) NOT NULL,
    "invalidateDeadlineAt" TIMESTAMP(3),
    "lastEscalatedAt" TIMESTAMP(3),
    "escalationCount" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_strategyId_status_idx" ON "Incident"("strategyId", "status");

-- CreateIndex
CREATE INDEX "Incident_status_ackDeadlineAt_idx" ON "Incident"("status", "ackDeadlineAt");

-- CreateIndex
CREATE INDEX "Incident_status_invalidateDeadlineAt_idx" ON "Incident"("status", "invalidateDeadlineAt");

-- Partial unique index: at most 1 non-CLOSED incident per strategy
CREATE UNIQUE INDEX "Incident_single_open_per_strategy"
    ON "Incident" ("strategyId")
    WHERE "status" != 'CLOSED';
