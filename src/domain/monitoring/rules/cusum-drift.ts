/**
 * CUSUM drift rule — flags when consecutive HealthSnapshots report drift.
 *
 * Pure function — no IO, no side effects.
 * Note: 0 consecutive drift (no HealthSnapshot data) → PASS.
 * Drift not yet detected is not a baseline-missing case.
 */

import type { RuleResult } from "../types";

export interface CusumDriftInput {
  consecutiveDriftSnapshots: number;
}

export interface CusumDriftThresholds {
  cusumDriftConsecutiveSnapshots: number;
}

const RULE_ID = "cusum-drift";

export function evaluateCusumDrift(
  input: CusumDriftInput,
  thresholds: CusumDriftThresholds
): RuleResult {
  const { consecutiveDriftSnapshots } = input;
  const { cusumDriftConsecutiveSnapshots } = thresholds;

  if (consecutiveDriftSnapshots >= cusumDriftConsecutiveSnapshots) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_CUSUM_DRIFT",
      measured: consecutiveDriftSnapshots,
      threshold: cusumDriftConsecutiveSnapshots,
      message: `${consecutiveDriftSnapshots} consecutive drift-detected snapshots reaches threshold ${cusumDriftConsecutiveSnapshots}`,
    };
  }

  return {
    ruleId: RULE_ID,
    status: "PASS",
    reasonCode: null,
    measured: consecutiveDriftSnapshots,
    threshold: cusumDriftConsecutiveSnapshots,
    message: "CUSUM drift within acceptable range",
  };
}
