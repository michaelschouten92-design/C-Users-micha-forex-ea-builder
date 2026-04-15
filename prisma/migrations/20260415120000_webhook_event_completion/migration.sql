-- Add completion tracking to WebhookEvent so we can distinguish between
-- "successfully processed" and "claimed but handler failed". Previously the
-- handler deleted the idempotency row on error, which allowed Stripe retries
-- to re-run handlers that had already partially committed side-effects.

ALTER TABLE "WebhookEvent"
  ADD COLUMN "completedAt"  TIMESTAMP(3),
  ADD COLUMN "failureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastFailure"  TEXT;

-- Existing rows are historical successes (handler already returned 200 when
-- they were written under the old logic), so backfill completedAt = processedAt.
UPDATE "WebhookEvent" SET "completedAt" = "processedAt" WHERE "completedAt" IS NULL;

CREATE INDEX "WebhookEvent_completedAt_idx" ON "WebhookEvent"("completedAt");
