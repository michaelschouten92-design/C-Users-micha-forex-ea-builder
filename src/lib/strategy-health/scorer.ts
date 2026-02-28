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
  ConfidenceInterval,
  DriftInfo,
} from "./types";
import { computeCusum } from "./drift-detector";
import {
  THRESHOLDS,
  MIN_TRADES_FOR_ASSESSMENT,
  MIN_DAYS_FOR_ASSESSMENT,
  REFERENCE_TRADES,
  HEALTHY_THRESHOLD,
  WARNING_THRESHOLD,
  HYSTERESIS_MARGIN,
  CONFIDENCE_BASE_MARGIN,
  CUSUM_SCORER_MIN_RETURNS,
} from "./thresholds";

/**
 * Compute confidence multiplier for tolerance bands based on sample size.
 * At low N, bands widen to prevent false alarms from sampling noise.
 * At REFERENCE_TRADES (100) or above, bands are at their base values.
 *
 * Formula: max(1, sqrt(REFERENCE_TRADES / N))
 *   N=10:  multiplier = 3.16  (very wide — high uncertainty)
 *   N=30:  multiplier = 1.83
 *   N=50:  multiplier = 1.41
 *   N=100: multiplier = 1.00  (base tolerance)
 *   N=500: multiplier = 1.00  (don't tighten beyond base)
 */
function confidenceMultiplier(totalTrades: number): number {
  if (totalTrades >= REFERENCE_TRADES) return 1.0;
  return Math.sqrt(REFERENCE_TRADES / Math.max(totalTrades, 1));
}

/**
 * Score a single metric by comparing live value against baseline.
 *
 * Returns 0.0–1.0 where 1.0 = perfect match, 0.0 = at or beyond alarm threshold.
 * Uses smooth interpolation between tolerance bands, scaled by sample size.
 */
