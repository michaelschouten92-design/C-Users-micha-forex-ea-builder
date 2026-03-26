-- AlterTable: add heartbeat ordering fields for stale heartbeat prevention
ALTER TABLE "LiveEAInstance" ADD COLUMN "heartbeatSessionId" TEXT;
ALTER TABLE "LiveEAInstance" ADD COLUMN "heartbeatSessionStartedAt" INTEGER;
ALTER TABLE "LiveEAInstance" ADD COLUMN "heartbeatSeqNo" INTEGER;
