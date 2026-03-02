/**
 * Monitoring system types — shared across evaluation, orchestration, and proof.
 */

export type MonitoringVerdict = "HEALTHY" | "AT_RISK" | "INVALIDATED";

export type MonitoringReasonCode =
  | "MONITORING_DRAWDOWN_BREACH"
  | "MONITORING_SHARPE_DEGRADATION"
  | "MONITORING_LOSS_STREAK"
  | "MONITORING_INACTIVITY"
  | "MONITORING_CUSUM_DRIFT"
  | "MONITORING_BASELINE_MISSING"
  | "MONITORING_INVALID_INPUT";

export interface RuleResult {
  ruleId: string;
  status: "PASS" | "AT_RISK" | "INVALIDATED";
  reasonCode: MonitoringReasonCode | null;
  measured: number;
  threshold: number;
  message: string;
}

/**
 * All data a monitoring rule needs — pre-loaded, no DB access in rules.
 */
export interface MonitoringContext {
  strategyId: string;
  configVersion: string;
  liveFactCount: number;
  snapshotHash: string;
  // Live metrics (computed from TradeFacts)
  liveMaxDrawdownPct: number;
  liveRollingSharpe: number;
  currentLosingStreak: number;
  daysSinceLastTrade: number;
  // Baselines (from BacktestBaseline)
  baselineMaxDrawdownPct: number | null;
  baselineSharpeRatio: number | null;
  baselineMissing: boolean;
  // CUSUM (from HealthSnapshots)
  consecutiveDriftSnapshots: number;
}

export interface MonitoringEvaluationResult {
  verdict: MonitoringVerdict;
  reasons: MonitoringReasonCode[];
  ruleResults: RuleResult[];
}

/**
 * Typed error for monitoring-specific config invalidity.
 *
 * Thrown when a loaded config is structurally invalid for monitoring
 * (e.g., missing monitoringThresholds). Carries a stable reasonCode
 * for deterministic recording in proof events and MonitoringRun rows.
 */
export class MonitoringConfigError extends Error {
  readonly reasonCode = "MONITORING_CONFIG_INVALID" as const;

  constructor(diagnostic: string) {
    super(diagnostic);
    this.name = "MonitoringConfigError";
  }
}
