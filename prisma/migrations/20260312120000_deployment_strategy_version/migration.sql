-- AlterTable: add deployment-level baseline anchor
ALTER TABLE "TerminalDeployment" ADD COLUMN "strategyVersionId" TEXT;

-- AddForeignKey
ALTER TABLE "TerminalDeployment" ADD CONSTRAINT "TerminalDeployment_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "StrategyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
