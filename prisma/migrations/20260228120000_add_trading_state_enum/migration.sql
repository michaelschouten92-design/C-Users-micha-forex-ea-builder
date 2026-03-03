-- CreateEnum (idempotent — skip if type already exists from partial db push)
DO $$ BEGIN
  CREATE TYPE "EATradingState" AS ENUM ('TRADING', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddColumn with default (idempotent)
ALTER TABLE "LiveEAInstance" ADD COLUMN IF NOT EXISTS "tradingState" "EATradingState" NOT NULL DEFAULT 'TRADING';

-- Backfill from existing boolean (only if legacy column still exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LiveEAInstance' AND column_name = 'paused'
  ) THEN
    UPDATE "LiveEAInstance" SET "tradingState" = 'PAUSED' WHERE "paused" = true;
    ALTER TABLE "LiveEAInstance" DROP COLUMN "paused";
  END IF;
END $$;
