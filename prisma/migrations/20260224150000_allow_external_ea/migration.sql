-- AlterTable: Make exportJobId nullable on LiveEAInstance to support external EAs
ALTER TABLE "LiveEAInstance" ALTER COLUMN "exportJobId" DROP NOT NULL;
