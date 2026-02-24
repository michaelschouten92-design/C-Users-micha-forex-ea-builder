/**
 * Strategy Health Scorer — pure function that computes health scores.
 *
 * Compares live trading metrics against backtest baseline using tolerance bands.
 * No database queries — microsecond execution time.
 */

import type {
  LiveMetrics,
  BaselineMetrics,
  HealthResult,
  HealthStatusType,
  MetricScore,
} from "./types";
import { THRESHOLDS, MIN_TRADES_FOR_ASSESSMENT, MIN_DAYS_FOR_ASSESSMENT } from "./thresholds";

/**
 * Score a single metric by comparing live value against baseline.
 *
 * Returns 0.0–1.0 where 1.0 = perfect match, 0.0 = at or beyond alarm threshold.
 * Uses smooth interpolation between tolerance bands.
 */
function scoreMetric(liveValue: number, baselineValue: number, thresholdKey: string): number {
  const t = THRESHOLDS[thresholdKey];
  if (!t || baselineValue === 0) return 0.5; // neutral if no baseline

  let deviation: number;

  if (t.higherIsBetter) {
    // For metrics where higher = better: deviation = how much worse live is
    // e.g. return: baseline 10%, live 7% → deviation = (10-7)/10 = 0.3
    deviation = (baselineValue - liveValue) / Math.abs(baselineValue);
  } else {
    // For metrics where lower = better: deviation = how much worse (higher) live is
    // e.g. drawdown: baseline 5%, live 7.5% → deviation = (7.5-5)/5 = 0.5
    deviation = (liveValue - baselineValue) / Math.abs(baselineValue);
  }

  // Negative deviation means live is better than baseline → score 1.0
  if (deviation <= 0) return 1.0;

  // Within tolerance → score 1.0
  if (deviation <= t.tolerance) return 1.0;

  // Between tolerance and warning → interpolate 1.0 → 0.5
  if (deviation <= t.warning) {
    const ratio = (deviation - t.tolerance) / (t.warning - t.tolerance);
    return 1.0 - ratio * 0.5;
  }

  // Between warning and alarm → interpolate 0.5 → 0.0
  if (deviation <= t.alarm) {
    const ratio = (deviation - t.warning) / (t.alarm - t.warning);
    return 0.5 - ratio * 0.5;
  }

  // Beyond alarm → 0.0
  return 0.0;
}

/**
 * Score a metric without baseline — use absolute heuristics.
 */
function scoreMetricAbsolute(liveValue: number, thresholdKey: string): number {
  switch (thresholdKey) {
    case "return":
      // Positive return → good, negative → bad
      if (liveValue >= 0) return Math.min(1.0, 0.7 + liveValue * 0.03);
      return Math.max(0.0, 0.7 + liveValue * 0.02);

    case "volatility":
      // Lower volatility is better; no baseline → use moderate threshold
      return liveValue <= 0.15 ? 1.0 : Math.max(0.0, 1.0 - (liveValue - 0.15) * 2);

    case "drawdown":
      // Lower drawdown is better
      if (liveValue <= 5) return 1.0;
      if (liveValue <= 10) return 0.8;
      if (liveValue <= 20) return 0.5;
      return Math.max(0.0, 0.5 - (liveValue - 20) * 0.02);

    case "winRate":
      // Win rate around 40-60% is typical
      if (liveValue >= 50) return 1.0;
      if (liveValue >= 40) return 0.8;
      if (liveValue >= 30) return 0.5;
      return Math.max(0.0, liveValue / 60);

    case "tradeFrequency":
      // Any trading activity is acceptable without baseline
      return liveValue > 0 ? 0.8 : 0.3;

    default:
      return 0.5;
  }
}

/**
 * Determine health status from overall score.
 */
function determineStatus(overallScore: number): HealthStatusType {
  if (overallScore >= 0.7) return "HEALTHY";
  if (overallScore >= 0.4) return "WARNING";
  return "DEGRADED";
}

/**
 * Compute health assessment from live and baseline metrics.
 * Pure function — no side effects, no DB calls.
 */
