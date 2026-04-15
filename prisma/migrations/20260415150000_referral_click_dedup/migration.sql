-- Add per-day dedup key to ReferralClick. Without this, a partner could
-- script their landing page to fire /api/referral/click on a timer and
-- inflate their click stats arbitrarily.
--
-- Pre-existing rows get NULL dedupKey: PostgreSQL allows multiple NULL
-- values in a UNIQUE index so existing data is unaffected, and new rows
-- written by the updated route always include a non-null dedupKey.

ALTER TABLE "ReferralClick" ADD COLUMN "dedupKey" TEXT;

CREATE UNIQUE INDEX "ReferralClick_dedupKey_key" ON "ReferralClick"("dedupKey");
