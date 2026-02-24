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
 *
 * Hard rules applied BEFORE weighted score:
 *  - totalTrades < 30 → INSUFFICIENT_DATA (score capped at 0)
 *  - totalTrades < 100 → status capped at MODERATE (score capped at 79)
 *  - maxDrawdownPct == 0 with totalTrades > 0 → excluded from scoring + warning
 *  - NaN or Infinity in any metric → excluded from scoring + warning
 */

import type { ParsedMetrics, HealthScoreResult, HealthScoreBreakdown } from "./types";
import {
  SCORE_WEIGHTS,
  HEALTH_SCORE_VERSION,
  PROP_FIRM_DD_BREAKPOINTS,
  type ScoreWeight,
  type ScoringMode,
} from "./constants";

/** Minimum trades for any meaningful score. Below this → INSUFFICIENT_DATA. */
const MIN_TRADES_FOR_SCORING = 30;

/** Trades below this cap the max status to MODERATE. */
const MIN_TRADES_FOR_ROBUST = 100;

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
 * Check if a number is finite and not NaN.
 */
function isValidNumber(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n);
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
 * Compute confidence interval for a health score based on trade count.
 * Fewer trades → wider interval. Uses sqrt(N) scaling with 100 trades as reference.
 * At 100 trades: ±10 points. At 30 trades: ±18 points. At 500 trades: ±4 points.
 */
function computeConfidenceInterval(
  score: number,
  totalTrades: number
): { lower: number; upper: number } {
  const REFERENCE_TRADES = 100;
  const BASE_MARGIN = 10;
  const margin =
    BASE_MARGIN * Math.sqrt(REFERENCE_TRADES / Math.max(MIN_TRADES_FOR_SCORING, totalTrades));
  return {
    lower: Math.max(0, Math.round(score - margin)),
    upper: Math.min(100, Math.round(score + margin)),
  };
}

/**
 * Compute the overall health score from parsed backtest metrics.
 * Returns a score (0-100), status, per-metric breakdown, and warnings.
 *
 * @param metrics - Parsed backtest metrics
 * @param initialDeposit - Initial deposit from backtest metadata (used to normalize expectedPayoff).
 *   Pass 0 if unknown — expectedPayoff will be excluded from scoring with a warning.
 * @param mode - Scoring mode. "propFirm" uses tighter drawdown breakpoints (5-10% limits).
 *
 * Safety-critical: no silent NaN propagation, no inflated scores from missing data.
 */
