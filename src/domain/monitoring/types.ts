/**
 * Monitoring system types — shared across evaluation, orchestration, and proof.
 */

export type MonitoringVerdict = "HEALTHY" | "AT_RISK" | "INVALIDATED";

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  measured: number;
  threshold: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
}

/**
 * All data a monitoring rule needs — pre-loaded, no DB access in rules.
 */
export interface MonitoringContext {
  strategyId: string;
  liveFactCount: number;
  snapshotHash: string;
  configVersion: string;
}

export interface MonitoringEvaluationResult {
  verdict: MonitoringVerdict;
  reasons: string[];
  ruleResults: RuleResult[];
}
