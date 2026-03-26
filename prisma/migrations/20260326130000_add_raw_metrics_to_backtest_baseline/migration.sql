-- AlterTable: add rawMetrics column to BacktestBaseline
-- Default empty JSON object for existing rows; new rows receive computed metrics.
ALTER TABLE "BacktestBaseline" ADD COLUMN "rawMetrics" JSONB NOT NULL DEFAULT '{}';
