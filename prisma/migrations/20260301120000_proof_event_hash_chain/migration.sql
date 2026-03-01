-- AlterTable: Add hash chain columns to ProofEventLog
ALTER TABLE "ProofEventLog" ADD COLUMN "sequence" INTEGER;
ALTER TABLE "ProofEventLog" ADD COLUMN "eventHash" TEXT;
ALTER TABLE "ProofEventLog" ADD COLUMN "prevEventHash" TEXT;

-- Backfill sequence numbers for verification ledger events.
-- Chain scope: per verification-run recordId (stored in sessionId).
-- Deterministic ordering: createdAt ASC with id ASC as tie-breaker.
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "sessionId" ORDER BY "createdAt" ASC, id ASC) AS seq
  FROM "ProofEventLog"
  WHERE "type" IN ('VERIFICATION_RUN_COMPLETED', 'VERIFICATION_PASSED')
    AND "strategyId" IS NOT NULL
)
UPDATE "ProofEventLog"
SET "sequence" = numbered.seq
FROM numbered
WHERE "ProofEventLog".id = numbered.id;

-- CreateIndex: unique constraint on (sessionId, sequence) — enforces monotonic chain per run.
-- Analytics rows have sequence=NULL; PostgreSQL allows multiple (sessionId, NULL) in unique indexes.
CREATE UNIQUE INDEX "ProofEventLog_sessionId_sequence_key" ON "ProofEventLog"("sessionId", "sequence");

-- CreateIndex: efficient chain reads by recordId
CREATE INDEX "ProofEventLog_sessionId_sequence_idx" ON "ProofEventLog"("sessionId", "sequence");
