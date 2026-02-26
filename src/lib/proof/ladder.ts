/**
 * Ladder Level computation — determines strategy trust level.
 *
 * Levels (ascending trust):
 *   SUBMITTED      — has backtest data or project configuration
 *   VALIDATED      — health score + Monte Carlo survival above thresholds + min trades
 *   VERIFIED       — live trade hash chain active with min live trades + integrity checks pass
 *   PROVEN         — verified for min days + stability maintained + drawdown within limits
 *   INSTITUTIONAL  — disabled (future: third-party audit)
 *
 * All thresholds are configurable via ProofThreshold DB table with env fallbacks.
 */

import type { LadderLevel } from "@prisma/client";

// ============================================
// Default thresholds (overridable via DB or env)
// ============================================

export const DEFAULT_THRESHOLDS = {
  VALIDATED_MIN_SCORE: 50, // BacktestRun.healthScore minimum
  VALIDATED_MIN_SURVIVAL: 0.7, // Monte Carlo survival rate (0–1)
  MIN_TRADES_VALIDATION: 100, // Minimum trades in backtest
  MIN_LIVE_TRADES_VERIFIED: 50, // Minimum live trades for VERIFIED
  MIN_LIVE_DAYS_PROVEN: 90, // Minimum live days for PROVEN
  PROVEN_MAX_DRAWDOWN_PCT: 30, // Max drawdown % allowed for PROVEN
  PROVEN_MIN_SCORE_STABILITY: 40, // Health score must stay above this for PROVEN
  HUB_MIN_TRADES: 50, // Minimum trades to appear on recognition hub
  HUB_MIN_DAYS: 14, // Minimum days to appear on recognition hub
} as const;

export type ThresholdKey = keyof typeof DEFAULT_THRESHOLDS;

/** Resolved thresholds (DB overrides merged with defaults) */
export type Thresholds = Record<ThresholdKey, number>;

export function mergeThresholds(dbOverrides: Array<{ key: string; value: number }>): Thresholds {
  const result = { ...DEFAULT_THRESHOLDS } as Record<string, number>;
  for (const override of dbOverrides) {
    if (override.key in DEFAULT_THRESHOLDS) {
      result[override.key] = override.value;
    }
  }
  return result as Thresholds;
}

// ============================================
// Ladder Input — all data needed for computation
// ============================================

export interface LadderInput {
  /** Does the strategy have at least one backtest upload or build version? */
  hasBacktest: boolean;
  /** Best backtest health score (0–100), null if no backtest */
  backtestHealthScore: number | null;
  /** Monte Carlo survival rate from validationResult (0–1), null if not computed */
  monteCarloSurvival: number | null;
  /** Total trades in the backtest */
  backtestTrades: number;
  /** Is live trade hash chain enabled (TrackRecordState exists)? */
  hasLiveChain: boolean;
  /** Total live trades from TrackRecordState */
  liveTrades: number;
  /** Is the hash chain intact (no broken links)? */
  chainIntegrity: boolean;
  /** Days since live instance was created, null if no live instance */
  liveDays: number | null;
  /** Latest live health score (0–1 scale from HealthSnapshot.overallScore), null if none */
  liveHealthScore: number | null;
  /** Live max drawdown percentage */
  liveMaxDrawdownPct: number | null;
  /** Has the score ever severely collapsed? (e.g., dropped below stability threshold) */
  scoreCollapsed: boolean;
}

// ============================================
// Compute ladder level
// ============================================

export function computeLadderLevel(
  input: LadderInput,
  thresholds: Thresholds = DEFAULT_THRESHOLDS
): LadderLevel {
  // PROVEN: VERIFIED + time + stability
  if (
    isVerified(input, thresholds) &&
    input.liveDays !== null &&
    input.liveDays >= thresholds.MIN_LIVE_DAYS_PROVEN &&
    !input.scoreCollapsed &&
    (input.liveMaxDrawdownPct === null ||
      input.liveMaxDrawdownPct <= thresholds.PROVEN_MAX_DRAWDOWN_PCT) &&
    (input.liveHealthScore === null ||
      input.liveHealthScore * 100 >= thresholds.PROVEN_MIN_SCORE_STABILITY)
  ) {
    return "PROVEN";
  }

  // VERIFIED: live chain + min trades + integrity
  if (isVerified(input, thresholds)) {
    return "VERIFIED";
  }

  // VALIDATED: health score + Monte Carlo + trades
  if (isValidated(input, thresholds)) {
    return "VALIDATED";
  }

  // SUBMITTED: has any backtest
  if (input.hasBacktest) {
    return "SUBMITTED";
  }

  return "SUBMITTED";
}

function isValidated(input: LadderInput, t: Thresholds): boolean {
  return (
    input.backtestHealthScore !== null &&
    input.backtestHealthScore >= t.VALIDATED_MIN_SCORE &&
    input.monteCarloSurvival !== null &&
    input.monteCarloSurvival >= t.VALIDATED_MIN_SURVIVAL &&
    input.backtestTrades >= t.MIN_TRADES_VALIDATION
  );
}

function isVerified(input: LadderInput, t: Thresholds): boolean {
  return (
    isValidated(input, t) &&
    input.hasLiveChain &&
    input.liveTrades >= t.MIN_LIVE_TRADES_VERIFIED &&
    input.chainIntegrity
  );
}

// ============================================
// Level metadata for display
// ============================================

export const LADDER_META: Record<
  LadderLevel,
  { label: string; color: string; description: string; icon: string }
> = {
  SUBMITTED: {
    label: "Submitted",
    color: "#7C8DB0",
    description: "Strategy has been submitted with backtest data",
    icon: "upload",
  },
  VALIDATED: {
    label: "Validated",
    color: "#6366F1",
    description: "Passed health evaluation and Monte Carlo validation",
    icon: "check-circle",
  },
  VERIFIED: {
    label: "Verified",
    color: "#10B981",
    description: "Live trades cryptographically verified on-chain",
    icon: "shield-check",
  },
  PROVEN: {
    label: "Proven",
    color: "#F59E0B",
    description: "Sustained live performance over extended period",
    icon: "trophy",
  },
  INSTITUTIONAL: {
    label: "Institutional",
    color: "#A78BFA",
    description: "Third-party audited (coming soon)",
    icon: "building",
  },
};

/** Numeric rank for sorting/comparison */
export const LADDER_RANK: Record<LadderLevel, number> = {
  SUBMITTED: 0,
  VALIDATED: 1,
  VERIFIED: 2,
  PROVEN: 3,
  INSTITUTIONAL: 4,
};
