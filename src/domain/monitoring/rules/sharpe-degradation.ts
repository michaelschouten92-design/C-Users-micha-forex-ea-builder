/**
 * Sharpe degradation rule — compares live rolling Sharpe against baseline × ratio.
 *
 * Pure function — no IO, no side effects.
 */

import type { RuleResult } from "../types";

export interface SharpeDegradationInput {
  liveRollingSharpe: number;
  baselineSharpeRatio: number | null;
  baselineMissing: boolean;
}

export interface SharpeDegradationThresholds {
  sharpeMinRatio: number;
}

const RULE_ID = "sharpe-degradation";

export function evaluateSharpeDegradation(
  input: SharpeDegradationInput,
  thresholds: SharpeDegradationThresholds
): RuleResult {
  const { liveRollingSharpe, baselineSharpeRatio, baselineMissing } = input;
  const { sharpeMinRatio } = thresholds;

  // Fail-closed: baseline missing
  if (baselineMissing || baselineSharpeRatio == null) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_BASELINE_MISSING",
      measured: liveRollingSharpe,
      threshold: 0,
      message: "BacktestBaseline not found — cannot evaluate Sharpe degradation",
    };
  }

  // No meaningful baseline to compare — pass
  if (baselineSharpeRatio <= 0) {
    return {
      ruleId: RULE_ID,
      status: "PASS",
      reasonCode: null,
      measured: liveRollingSharpe,
      threshold: 0,
      message: "Baseline Sharpe ≤ 0 — no meaningful comparison",
    };
  }

  // Invalid input guard
  if (!Number.isFinite(liveRollingSharpe) || !Number.isFinite(baselineSharpeRatio)) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_INVALID_INPUT",
      measured: liveRollingSharpe,
      threshold: baselineSharpeRatio * sharpeMinRatio,
      message: "Invalid input: NaN or Infinity detected in Sharpe values",
    };
  }

  const minAcceptable = baselineSharpeRatio * sharpeMinRatio;

  if (liveRollingSharpe < minAcceptable) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_SHARPE_DEGRADATION",
      measured: liveRollingSharpe,
      threshold: minAcceptable,
      message: `Live Sharpe ${liveRollingSharpe.toFixed(2)} below baseline ${baselineSharpeRatio.toFixed(2)} × ${sharpeMinRatio}`,
    };
  }

  return {
    ruleId: RULE_ID,
    status: "PASS",
    reasonCode: null,
    measured: liveRollingSharpe,
    threshold: minAcceptable,
    message: "Sharpe ratio within acceptable range",
  };
}
