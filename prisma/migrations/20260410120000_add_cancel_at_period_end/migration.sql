-- Add cancelAtPeriodEnd field to Subscription table
-- Set when a user cancels their subscription; access ends at this date.
ALTER TABLE "Subscription" ADD COLUMN "cancelAtPeriodEnd" TIMESTAMP(3);
