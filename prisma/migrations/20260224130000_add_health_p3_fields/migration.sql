-- Add P3 health monitor fields: primary driver, score trend, expectancy
ALTER TABLE "HealthSnapshot" ADD COLUMN "primaryDriver" TEXT;
ALTER TABLE "HealthSnapshot" ADD COLUMN "scoreTrend" TEXT;
ALTER TABLE "HealthSnapshot" ADD COLUMN "expectancy" DOUBLE PRECISION;
