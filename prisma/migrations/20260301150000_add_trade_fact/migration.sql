-- CreateTable
CREATE TABLE "TradeFact" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRunId" TEXT,
    "sourceTicket" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "closePrice" DOUBLE PRECISION,
    "sl" DOUBLE PRECISION,
    "tp" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "TradeFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeFact_strategyId_source_sourceTicket_key" ON "TradeFact"("strategyId", "source", "sourceTicket");

-- CreateIndex
CREATE INDEX "TradeFact_strategyId_executedAt_idx" ON "TradeFact"("strategyId", "executedAt");

-- CreateIndex
CREATE INDEX "TradeFact_strategyId_source_idx" ON "TradeFact"("strategyId", "source");

-- CreateIndex
CREATE INDEX "TradeFact_sourceRunId_idx" ON "TradeFact"("sourceRunId");
