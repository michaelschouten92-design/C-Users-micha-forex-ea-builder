-- CreateEnum
CREATE TYPE "EAAlertState" AS ENUM ('ACTIVE', 'DISABLED');

-- AddColumn with default
ALTER TABLE "EAAlertConfig" ADD COLUMN "state" "EAAlertState" NOT NULL DEFAULT 'ACTIVE';

-- Backfill from boolean
UPDATE "EAAlertConfig" SET "state" = 'DISABLED' WHERE "enabled" = false;

-- DropOldIndexes
DROP INDEX "EAAlertConfig_userId_enabled_idx";
DROP INDEX "EAAlertConfig_alertType_enabled_idx";

-- DropColumn
ALTER TABLE "EAAlertConfig" DROP COLUMN "enabled";

-- CreateNewIndexes
CREATE INDEX "EAAlertConfig_userId_state_idx" ON "EAAlertConfig"("userId", "state");
CREATE INDEX "EAAlertConfig_alertType_state_idx" ON "EAAlertConfig"("alertType", "state");
