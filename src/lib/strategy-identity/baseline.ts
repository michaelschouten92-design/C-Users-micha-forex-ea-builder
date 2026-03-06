/**
 * Backtest baseline creation — populates BacktestBaseline from BacktestRun data.
 *
 * Called during EA export to lock baseline metrics for a strategy version.
 * The baseline enables monitoring drift detection and identity binding hashes.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import {
  extractBaselineMetrics,
  estimateBacktestDuration,
} from "@/lib/strategy-health/baseline-extractor";
import { appendProofEventInTx } from "@/lib/proof/events";
import { computeBaselineHash } from "@/lib/proof/identity-hashing";

const log = logger.child({ module: "strategy-baseline" });

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Parse a BacktestRun period string (e.g. "2020.01.01 - 2024.12.31") into duration in days.
 * Returns null if the format is unrecognizable.
 */
export function parsePeriodDays(period: string): number | null {
  const match = period.match(
    /(\d{4})[.\-/](\d{2})[.\-/](\d{2})\s*[-\u2013]\s*(\d{4})[.\-/](\d{2})[.\-/](\d{2})/
  );
  if (!match) return null;

  const start = new Date(+match[1], +match[2] - 1, +match[3]);
  const end = new Date(+match[4], +match[5] - 1, +match[6]);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return null;

  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface BacktestRunForBaseline {
  id: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number | null;
  initialDeposit: number;
  totalNetProfit: number;
  period: string;
}

/**
 * Create a BacktestBaseline for a strategy version from a BacktestRun.
 *
 * Proof-before-mutation: appends BASELINE_CREATED proof event before writing.
 * Idempotent: if a baseline already exists for the version, returns it
 * without appending a duplicate proof event.
 * Must be called within a transaction after the StrategyVersion is created.
 */
export async function createBaselineFromBacktest(
  tx: TransactionClient,
  strategyId: string,
  strategyVersionId: string,
  backtestRun: BacktestRunForBaseline
): Promise<{ id: string; isNew: boolean }> {
  const existing = await tx.backtestBaseline.findUnique({
    where: { strategyVersionId },
    select: { id: true },
  });
  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const backtestResult = {
    totalTrades: backtestRun.totalTrades,
    winRate: backtestRun.winRate,
    profitFactor: backtestRun.profitFactor,
    maxDrawdown: 0,
    maxDrawdownPercent: backtestRun.maxDrawdownPct,
    netProfit: backtestRun.totalNetProfit,
    sharpeRatio: backtestRun.sharpeRatio ?? 0,
    initialDeposit: backtestRun.initialDeposit,
    finalBalance: backtestRun.initialDeposit + backtestRun.totalNetProfit,
  };

  const periodDays = parsePeriodDays(backtestRun.period);
  const backtestDurationDays = periodDays ?? estimateBacktestDuration(backtestResult);

  const { metrics, raw } = extractBaselineMetrics(backtestResult, backtestDurationDays);

  // Compute deterministic baseline hash before any writes
  const baselineHash = computeBaselineHash({
    totalTrades: raw.totalTrades,
    winRate: raw.winRate,
    profitFactor: raw.profitFactor,
    maxDrawdownPct: raw.maxDrawdownPct,
    avgTradesPerDay: raw.avgTradesPerDay,
    netReturnPct: raw.netReturnPct,
    sharpeRatio: raw.sharpeRatio,
    initialDeposit: raw.initialDeposit,
    backtestDurationDays: raw.backtestDurationDays,
  });

  // Proof-before-mutation: record baseline lock intent before writing the row.
  // If this fails, the baseline row is never created (same tx).
  await appendProofEventInTx(tx, strategyId, "BASELINE_CREATED", {
    recordId: strategyVersionId,
    strategyVersionId,
    backtestRunId: backtestRun.id,
    baselineHash,
  });

  const baseline = await tx.backtestBaseline.create({
    data: {
      strategyVersionId,
      backtestResultId: backtestRun.id,
      totalTrades: raw.totalTrades,
      winRate: raw.winRate,
      profitFactor: raw.profitFactor,
      maxDrawdownPct: raw.maxDrawdownPct,
      avgTradesPerDay: raw.avgTradesPerDay,
      netReturnPct: raw.netReturnPct,
      sharpeRatio: raw.sharpeRatio,
      volatility: metrics.volatility ?? null,
      initialDeposit: raw.initialDeposit,
      backtestDurationDays: raw.backtestDurationDays,
      rawMetrics: raw as unknown as Prisma.InputJsonValue,
    },
  });

  log.info(
    { strategyVersionId, baselineId: baseline.id, backtestRunId: backtestRun.id, baselineHash },
    "Backtest baseline created"
  );

  return { id: baseline.id, isNew: true };
}
