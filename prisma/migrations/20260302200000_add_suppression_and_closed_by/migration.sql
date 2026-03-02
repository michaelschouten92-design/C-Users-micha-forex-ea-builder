ALTER TABLE "LiveEAInstance" ADD COLUMN "monitoringSuppressedUntil" TIMESTAMP(3);
ALTER TABLE "Incident" ADD COLUMN "closedBy" TEXT;
