-- Drop the blanket unique constraint that blocks multiple partial refund reversals
DROP INDEX IF EXISTS "ReferralLedger_stripeInvoiceId_type_key";

-- Create partial unique index: only COMMISSION_EARNED is unique per invoice
-- This prevents duplicate commission booking while allowing multiple COMMISSION_REVERSED entries
CREATE UNIQUE INDEX "ledger_one_earned_per_invoice"
  ON "ReferralLedger" ("stripeInvoiceId", "type")
  WHERE "type" = 'COMMISSION_EARNED';

-- Non-unique index for general lookups (replaces the dropped unique index for other types)
CREATE INDEX "ReferralLedger_stripeInvoiceId_type_idx"
  ON "ReferralLedger" ("stripeInvoiceId", "type");
