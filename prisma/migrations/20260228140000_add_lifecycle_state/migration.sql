-- AddColumn
ALTER TABLE "LiveEAInstance" ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'DRAFT';

-- Backfill from existing lifecyclePhase
UPDATE "LiveEAInstance" SET "lifecycleState" = 'LIVE_MONITORING' WHERE "lifecyclePhase" = 'PROVING';
UPDATE "LiveEAInstance" SET "lifecycleState" = 'LIVE_MONITORING' WHERE "lifecyclePhase" = 'PROVEN';
UPDATE "LiveEAInstance" SET "lifecycleState" = 'INVALIDATED' WHERE "lifecyclePhase" = 'RETIRED';
