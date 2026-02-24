/**
 * Health scoring thresholds — tolerance bands for live vs baseline comparison.
 *
 * Each metric has tolerance, warning, and alarm thresholds expressed as
 * percentage deviation from baseline. Positive = worse performance allowed.
 */

export interface MetricThreshold {
  /** Weight in overall score (sum of all weights = 1.0) */
  weight: number;
  /** Deviation considered acceptable (score = 1.0) */
  tolerance: number;
  /** Deviation that triggers warning (score ~ 0.5) */
  warning: number;
  /** Deviation that triggers alarm (score ~ 0.0) */
  alarm: number;
  /** true = higher is better (return, winRate), false = lower is better (volatility, drawdown) */
  higherIsBetter: boolean;
}

export const THRESHOLDS: Record<string, MetricThreshold> = {
  return: {
    weight: 0.25,
    tolerance: 0.3, // -30% of baseline return
    warning: 0.5, // -50%
    alarm: 0.75, // -75%
    higherIsBetter: true,
  },
  volatility: {
    weight: 0.15,
    tolerance: 0.3, // +30% higher volatility
    warning: 0.6, // +60%
    alarm: 1.0, // +100%
    higherIsBetter: false,
  },
  drawdown: {
    weight: 0.25,
    tolerance: 0.25, // +25% worse drawdown
    warning: 0.5, // +50%
    alarm: 1.0, // +100%
    higherIsBetter: false,
  },
  winRate: {
    weight: 0.2,
    tolerance: 0.15, // -15% win rate
    warning: 0.3, // -30%
    alarm: 0.5, // -50%
    higherIsBetter: true,
  },
  tradeFrequency: {
    weight: 0.15,
    tolerance: 0.4, // -40% fewer trades
    warning: 0.6, // -60%
    alarm: 0.8, // -80%
    higherIsBetter: true,
  },
};

/** Trade count at which tolerance bands are at their base (unscaled) values */
export const REFERENCE_TRADES = 100;

/** Minimum trades required before health assessment is meaningful */
export const MIN_TRADES_FOR_ASSESSMENT = 10;

/** Minimum days of data required */
export const MIN_DAYS_FOR_ASSESSMENT = 7;

/** Minimum time between health evaluations (milliseconds) */
export const HEALTH_EVAL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/** Maximum staleness before on-demand recalculation (milliseconds) */
export const HEALTH_STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
