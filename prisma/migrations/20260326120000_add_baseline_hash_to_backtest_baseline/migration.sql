-- AlterTable: add baselineHash column to BacktestBaseline
-- Default empty string for existing rows; new rows will have the computed hash.
ALTER TABLE "BacktestBaseline" ADD COLUMN "baselineHash" TEXT NOT NULL DEFAULT '';
