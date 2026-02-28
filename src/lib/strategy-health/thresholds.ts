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

// ============================================
// STRATEGY LIFECYCLE THRESHOLDS
// ============================================

/** Consecutive HEALTHY evaluations needed before PROVING → PROVEN */
export const PROVEN_CONSECUTIVE_HEALTHY = 5;
/** Minimum total trades before a strategy can become PROVEN */
export const PROVEN_MIN_TRADES = 30;
/** Consecutive DEGRADED evaluations that trigger automatic retirement */
export const RETIRED_CONSECUTIVE_DEGRADED = 5;

// ============================================
// MONITORING: BASELINE NORMALIZATION
// ============================================

/** Decay applied to backtest returns when setting live expectations.
 *  0.75 = expect 75% of backtest performance. Accounts for natural
 *  slippage, spread widening, and overfitting bias in backtests. */
export const BASELINE_RETURN_DECAY = 0.75;

// ============================================
// MONITORING: CUSUM DRIFT DETECTION
// ============================================

/** Minimum trades before CUSUM drift detection activates.
 *  Below this, sample variance is too noisy for reliable detection. */
export const CUSUM_MIN_TRADES = 20;

/** CUSUM allowance factor: k = factor × σ.
 *  At 0.5, CUSUM detects sustained mean shifts of ~1σ magnitude. */
export const CUSUM_ALLOWANCE_FACTOR = 0.5;

/** CUSUM decision threshold factor: h = factor × σ.
 *  At k=0.5σ, h=4σ gives ARL₀ ≈ 100+ observations before false alarm. */
export const CUSUM_DECISION_FACTOR = 4;

// ============================================
// VERIFICATION: HEALTH STATUS BOUNDARIES
// ============================================

/** Overall score at or above this = HEALTHY status */
export const HEALTHY_THRESHOLD = 0.7;

/** Overall score at or above this (but below HEALTHY_THRESHOLD) = WARNING.
 *  Below this = DEGRADED. */
export const WARNING_THRESHOLD = 0.4;

/** Hysteresis margin applied to status boundaries.
 *  Prevents flapping when score oscillates near a threshold:
 *  degrade requires score < threshold - margin,
 *  improve requires score > threshold + margin. */
export const HYSTERESIS_MARGIN = 0.05;

/** Base ± margin for score confidence interval at REFERENCE_TRADES (100).
 *  Widens as sqrt(REFERENCE_TRADES / N) for smaller samples. */
export const CONFIDENCE_BASE_MARGIN = 0.1;

/** Minimum trade returns before CUSUM is attempted during scoring.
 *  Lower than CUSUM_MIN_TRADES because computeCusum handles its own
 *  minimum internally — this is a cheap pre-check to avoid unnecessary work. */
export const CUSUM_SCORER_MIN_RETURNS = 5;
