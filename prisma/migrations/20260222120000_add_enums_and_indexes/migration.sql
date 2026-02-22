-- Safe migration: Convert String columns to enum types without data loss
-- Also adds missing indexes and fixes compound unique constraint

-- 1. Create enum types
CREATE TYPE "BacktestHealthStatus" AS ENUM ('ROBUST', 'MODERATE', 'WEAK');
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'incomplete_expired', 'expired', 'unpaid', 'paused');

-- 2. Convert User.role from String to UserRole enum (safe in-place conversion)
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- 3. Convert Subscription.status from String to SubscriptionStatus enum
-- First map any 'canceled' (American) values to 'cancelled' (our enum value)
UPDATE "Subscription" SET "status" = 'cancelled' WHERE "status" = 'canceled';
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus" USING "status"::"SubscriptionStatus";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'active';

-- 4. Convert BacktestRun.healthStatus from String to BacktestHealthStatus enum
ALTER TABLE "BacktestRun" ALTER COLUMN "healthStatus" TYPE "BacktestHealthStatus" USING "healthStatus"::"BacktestHealthStatus";

-- 5. Fix BacktestUpload compound unique (drop global unique, add per-user unique)
DROP INDEX IF EXISTS "BacktestUpload_contentHash_key";
CREATE UNIQUE INDEX "BacktestUpload_userId_contentHash_key" ON "BacktestUpload"("userId", "contentHash");

-- 6. Add missing indexes for query performance
CREATE INDEX IF NOT EXISTS "AIAnalysis_createdAt_idx" ON "AIAnalysis"("createdAt");
CREATE INDEX IF NOT EXISTS "BacktestRun_createdAt_idx" ON "BacktestRun"("createdAt");
