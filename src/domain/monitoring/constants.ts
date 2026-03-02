/**
 * Monitoring system constants — versioned thresholds for monitoring rules.
 *
 * Follows the same pattern as verification/constants.ts:
 * all thresholds are deterministic, immutable per config version.
 *
 * Governed: these values are included in the config thresholdsHash
 * (via MonitoringThresholds) so any change is detectable.
 */

export const MONITORING = {
  /** Minimum seconds between monitoring runs for the same strategy */
  COOLDOWN_SECONDS: 300, // 5 minutes

  // ── Governed thresholds (included in thresholdsHash) ──────────────
  /** Live drawdown > baseline × multiplier → AT_RISK */
  DRAWDOWN_BREACH_MULTIPLIER: 1.5,
  /** Live Sharpe < baseline × ratio → AT_RISK */
  SHARPE_MIN_RATIO: 0.5,
  /** Consecutive losing trades threshold */
  MAX_LOSING_STREAK: 10,
  /** Days since last trade before inactivity flag */
  MAX_INACTIVITY_DAYS: 14,
  /** Consecutive HealthSnapshots with driftDetected=true */
  CUSUM_DRIFT_CONSECUTIVE_SNAPSHOTS: 3,
  /** Consecutive HEALTHY runs required to recover from EDGE_AT_RISK */
  RECOVERY_RUNS_REQUIRED: 3,
} as const;
