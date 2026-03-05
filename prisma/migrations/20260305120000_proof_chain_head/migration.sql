-- CreateTable: per-strategy hash chain head for concurrency-safe sequence allocation
CREATE TABLE "ProofChainHead" (
    "strategyId" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "lastEventHash" TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofChainHead_pkey" PRIMARY KEY ("strategyId")
);

-- CreateIndex: per-strategy sequence lookup on ProofEventLog
CREATE INDEX "ProofEventLog_strategyId_sequence_idx" ON "ProofEventLog"("strategyId", "sequence");
