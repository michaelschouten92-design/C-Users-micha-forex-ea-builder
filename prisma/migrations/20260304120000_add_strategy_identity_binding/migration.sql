-- CreateTable
CREATE TABLE "StrategyIdentityBinding" (
    "id" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "baselineHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyIdentityBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrategyIdentityBinding_strategyVersionId_key" ON "StrategyIdentityBinding"("strategyVersionId");

-- CreateIndex
CREATE INDEX "StrategyIdentityBinding_snapshotHash_idx" ON "StrategyIdentityBinding"("snapshotHash");

-- AddForeignKey
ALTER TABLE "StrategyIdentityBinding" ADD CONSTRAINT "StrategyIdentityBinding_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "StrategyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
