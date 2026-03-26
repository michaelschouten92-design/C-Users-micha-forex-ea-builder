-- AlterTable: add alertSourceId for outbox dedup
ALTER TABLE "NotificationOutbox" ADD COLUMN "alertSourceId" TEXT;

-- CreateIndex: unique constraint prevents duplicate entries per alert + channel
CREATE UNIQUE INDEX "NotificationOutbox_alertSourceId_channel_key" ON "NotificationOutbox"("alertSourceId", "channel");
