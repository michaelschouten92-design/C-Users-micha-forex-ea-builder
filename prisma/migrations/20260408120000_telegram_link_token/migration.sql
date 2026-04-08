-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramLinkToken" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramLinkExpiresAt" TIMESTAMP(3);
