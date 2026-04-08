-- Add grossProfit and grossLoss columns to TrackRecordState
-- These accumulate running totals of winning and losing trade profits,
-- enabling profit factor computation without querying all trades.

ALTER TABLE "TrackRecordState" ADD COLUMN "grossProfit" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TrackRecordState" ADD COLUMN "grossLoss"   DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill from existing closed trades
UPDATE "TrackRecordState" trs
SET "grossProfit" = COALESCE(sub.gp, 0),
    "grossLoss"   = COALESCE(sub.gl, 0)
FROM (
  SELECT "instanceId",
         SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END) AS gp,
         SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END) AS gl
  FROM "EATrade"
  WHERE "closeTime" IS NOT NULL
  GROUP BY "instanceId"
) sub
WHERE trs."instanceId" = sub."instanceId";
