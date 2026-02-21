-- DropForeignKey
ALTER TABLE "BacktestBaseline" DROP CONSTRAINT "BacktestBaseline_backtestResultId_fkey";

-- DropForeignKey
ALTER TABLE "BacktestResult" DROP CONSTRAINT "BacktestResult_projectId_fkey";

-- DropForeignKey
ALTER TABLE "BacktestResult" DROP CONSTRAINT "BacktestResult_userId_fkey";

-- AlterTable
ALTER TABLE "BacktestBaseline" ALTER COLUMN "backtestResultId" DROP NOT NULL;

-- DropTable
DROP TABLE "BacktestResult";
