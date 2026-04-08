-- CreateTable
CREATE TABLE "ReferralInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "commissionBps" INTEGER NOT NULL DEFAULT 2000,
    "createdBy" TEXT NOT NULL,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralInvite_token_key" ON "ReferralInvite"("token");
CREATE INDEX "ReferralInvite_token_idx" ON "ReferralInvite"("token");
