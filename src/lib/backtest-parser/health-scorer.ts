/**
 * Backtest Health Scorer — computes a 0-100 health score from parsed metrics.
 *
 * Pure function — no side effects, no DB calls.
 * Uses piecewise linear interpolation per metric with weighted sum.
 *
 * Score ranges:
 *  >= 80: ROBUST (green)
 *  >= 60: MODERATE (yellow)
 *  <  60: WEAK (red)
 */

import type { ParsedMetrics, HealthScoreResult, HealthScoreBreakdown } from "./types";
import { SCORE_WEIGHTS, type ScoreWeight } from "./constants";

/**
 * Piecewise linear interpolation.
 * Given a value and sorted breakpoints [[x1,y1],[x2,y2],...], returns the interpolated y.
 */
function interpolate(value: number, breakpoints: [number, number][]): number {
  if (breakpoints.length === 0) return 0;

  // Below first breakpoint
  if (value <= breakpoints[0][0]) return breakpoints[0][1];

  // Above last breakpoint
  const last = breakpoints[breakpoints.length - 1];
  if (value >= last[0]) return last[1];

  // Find the two surrounding breakpoints
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const [x1, y1] = breakpoints[i];
    const [x2, y2] = breakpoints[i + 1];

    if (value >= x1 && value <= x2) {
      // Linear interpolation
      const ratio = (value - x1) / (x2 - x1);
      return y1 + ratio * (y2 - y1);
    }
  }

  return last[1];
}

/**
 * Score a single metric using its weight configuration.
 */
function scoreMetric(metricName: string, value: number, config: ScoreWeight): HealthScoreBreakdown {
  const rawScore = interpolate(value, config.breakpoints);
  const maxScore = Math.max(...config.breakpoints.map((bp) => bp[1]));

  return {
    metric: metricName,
    value,
    score: Math.round(rawScore * 100) / 100,
    weight: config.weight,
    maxScore,
  };
}

/**
 * Compute the overall health score from parsed backtest metrics.
 * Returns a score (0-100), status, and per-metric breakdown.
 */
export function computeHealthScore(metrics: ParsedMetrics): HealthScoreResult {
  const breakdown: HealthScoreBreakdown[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  // Score each configured metric
  const metricValues: Record<string, number> = {
    profitFactor: metrics.profitFactor,
    maxDrawdownPct: metrics.maxDrawdownPct,
    totalTrades: metrics.totalTrades,
    expectedPayoff: metrics.expectedPayoff,
    winRate: metrics.winRate,
    sharpeRatio: metrics.sharpeRatio ?? 0,
    recoveryFactor: metrics.recoveryFactor ?? 0,
  };

  for (const [metricName, config] of Object.entries(SCORE_WEIGHTS)) {
    const value = metricValues[metricName];
    if (value === undefined || isNaN(value)) continue;

    // Skip metrics with null/unavailable data — redistribute weight
    const isAvailable =
      metricName === "sharpeRatio"
        ? metrics.sharpeRatio !== null
        : metricName === "recoveryFactor"
          ? metrics.recoveryFactor !== null
          : true;

    if (!isAvailable) continue;

    const result = scoreMetric(metricName, value, config);
    breakdown.push(result);
    weightedSum += result.score * config.weight;
    totalWeight += config.weight;
  }

  // Normalize if some metrics were unavailable (total weight < 1.0)
  const normalizedScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;

  // Clamp to 0-100
  const score = Math.max(0, Math.min(100, Math.round(normalizedScore)));

  // Determine status
  let status: HealthScoreResult["status"];
  if (score >= 80) {
    status = "ROBUST";
  } else if (score >= 60) {
    status = "MODERATE";
  } else {
    status = "WEAK";
  }

  return { score, status, breakdown };
}
