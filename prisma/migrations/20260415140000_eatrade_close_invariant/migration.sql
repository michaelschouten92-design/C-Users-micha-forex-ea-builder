-- Enforce: a closed EATrade row (closeTime IS NOT NULL) must also have a
-- closePrice. Open trades (closeTime IS NULL) keep nullable closePrice as
-- the price isn't known yet. Orphan placeholder rows (symbol = '__ORPHAN__')
-- are exempt because the EA never sent us a closePrice for them.
--
-- This catches the silent metric distortion where a TRADE_CLOSE event was
-- ingested without closePrice and the row sat as "closed but priceless",
-- yielding NaN in ROI calculations downstream.

-- Backfill any existing violations: copy openPrice into closePrice as a
-- best-effort placeholder so the constraint can be added without rejecting
-- legacy rows. This results in 0 P&L on those rows from price diff, which
-- is the same effective outcome those rows already had (NaN suppressed).
UPDATE "EATrade"
SET "closePrice" = "openPrice"
WHERE "closeTime" IS NOT NULL
  AND "closePrice" IS NULL
  AND "symbol" <> '__ORPHAN__';

ALTER TABLE "EATrade"
  ADD CONSTRAINT "EATrade_closed_requires_price"
  CHECK (
    "closeTime" IS NULL
    OR "closePrice" IS NOT NULL
    OR "symbol" = '__ORPHAN__'
  );
