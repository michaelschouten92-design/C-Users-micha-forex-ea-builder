-- Drop unused payout fields. payoutMethod and payoutDetails were placeholders
-- before the IBAN/accountHolder columns landed and have no readers in the
-- current codebase. Removing them prevents future drift between the schema
-- and what the application actually uses.

ALTER TABLE "ReferralPartner"
  DROP COLUMN IF EXISTS "payoutMethod",
  DROP COLUMN IF EXISTS "payoutDetails";
