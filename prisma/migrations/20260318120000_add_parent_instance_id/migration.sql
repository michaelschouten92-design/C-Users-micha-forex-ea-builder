-- AlterTable
ALTER TABLE "LiveEAInstance" ADD COLUMN "parentInstanceId" TEXT;

-- CreateIndex
CREATE INDEX "LiveEAInstance_parentInstanceId_idx" ON "LiveEAInstance"("parentInstanceId");

-- AddForeignKey
ALTER TABLE "LiveEAInstance" ADD CONSTRAINT "LiveEAInstance_parentInstanceId_fkey" FOREIGN KEY ("parentInstanceId") REFERENCES "LiveEAInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
