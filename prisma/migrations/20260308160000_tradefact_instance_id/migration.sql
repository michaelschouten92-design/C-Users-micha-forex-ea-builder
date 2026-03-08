-- AlterTable: Add instanceId to TradeFact for instance-scoped LIVE trade isolation.
-- Nullable for backward compatibility (BACKTEST rows and pre-migration LIVE rows).

ALTER TABLE "TradeFact" ADD COLUMN "instanceId" TEXT;

-- FK constraint
ALTER TABLE "TradeFact" ADD CONSTRAINT "TradeFact_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "LiveEAInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for instance-scoped LIVE queries (monitoring read path)
CREATE INDEX "TradeFact_instanceId_source_idx" ON "TradeFact"("instanceId", "source");
