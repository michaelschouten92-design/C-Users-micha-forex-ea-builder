/**
 * Constants for backtest health scoring.
 *
 * Each metric has a weight (all weights sum to 1.0) and breakpoints
 * for piecewise linear interpolation from 0 to the max score.
 */

export interface ScoreWeight {
  weight: number;
  /** Breakpoints: [value, score] pairs. Values between breakpoints are linearly interpolated. */
  breakpoints: [number, number][];
}

/**
 * Score weights and breakpoints per metric.
 * Weights: PF 20%, DD 25%, trades 10%, payoff 10%, winrate 10%, sharpe 15%, recovery 10%
 */
export const SCORE_WEIGHTS: Record<string, ScoreWeight> = {
  profitFactor: {
    weight: 0.2,
    // PF=1.0 is breakeven before costs — intentionally scored low (25).
    breakpoints: [
      [0.0, 0],
      [0.8, 15],
      [1.0, 25],
      [1.5, 70],
      [2.0, 90],
      [3.0, 100],
    ],
  },
  maxDrawdownPct: {
    weight: 0.25,
    // Lower drawdown is better — invert direction
    breakpoints: [
      [0.0, 100],
      [5.0, 95],
      [10.0, 80],
      [20.0, 60],
      [35.0, 30],
      [50.0, 10],
      [100.0, 0],
    ],
  },
  totalTrades: {
    weight: 0.1,
    breakpoints: [
      [0, 0],
      [10, 10],
      [30, 30],
      [100, 60],
      [300, 80],
      [500, 90],
      [1000, 100],
    ],
  },
  expectedPayoff: {
    weight: 0.1,
    // Breakpoints are in % of initial deposit (normalized by scorer).
    // e.g. 0.05% = $5 payoff on a $10K account.
    breakpoints: [
      [-1, 0],
      [0, 30],
      [0.05, 60],
      [0.15, 80],
      [0.3, 90],
      [0.5, 100],
    ],
  },
  winRate: {
    weight: 0.1,
    breakpoints: [
      [0, 0],
      [20, 20],
      [35, 40],
      [45, 60],
      [55, 80],
      [65, 90],
      [80, 100],
    ],
  },
  sharpeRatio: {
    weight: 0.15,
    breakpoints: [
      [-1.0, 0],
      [0.0, 20],
      [0.5, 50],
      [1.0, 70],
      [1.5, 85],
      [2.0, 95],
      [3.0, 100],
    ],
  },
  recoveryFactor: {
    weight: 0.1,
    breakpoints: [
      [0.0, 0],
      [0.5, 20],
      [1.0, 40],
      [2.0, 60],
      [3.0, 80],
      [5.0, 90],
      [10.0, 100],
    ],
  },
};

/**
 * Scoring mode affects drawdown breakpoints and adds mode-specific warnings.
 * - "default": standard scoring for personal accounts
 * - "propFirm": tighter drawdown limits matching typical prop firm rules (5-10% DD)
 */
export type ScoringMode = "default" | "propFirm";

/**
 * Prop firm mode: tighter drawdown breakpoints.
 * Most prop firms enforce ~5% daily DD and ~10% total DD hard limits.
 * Scoring reflects this: anything above 10% DD scores very poorly.
 */
export const PROP_FIRM_DD_BREAKPOINTS: [number, number][] = [
  [0.0, 100],
  [3.0, 95],
  [5.0, 80],
  [8.0, 50],
  [10.0, 20],
  [15.0, 5],
  [20.0, 0],
];

/**
 * Health score algorithm version. Increment when scoring logic changes
 * (weight adjustments, breakpoint changes, new metrics, new guards).
 * Stored alongside each score so historical comparisons remain valid.
 *
 * v1: initial release
 * v2: P1 fixes (expectedPayoff normalization, NaN guards, red flags, INSUFFICIENT_DATA)
 * v3: P2 fixes (PF breakpoint adjustment, baseline volatility)
 * v4: P3 fixes (adaptive outlier threshold, prop firm mode, confidence intervals)
 */
export const HEALTH_SCORE_VERSION = 4;

/** Maximum upload file size in bytes (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Minimum number of tables expected in an MT5 report */
export const MIN_TABLES_FOR_MT5 = 2;

/** Keyword present in MT5 reports */
export const MT5_IDENTIFIER = "Strategy Tester";
