-- AlterTable: add confidence interval and drift detection fields to HealthSnapshot
ALTER TABLE "HealthSnapshot" ADD COLUMN "confidenceLower" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "HealthSnapshot" ADD COLUMN "confidenceUpper" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "HealthSnapshot" ADD COLUMN "driftCusumValue" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "HealthSnapshot" ADD COLUMN "driftDetected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HealthSnapshot" ADD COLUMN "driftSeverity" DOUBLE PRECISION NOT NULL DEFAULT 0;
