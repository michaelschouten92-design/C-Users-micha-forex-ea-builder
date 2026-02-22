-- DropForeignKey
ALTER TABLE "StrategyVersion" DROP CONSTRAINT "StrategyVersion_buildVersionId_fkey";

-- DropIndex
DROP INDEX "ProjectShare_shareToken_idx";

-- DropIndex
DROP INDEX "RevenueSnapshot_date_idx";

-- DropIndex
DROP INDEX "SharedProofBundle_token_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingDay1SentAt" TIMESTAMP(3),
ADD COLUMN     "onboardingDay3SentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ExportJob_userId_deletedAt_createdAt_idx" ON "ExportJob"("userId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "LiveEAInstance_userId_deletedAt_idx" ON "LiveEAInstance"("userId", "deletedAt");

-- AddForeignKey
ALTER TABLE "StrategyVersion" ADD CONSTRAINT "StrategyVersion_buildVersionId_fkey" FOREIGN KEY ("buildVersionId") REFERENCES "BuildVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
