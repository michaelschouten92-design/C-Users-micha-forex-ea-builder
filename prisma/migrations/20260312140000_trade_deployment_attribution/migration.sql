-- AlterTable: add trade-level deployment attribution fields
ALTER TABLE "EATrade" ADD COLUMN "magicNumber" INTEGER;
ALTER TABLE "EATrade" ADD COLUMN "terminalDeploymentId" TEXT;

-- AddForeignKey
ALTER TABLE "EATrade" ADD CONSTRAINT "EATrade_terminalDeploymentId_fkey" FOREIGN KEY ("terminalDeploymentId") REFERENCES "TerminalDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "EATrade_terminalDeploymentId_idx" ON "EATrade"("terminalDeploymentId");
