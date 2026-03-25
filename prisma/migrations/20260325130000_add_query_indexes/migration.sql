-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TradeFact_instanceId_executedAt_idx" ON "TradeFact"("instanceId", "executedAt");

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ControlLayerAlert_instanceId_acknowledgedAt_idx" ON "ControlLayerAlert"("instanceId", "acknowledgedAt");
