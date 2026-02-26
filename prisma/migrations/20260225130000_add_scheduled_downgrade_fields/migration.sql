-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "scheduledDowngradeTier" "PlanTier",
ADD COLUMN "stripeScheduleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeScheduleId_key" ON "Subscription"("stripeScheduleId");
