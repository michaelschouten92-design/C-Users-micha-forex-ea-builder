-- CreateTable
CREATE TABLE "TradeCloseClaim" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "seqNo" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeCloseClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeCloseClaim_instanceId_ticket_key" ON "TradeCloseClaim"("instanceId", "ticket");

-- AddForeignKey
ALTER TABLE "TradeCloseClaim" ADD CONSTRAINT "TradeCloseClaim_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "LiveEAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
