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

  /** Reclaim PENDING/RUNNING runs older than this (ms). 2× cooldown. */
  STALE_RUN_THRESHOLD_MS: 10 * 60 * 1000,

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
  /** Live profitFactor < baseline × ratio → AT_RISK */
  PROFIT_FACTOR_MIN_RATIO: 0.6,
  /** Live winRate < baseline × ratio → AT_RISK */
  WIN_RATE_MIN_RATIO: 0.7,
  /** Consecutive HEALTHY runs required to recover from EDGE_AT_RISK */
  RECOVERY_RUNS_REQUIRED: 3,

  // ── Incident SLA thresholds (included in thresholdsHash) ─────────
  /** Minutes before operator ACK is expected */
  ACK_DEADLINE_MINUTES: 60,
  /** Minutes between escalation notifications */
  ESCALATION_INTERVAL_MINUTES: 120,
  /** Minutes before auto-invalidation (null = disabled) */
  AUTO_INVALIDATE_MINUTES: null as number | null,

  // ── Override governance (included in thresholdsHash) ─────────────
  /** "SAME_OK" = same operator can approve their own request; "DIFFERENT_REQUIRED" = different operator must approve */
  OVERRIDE_APPROVAL_POLICY: "DIFFERENT_REQUIRED" as "SAME_OK" | "DIFFERENT_REQUIRED",
  /** Minutes before an unapplied override expires */
  OVERRIDE_EXPIRY_MINUTES: 60,
  /** Minutes after override apply during which monitoring is suppressed */
  OVERRIDE_SUPPRESSION_MINUTES: 10,
} as const;
