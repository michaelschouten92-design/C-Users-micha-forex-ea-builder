-- Add explicit lifecycle status to StrategyVersion.
-- Default ACTIVE: all existing versions are usable until explicitly deprecated or retired.
ALTER TABLE "StrategyVersion" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Index for querying versions by identity + status (e.g. "all active versions for this strategy").
CREATE INDEX "StrategyVersion_strategyIdentityId_status_idx" ON "StrategyVersion"("strategyIdentityId", "status");
