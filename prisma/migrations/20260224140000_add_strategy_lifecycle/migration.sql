-- AlterTable: Add strategy lifecycle fields to LiveEAInstance
ALTER TABLE "LiveEAInstance" ADD COLUMN "lifecyclePhase" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "LiveEAInstance" ADD COLUMN "phaseEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "LiveEAInstance" ADD COLUMN "provenAt" TIMESTAMP(3);
ALTER TABLE "LiveEAInstance" ADD COLUMN "retiredAt" TIMESTAMP(3);
ALTER TABLE "LiveEAInstance" ADD COLUMN "retiredReason" TEXT;
ALTER TABLE "LiveEAInstance" ADD COLUMN "peakScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "LiveEAInstance" ADD COLUMN "peakScoreAt" TIMESTAMP(3);