export function computeHealthScore(
  metrics: ParsedMetrics,
  initialDeposit: number = 0,
  mode: ScoringMode = "default"
): HealthScoreResult {
  const breakdown: HealthScoreBreakdown[] = [];
  const warnings: string[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  // ─── Hard rule: minimum trades ───────────────────────────────
  if (metrics.totalTrades < MIN_TRADES_FOR_SCORING) {
    warnings.push(
      `Only ${metrics.totalTrades} trades — minimum ${MIN_TRADES_FOR_SCORING} required for a meaningful health score. Results are statistically unreliable.`
    );
    return {
      score: 0,
      status: "INSUFFICIENT_DATA",
      breakdown: [],
      warnings,
      version: HEALTH_SCORE_VERSION,
      confidenceInterval: { lower: 0, upper: 0 },
    };
  }

  // ─── Normalize expectedPayoff to % of initial deposit ────────
  let normalizedPayoff: number | null = metrics.expectedPayoff;
  if (initialDeposit > 0 && metrics.expectedPayoff !== 0) {
    normalizedPayoff = (metrics.expectedPayoff / initialDeposit) * 100;
  } else if (initialDeposit <= 0 && metrics.expectedPayoff !== 0) {
    warnings.push(
      "Initial deposit is unknown — expected payoff cannot be normalized. Excluded from scoring."
    );
    normalizedPayoff = null;
  }

  // ─── Build metric values map with validation ─────────────────
  const metricValues: Record<string, number | null> = {
    profitFactor: metrics.profitFactor,
    maxDrawdownPct: metrics.maxDrawdownPct,
    totalTrades: metrics.totalTrades,
    expectedPayoff: normalizedPayoff,
    winRate: metrics.winRate,
    sharpeRatio: metrics.sharpeRatio,
    recoveryFactor: metrics.recoveryFactor,
  };

  for (const [metricName, config] of Object.entries(SCORE_WEIGHTS)) {
    const rawValue = metricValues[metricName];

    // ─── Skip null metrics (Sharpe, Recovery when missing) ────
    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    // ─── Guard: NaN / Infinity → exclude + warn ──────────────
    if (!isValidNumber(rawValue)) {
      warnings.push(`${metricName} has an invalid value (${rawValue}). Excluded from scoring.`);
      continue;
    }

    // ─── Guard: maxDrawdownPct = 0 with trades > 0 → suspicious ─
    if (metricName === "maxDrawdownPct" && rawValue === 0 && metrics.totalTrades > 0) {
      warnings.push(
        "Max drawdown is 0% despite having trades. This is unusual and may indicate a parsing issue. Drawdown excluded from scoring to avoid inflating the health score."
      );
      continue;
    }

    // In prop firm mode, override DD breakpoints with tighter limits
    const effectiveConfig =
      mode === "propFirm" && metricName === "maxDrawdownPct"
        ? { ...config, breakpoints: PROP_FIRM_DD_BREAKPOINTS }
        : config;

    const result = scoreMetric(metricName, rawValue, effectiveConfig);
    breakdown.push(result);
    weightedSum += result.score * effectiveConfig.weight;
    totalWeight += effectiveConfig.weight;
  }

  // ─── Guard: no scoreable metrics ────────────────────────────
  if (totalWeight === 0 || breakdown.length === 0) {
    warnings.push("No metrics could be scored. The report may be incomplete or malformed.");
    return {
      score: 0,
      status: "WEAK",
      breakdown: [],
      warnings,
      version: HEALTH_SCORE_VERSION,
      confidenceInterval: { lower: 0, upper: 0 },
    };
  }

  // ─── Compute normalized score ───────────────────────────────
  const normalizedScore = Math.round((weightedSum / totalWeight) * 100) / 100;

  // Clamp to 0-100
  let score = Math.max(0, Math.min(100, Math.round(normalizedScore)));

  // ─── Hard rule: low trade count caps status ─────────────────
  if (metrics.totalTrades < MIN_TRADES_FOR_ROBUST && score >= 80) {
    score = 79;
    warnings.push(
      `Score capped to 79 (MODERATE). With only ${metrics.totalTrades} trades, ` +
        `a ROBUST classification requires at least ${MIN_TRADES_FOR_ROBUST} trades.`
    );
  }

  // ─── Red flag: outlier dependency ───────────────────────────
  // Threshold scales with trade count: stricter with more trades.
  // 30 trades → ~27%, 100 → 15%, 500 → ~7% (clamped to 10%-50% range).
  if (metrics.largestProfitTrade !== undefined && metrics.totalNetProfit > 0) {
    const outlierThreshold = Math.min(0.5, Math.max(0.1, 1.5 / Math.sqrt(metrics.totalTrades)));
    if (metrics.largestProfitTrade > metrics.totalNetProfit * outlierThreshold) {
      const pct = ((metrics.largestProfitTrade / metrics.totalNetProfit) * 100).toFixed(0);
      warnings.push(
        `Largest winning trade accounts for ${pct}% of total net profit ` +
          `(threshold: ${(outlierThreshold * 100).toFixed(0)}% for ${metrics.totalTrades} trades). ` +
          "Strategy performance depends heavily on a single outlier trade."
      );
    }
  }

  // ─── Red flag: too-good-to-be-true Sharpe ───────────────────
  if (metrics.sharpeRatio !== null && metrics.sharpeRatio > 2.5 && metrics.totalTrades < 200) {
    warnings.push(
      `Sharpe ratio (${metrics.sharpeRatio.toFixed(2)}) is unusually high with only ${metrics.totalTrades} trades. ` +
        "This is a common signature of overfitting or an insufficiently long backtest period."
    );
  }

  // ─── Red flag: martingale / blow-up risk ────────────────────
  if (
    metrics.winRate > 80 &&
    metrics.avgProfitTrade !== undefined &&
    metrics.avgLossTrade !== undefined &&
    metrics.avgLossTrade !== 0 &&
    Math.abs(metrics.avgLossTrade) > 3 * metrics.avgProfitTrade
  ) {
    warnings.push(
      "High win rate (>80%) with average loss exceeding 3x average win. " +
        "This pattern is characteristic of martingale or grid strategies that can suffer catastrophic drawdowns."
    );
  }

  // ─── Red flag: profit factor suspiciously high with few trades ─
  if (metrics.profitFactor > 5 && metrics.totalTrades < 50) {
    warnings.push(
      `Profit factor (${metrics.profitFactor.toFixed(2)}) is extremely high with only ${metrics.totalTrades} trades. ` +
        "This is likely due to insufficient sample size rather than a genuine edge."
    );
  }

  // ─── Prop firm mode: hard-fail warnings ────────────────────
  if (mode === "propFirm") {
    if (metrics.maxDrawdownPct > 10) {
      warnings.push(
        `Max drawdown (${metrics.maxDrawdownPct.toFixed(1)}%) exceeds the typical 10% prop firm limit. ` +
          "Most prop firms (FTMO, MFF, TFT) would terminate this account."
      );
    } else if (metrics.maxDrawdownPct > 5) {
      warnings.push(
        `Max drawdown (${metrics.maxDrawdownPct.toFixed(1)}%) exceeds the typical 5% daily drawdown limit. ` +
          "Consider tighter risk management for prop firm compliance."
      );
    }
  }

  // ─── Determine status ──────────────────────────────────────
  let status: HealthScoreResult["status"];
  if (score >= 80) {
    status = "ROBUST";
  } else if (score >= 60) {
    status = "MODERATE";
  } else {
    status = "WEAK";
  }

  return {
    score,
    status,
    breakdown,
    warnings,
    version: HEALTH_SCORE_VERSION,
    confidenceInterval: computeConfidenceInterval(score, metrics.totalTrades),
  };
}
