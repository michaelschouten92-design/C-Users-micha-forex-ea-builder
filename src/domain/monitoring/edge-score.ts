/**
 * Edge Score — live trading performance vs backtest baseline.
 *
 * Returns a weighted composite percentage where 100% = matching baseline.
 * Can exceed 100% when live outperforms the backtest.
 *
 * Pure function, zero IO — follows the same pattern as live-metrics.ts.
 */

// ── Types ──────────────────────────────────────────────────

export interface EdgeScoreLiveInput {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  grossProfit: number;
  grossLoss: number;
  maxDrawdownPct: number;
  totalProfit: number;
  balance: number;
}

export interface EdgeScoreBaselineInput {
  winRate: number; // 0–1 decimal
  profitFactor: number;
  maxDrawdownPct: number;
  netReturnPct: number;
  initialDeposit: number;
}

export type EdgePhase = "COLLECTING" | "EARLY" | "FULL";

export interface MetricRatio {
  live: number;
  baseline: number;
  ratio: number;
  weight: number;
}

export interface EdgeScoreBreakdown {
  profitFactor: MetricRatio;
  winRate: MetricRatio;
  drawdown: MetricRatio;
  returnPct: MetricRatio;
}

export interface EdgeScoreResult {
  phase: EdgePhase;
  score: number | null; // null when COLLECTING
  tradesCompleted: number;
  tradesRequired: number;
  breakdown: EdgeScoreBreakdown | null; // null when COLLECTING
}

// ── Constants ──────────────────────────────────────────────

const COLLECTING_THRESHOLD = 10;
const EARLY_THRESHOLD = 20;
const RATIO_CAP = 2.0;

const WEIGHTS = {
  profitFactor: 0.35,
  winRate: 0.3,
  drawdown: 0.2,
  returnPct: 0.15,
} as const;

// ── Helpers ────────────────────────────────────────────────

function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return RATIO_CAP;
  return Math.max(0, Math.min(ratio, RATIO_CAP));
}

/**
 * Compute ratio for a "higher is better" metric.
 * Returns null if baseline is 0 (metric should be skipped).
 */
function higherIsBetter(live: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return clampRatio(live / baseline);
}

/**
 * Compute ratio for a "lower is better" metric (e.g. drawdown).
 * Returns null if baseline is 0 (metric should be skipped).
 */
function lowerIsBetter(live: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  if (live <= 0) return RATIO_CAP; // no drawdown = best possible
  return clampRatio(baseline / live);
}

// ── Main ───────────────────────────────────────────────────

export function computeEdgeScore(
  live: EdgeScoreLiveInput,
  baseline: EdgeScoreBaselineInput
): EdgeScoreResult {
  const tradesCompleted = live.totalTrades;

  // Phase: COLLECTING — not enough trades for any score
  if (tradesCompleted < COLLECTING_THRESHOLD) {
    return {
      phase: "COLLECTING",
      score: null,
      tradesCompleted,
      tradesRequired: COLLECTING_THRESHOLD,
      breakdown: null,
    };
  }

  // Compute live metrics from running state
  const liveWinRate = tradesCompleted > 0 ? live.winCount / tradesCompleted : 0;
  const liveProfitFactor =
    live.grossLoss > 0 ? live.grossProfit / live.grossLoss : live.grossProfit > 0 ? Infinity : 0;
  const liveMaxDD = live.maxDrawdownPct;
  const liveReturnPct =
    baseline.initialDeposit > 0
      ? ((live.balance - baseline.initialDeposit) / baseline.initialDeposit) * 100
      : 0;

  // Compute ratios (null = skip metric, redistribute weight)
  const ratios: { key: keyof typeof WEIGHTS; ratio: number | null; live: number; bl: number }[] = [
    {
      key: "profitFactor",
      ratio: higherIsBetter(liveProfitFactor, baseline.profitFactor),
      live: liveProfitFactor === Infinity ? RATIO_CAP * baseline.profitFactor : liveProfitFactor,
      bl: baseline.profitFactor,
    },
    {
      key: "winRate",
      ratio: higherIsBetter(liveWinRate, baseline.winRate),
      live: liveWinRate,
      bl: baseline.winRate,
    },
    {
      key: "drawdown",
      ratio: lowerIsBetter(liveMaxDD, baseline.maxDrawdownPct),
      live: liveMaxDD,
      bl: baseline.maxDrawdownPct,
    },
    {
      key: "returnPct",
      ratio: higherIsBetter(liveReturnPct, baseline.netReturnPct),
      live: liveReturnPct,
      bl: baseline.netReturnPct,
    },
  ];

  // Filter valid metrics and redistribute weight
  const validMetrics = ratios.filter((r) => r.ratio !== null);
  if (validMetrics.length === 0) {
    // No comparable metrics (all baseline values ≤ 0 or invalid).
    // Return null score instead of inflated 100 — baseline is not meaningful.
    return {
      phase: "COLLECTING" as const,
      score: null,
      tradesCompleted,
      tradesRequired: COLLECTING_THRESHOLD,
      breakdown: null,
    };
  }

  const totalWeight = validMetrics.reduce((sum, r) => sum + WEIGHTS[r.key], 0);
  const weightScale = totalWeight > 0 ? 1 / totalWeight : 0;

  // Build breakdown with redistributed weights
  const breakdownEntries: [string, MetricRatio][] = ratios.map((r) => [
    r.key,
    {
      live: r.live,
      baseline: r.bl,
      ratio: r.ratio ?? 0,
      weight: r.ratio !== null ? WEIGHTS[r.key] * weightScale : 0,
    },
  ]);

  const breakdown = Object.fromEntries(breakdownEntries) as unknown as EdgeScoreBreakdown;

  // Weighted composite
  const score =
    validMetrics.reduce((sum, r) => sum + r.ratio! * WEIGHTS[r.key] * weightScale, 0) * 100;

  const phase: EdgePhase = tradesCompleted < EARLY_THRESHOLD ? "EARLY" : "FULL";

  return {
    phase,
    score: Math.round(score * 10) / 10, // 1 decimal
    tradesCompleted,
    tradesRequired: COLLECTING_THRESHOLD,
    breakdown,
  };
}
