-- Rename VERIFIED strategy status to CONSISTENT
UPDATE "LiveEAInstance" SET "strategyStatus" = 'CONSISTENT' WHERE "strategyStatus" = 'VERIFIED';
