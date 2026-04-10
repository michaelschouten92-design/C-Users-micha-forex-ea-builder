-- Add SEPA payout fields to ReferralPartner
-- Per Terms §10.3, payouts are made via SEPA bank transfer.
-- These fields are optional until a partner needs to be paid out.
ALTER TABLE "ReferralPartner" ADD COLUMN "payoutIban" TEXT;
ALTER TABLE "ReferralPartner" ADD COLUMN "payoutAccountHolder" TEXT;
