-- Enforce at most one active (PENDING or RUNNING) MonitoringRun per strategy.
-- PostgreSQL partial unique index: a second INSERT with the same strategyId
-- while an existing row has status IN ('PENDING','RUNNING') will fail
-- with a unique constraint violation (P2002 in Prisma).
-- The application catches P2002 and treats it as a no-op "already running".
CREATE UNIQUE INDEX "MonitoringRun_single_active_per_strategy"
    ON "MonitoringRun" ("strategyId")
    WHERE "status" IN ('PENDING', 'RUNNING');