export function computeHealth(live: LiveMetrics, baseline: BaselineMetrics | null): HealthResult {
  // Check for insufficient data
  if (live.totalTrades < MIN_TRADES_FOR_ASSESSMENT || live.windowDays < MIN_DAYS_FOR_ASSESSMENT) {
    const emptyMetric = (name: string, weight: number, liveValue: number): MetricScore => ({
      name,
      score: 0,
      weight,
      liveValue,
      baselineValue: null,
    });

    return {
      status: "INSUFFICIENT_DATA",
      overallScore: 0,
      metrics: {
        return: emptyMetric("return", 0.25, live.returnPct),
        volatility: emptyMetric("volatility", 0.15, live.volatility),
        drawdown: emptyMetric("drawdown", 0.25, live.maxDrawdownPct),
        winRate: emptyMetric("winRate", 0.2, live.winRate),
        tradeFrequency: emptyMetric("tradeFrequency", 0.15, live.tradesPerDay),
      },
      live,
      baseline,
    };
  }

  const hasBaseline = baseline !== null;

  // Score each metric
  const returnScore = hasBaseline
    ? scoreMetric(live.returnPct, baseline.returnPct, "return")
    : scoreMetricAbsolute(live.returnPct, "return");

  const baselineVolatility = hasBaseline
    ? (baseline.volatility ?? estimateBaselineVolatility(baseline))
    : null;
  const volatilityScore =
    baselineVolatility !== null
      ? scoreMetric(live.volatility, baselineVolatility, "volatility")
      : scoreMetricAbsolute(live.volatility, "volatility");

  const drawdownScore = hasBaseline
    ? scoreMetric(live.maxDrawdownPct, baseline.maxDrawdownPct, "drawdown")
    : scoreMetricAbsolute(live.maxDrawdownPct, "drawdown");

  const winRateScore = hasBaseline
    ? scoreMetric(live.winRate, baseline.winRate, "winRate")
    : scoreMetricAbsolute(live.winRate, "winRate");

  const tradeFrequencyScore = hasBaseline
    ? scoreMetric(live.tradesPerDay, baseline.tradesPerDay, "tradeFrequency")
    : scoreMetricAbsolute(live.tradesPerDay, "tradeFrequency");

  // Weighted average
  const overallScore =
    returnScore * THRESHOLDS.return.weight +
    volatilityScore * THRESHOLDS.volatility.weight +
    drawdownScore * THRESHOLDS.drawdown.weight +
    winRateScore * THRESHOLDS.winRate.weight +
    tradeFrequencyScore * THRESHOLDS.tradeFrequency.weight;

  const status = determineStatus(overallScore);

  return {
    status,
    overallScore,
    metrics: {
      return: {
        name: "return",
        score: returnScore,
        weight: THRESHOLDS.return.weight,
        liveValue: live.returnPct,
        baselineValue: hasBaseline ? baseline.returnPct : null,
      },
      volatility: {
        name: "volatility",
        score: volatilityScore,
        weight: THRESHOLDS.volatility.weight,
        liveValue: live.volatility,
        baselineValue: baselineVolatility,
      },
      drawdown: {
        name: "drawdown",
        score: drawdownScore,
        weight: THRESHOLDS.drawdown.weight,
        liveValue: live.maxDrawdownPct,
        baselineValue: hasBaseline ? baseline.maxDrawdownPct : null,
      },
      winRate: {
        name: "winRate",
        score: winRateScore,
        weight: THRESHOLDS.winRate.weight,
        liveValue: live.winRate,
        baselineValue: hasBaseline ? baseline.winRate : null,
      },
      tradeFrequency: {
        name: "tradeFrequency",
        score: tradeFrequencyScore,
        weight: THRESHOLDS.tradeFrequency.weight,
        liveValue: live.tradesPerDay,
        baselineValue: hasBaseline ? baseline.tradesPerDay : null,
      },
    },
    live,
    baseline,
  };
}

/**
 * Estimate baseline volatility from Sharpe ratio and return.
 * volatility ≈ |return| / |sharpe| (annualized approximation)
 */
function estimateBaselineVolatility(baseline: BaselineMetrics): number {
  if (Math.abs(baseline.sharpeRatio) < 0.01) return 0.2; // default if sharpe ≈ 0
  return Math.abs(baseline.returnPct / baseline.sharpeRatio) / 100;
}
