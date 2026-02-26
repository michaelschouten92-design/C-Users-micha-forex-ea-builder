-- AlterTable: Add ON DELETE CASCADE to NotificationOutbox -> User FK
ALTER TABLE "NotificationOutbox" DROP CONSTRAINT "NotificationOutbox_userId_fkey";
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
