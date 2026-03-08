-- CreateEnum: Strategy origin discriminator
CREATE TYPE "StrategyOrigin" AS ENUM ('PROJECT', 'EXTERNAL');

-- AlterTable: Add origin field (defaults to PROJECT for existing rows)
ALTER TABLE "StrategyIdentity" ADD COLUMN "origin" "StrategyOrigin" NOT NULL DEFAULT 'PROJECT';

-- AlterTable: Allow StrategyIdentity without a Project (external strategies)
ALTER TABLE "StrategyIdentity" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable: Allow StrategyVersion without a BuildVersion (external strategies)
ALTER TABLE "StrategyVersion" ALTER COLUMN "buildVersionId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "StrategyIdentity_origin_idx" ON "StrategyIdentity"("origin");
