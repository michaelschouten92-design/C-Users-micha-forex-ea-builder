-- Performance indexes from database efficiency audit
-- All additive, no schema changes, safe to apply

-- MonitoringRun: stale-run reclaim query (instanceId + status + requestedAt)
CREATE INDEX IF NOT EXISTS "MonitoringRun_instanceId_status_requestedAt_idx"
  ON "MonitoringRun" ("instanceId", "status", "requestedAt");

-- LiveEAInstance: dashboard active instances (partial index, excludes soft-deleted)
CREATE INDEX IF NOT EXISTS "LiveEAInstance_userId_active_idx"
  ON "LiveEAInstance" ("userId")
  WHERE "deletedAt" IS NULL;

-- EAHeartbeat: retention cron cleanup by date
CREATE INDEX IF NOT EXISTS "EAHeartbeat_createdAt_idx"
  ON "EAHeartbeat" ("createdAt");
