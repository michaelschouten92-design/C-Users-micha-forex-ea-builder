-- CreateEnum
CREATE TYPE "EATradingState" AS ENUM ('TRADING', 'PAUSED');

-- AddColumn with default
ALTER TABLE "LiveEAInstance" ADD COLUMN "tradingState" "EATradingState" NOT NULL DEFAULT 'TRADING';

-- Backfill from existing boolean
UPDATE "LiveEAInstance" SET "tradingState" = 'PAUSED' WHERE "paused" = true;
