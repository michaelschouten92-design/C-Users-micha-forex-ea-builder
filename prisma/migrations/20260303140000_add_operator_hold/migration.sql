-- AlterTable
ALTER TABLE "LiveEAInstance" ADD COLUMN "operatorHold" TEXT NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "LiveEAInstance_operatorHold_idx" ON "LiveEAInstance"("operatorHold");
