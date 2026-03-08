-- Instance-first monitoring: MonitoringRun and Incident become instance-scoped.
--
-- Both tables retain strategyId for backward compatibility and proof chain continuity.
-- The new instanceId column is the primary monitoring key going forward.

-- MonitoringRun: add instanceId (nullable for existing rows, required for new ones via app code)
ALTER TABLE "MonitoringRun" ADD COLUMN "instanceId" TEXT;

-- Incident: add instanceId (nullable for existing rows, required for new ones via app code)
ALTER TABLE "Incident" ADD COLUMN "instanceId" TEXT;

-- Add FK constraints
ALTER TABLE "MonitoringRun"
  ADD CONSTRAINT "MonitoringRun_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "LiveEAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "LiveEAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Replace the strategy-level concurrent run guard with an instance-level one.
-- Old index enforced one active run per strategy; new index enforces one per instance.
-- This prevents one instance's monitoring from blocking another instance of the same strategy.
DROP INDEX IF EXISTS "MonitoringRun_single_active_per_strategy";
CREATE UNIQUE INDEX "MonitoringRun_single_active_per_instance"
    ON "MonitoringRun" ("instanceId")
    WHERE "status" IN ('PENDING', 'RUNNING');

-- Instance-scoped indexes for efficient queries
CREATE INDEX "MonitoringRun_instanceId_requestedAt_idx" ON "MonitoringRun"("instanceId", "requestedAt");
CREATE INDEX "Incident_instanceId_status_idx" ON "Incident"("instanceId", "status");
