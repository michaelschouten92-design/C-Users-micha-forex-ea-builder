/**
 * Maps internal monitoring reason codes to user-facing copy.
 * Pure function — no IO.
 */

const REASON_COPY: Record<string, string> = {
  MONITORING_DRAWDOWN_BREACH: "Drawdown exceeded baseline threshold",
  MONITORING_SHARPE_DEGRADATION: "Sharpe degraded vs baseline",
  MONITORING_PROFIT_FACTOR_DEGRADED: "Profit factor degraded vs baseline",
  MONITORING_WIN_RATE_DEGRADED: "Win rate degraded vs baseline",
  MONITORING_LOSS_STREAK: "Losing streak detected",
  MONITORING_INACTIVITY: "No recent trading activity",
  MONITORING_CUSUM_DRIFT: "Drift detected (CUSUM)",
  MONITORING_BASELINE_MISSING: "No baseline available for monitoring",
  MONITORING_INVALID_INPUT: "Invalid monitoring input",
};

const MAX_REASONS = 3;

/**
 * Convert an array of internal reason codes to compact user-facing strings.
 * Unknown codes are dropped. Returns at most MAX_REASONS entries.
 */
export function formatMonitoringReasons(codes: string[]): string[] {
  return codes
    .map((c) => REASON_COPY[c])
    .filter((v): v is string => v != null)
    .slice(0, MAX_REASONS);
}