function scoreMetric(
  liveValue: number,
  baselineValue: number,
  thresholdKey: string,
  totalTrades: number
): number {
  const t = THRESHOLDS[thresholdKey];
  if (!t || baselineValue === 0) return 0.5; // neutral if no baseline

  // Scale tolerance bands wider when sample size is small
  const cm = confidenceMultiplier(totalTrades);
  const tolerance = t.tolerance * cm;
  const warning = t.warning * cm;
  const alarm = t.alarm * cm;

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
  if (deviation <= tolerance) return 1.0;

  // Between tolerance and warning → interpolate 1.0 → 0.5
  if (deviation <= warning) {
    const ratio = (deviation - tolerance) / (warning - tolerance);
    return 1.0 - ratio * 0.5;
  }

  // Between warning and alarm → interpolate 0.5 → 0.0
  if (deviation <= alarm) {
    const ratio = (deviation - warning) / (alarm - warning);
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
 * Determine health status from overall score with hysteresis.
 *
 * To transition DOWN (degrade), score must drop below threshold - margin.
 * To transition UP (improve), score must rise above threshold + margin.
 * This prevents flapping when score oscillates near a boundary.
 */
function determineStatus(
  overallScore: number,
  previousStatus?: HealthStatusType
): HealthStatusType {
  // Without previous status, use simple thresholds
  if (!previousStatus || previousStatus === "INSUFFICIENT_DATA") {
    if (overallScore >= HEALTHY_THRESHOLD) return "HEALTHY";
    if (overallScore >= WARNING_THRESHOLD) return "WARNING";
    return "DEGRADED";
  }

  // Apply hysteresis based on current status
  if (previousStatus === "HEALTHY") {
    // Must drop below threshold - margin to degrade to WARNING
    if (overallScore < HEALTHY_THRESHOLD - HYSTERESIS_MARGIN) {
      return overallScore >= WARNING_THRESHOLD - HYSTERESIS_MARGIN ? "WARNING" : "DEGRADED";
    }
    return "HEALTHY";
  }

  if (previousStatus === "WARNING") {
    // Must rise above threshold + margin to improve to HEALTHY
    if (overallScore >= HEALTHY_THRESHOLD + HYSTERESIS_MARGIN) return "HEALTHY";
    // Must drop below threshold - margin to degrade to DEGRADED
    if (overallScore < WARNING_THRESHOLD - HYSTERESIS_MARGIN) return "DEGRADED";
    return "WARNING";
  }

  // previousStatus === "DEGRADED"
  // Must rise above threshold + margin to improve to WARNING
  if (overallScore >= WARNING_THRESHOLD + HYSTERESIS_MARGIN) {
    return overallScore >= HEALTHY_THRESHOLD + HYSTERESIS_MARGIN ? "HEALTHY" : "WARNING";
  }
  return "DEGRADED";
}

/**
 * Compute confidence interval on the overall score based on trade count.
 *
 * Margin = BASE_MARGIN * sqrt(REFERENCE_TRADES / N)
 *   N=10:  ±0.316 (very wide)
 *   N=30:  ±0.183
 *   N=100: ±0.10  (base margin)
 *   N=500: ±0.045
 */
function computeConfidenceInterval(overallScore: number, totalTrades: number): ConfidenceInterval {
  const margin = CONFIDENCE_BASE_MARGIN * Math.sqrt(REFERENCE_TRADES / Math.max(totalTrades, 1));
  return {
    lower: Math.max(0, overallScore - margin),
    upper: Math.min(1, overallScore + margin),
  };
}

/**
 * Compute health assessment from live and baseline metrics.
 * Pure function — no side effects, no DB calls.
 *
 * @param previousStatus - Previous health status for hysteresis (prevents flapping)
 */
export function computeHealth(
  live: LiveMetrics,
  baseline: BaselineMetrics | null,
  previousStatus?: HealthStatusType
): HealthResult {
  const noDrift: DriftInfo = { cusumValue: 0, driftDetected: false, driftSeverity: 0 };

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
      confidenceInterval: { lower: 0, upper: 0 },
      drift: noDrift,
      primaryDriver: null,
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
  const N = live.totalTrades;

  // Score each metric (tolerance bands scale with sample size)
  const returnScore = hasBaseline
    ? scoreMetric(live.returnPct, baseline.returnPct, "return", N)
    : scoreMetricAbsolute(live.returnPct, "return");

  const baselineVolatility = hasBaseline
    ? (baseline.volatility ?? estimateBaselineVolatility(baseline))
    : null;
  const volatilityScore =
    baselineVolatility !== null
      ? scoreMetric(live.volatility, baselineVolatility, "volatility", N)
      : scoreMetricAbsolute(live.volatility, "volatility");

  const drawdownScore = hasBaseline
    ? scoreMetric(live.maxDrawdownPct, baseline.maxDrawdownPct, "drawdown", N)
    : scoreMetricAbsolute(live.maxDrawdownPct, "drawdown");

  const winRateScore = hasBaseline
    ? scoreMetric(live.winRate, baseline.winRate, "winRate", N)
    : scoreMetricAbsolute(live.winRate, "winRate");

  const tradeFrequencyScore = hasBaseline
    ? scoreMetric(live.tradesPerDay, baseline.tradesPerDay, "tradeFrequency", N)
    : scoreMetricAbsolute(live.tradesPerDay, "tradeFrequency");

  // Weighted average
  const overallScore =
    returnScore * THRESHOLDS.return.weight +
    volatilityScore * THRESHOLDS.volatility.weight +
    drawdownScore * THRESHOLDS.drawdown.weight +
    winRateScore * THRESHOLDS.winRate.weight +
    tradeFrequencyScore * THRESHOLDS.tradeFrequency.weight;

  const status = determineStatus(overallScore, previousStatus);
  const confidenceInterval = computeConfidenceInterval(overallScore, N);

  // CUSUM drift detection: compare live expectancy against baseline
  let drift: DriftInfo = noDrift;
  if (hasBaseline && live.tradeReturns.length >= CUSUM_SCORER_MIN_RETURNS) {
    const expectedMean =
      baseline.tradesPerDay > 0
        ? baseline.returnPct / 30 / baseline.tradesPerDay
        : baseline.returnPct / Math.max(live.totalTrades, 1);
    // Estimate std dev from the trade returns
    const mean = live.tradeReturns.reduce((a, b) => a + b, 0) / live.tradeReturns.length;
    const variance =
      live.tradeReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (live.tradeReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    const cusum = computeCusum(live.tradeReturns, expectedMean, stdDev);
    drift = {
      cusumValue: cusum.cusumValue,
      driftDetected: cusum.driftDetected,
      driftSeverity: cusum.driftSeverity,
    };
  }

  const allMetrics: HealthResult["metrics"] = {
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
  };

  return {
    status,
    overallScore,
    confidenceInterval,
    drift,
    primaryDriver: computePrimaryDriver(allMetrics, hasBaseline),
    metrics: allMetrics,
    live,
    baseline,
  };
}

const METRIC_DISPLAY_NAMES: Record<string, string> = {
  return: "Return",
  volatility: "Volatility",
  drawdown: "Drawdown",
  winRate: "Win rate",
  tradeFrequency: "Trade frequency",
};

/**
 * Identify the metric contributing most to score drag.
 * Returns a human-readable explanation string.
 */
function computePrimaryDriver(
  metrics: HealthResult["metrics"],
  hasBaseline: boolean
): string | null {
  let worstName = "";
  let worstWeightedLoss = 0;

  for (const key of Object.keys(metrics) as Array<keyof typeof metrics>) {
    const m = metrics[key];
    // Weighted loss = weight * (1 - score). Higher = more drag.
    const weightedLoss = m.weight * (1 - m.score);
    if (weightedLoss > worstWeightedLoss) {
      worstWeightedLoss = weightedLoss;
      worstName = key;
    }
  }

  if (!worstName || worstWeightedLoss < 0.01) return null;

  const m = metrics[worstName as keyof typeof metrics];
  const label = METRIC_DISPLAY_NAMES[worstName] || worstName;
  const scorePct = Math.round(m.score * 100);

  if (hasBaseline && m.baselineValue !== null) {
    return `${label} is the primary factor (score: ${scorePct}%)`;
  }
  return `${label} is the primary factor (score: ${scorePct}%)`;
}

/**
 * Estimate baseline volatility from Sharpe ratio and return.
 * volatility ≈ |return| / |sharpe| (annualized approximation)
 */
function estimateBaselineVolatility(baseline: BaselineMetrics): number {
  if (Math.abs(baseline.sharpeRatio) < 0.01) return 0.2; // default if sharpe ≈ 0
  return Math.abs(baseline.returnPct / baseline.sharpeRatio) / 100;
}
