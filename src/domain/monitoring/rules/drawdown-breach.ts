/**
 * Drawdown breach rule — compares live max drawdown against baseline × multiplier.
 *
 * Pure function — no IO, no side effects.
 */

import type { RuleResult } from "../types";

export interface DrawdownBreachInput {
  liveMaxDrawdownPct: number;
  baselineMaxDrawdownPct: number | null;
  baselineMissing: boolean;
}

export interface DrawdownBreachThresholds {
  drawdownBreachMultiplier: number;
}

const RULE_ID = "drawdown-breach";

export function evaluateDrawdownBreach(
  input: DrawdownBreachInput,
  thresholds: DrawdownBreachThresholds
): RuleResult {
  const { liveMaxDrawdownPct, baselineMaxDrawdownPct, baselineMissing } = input;
  const { drawdownBreachMultiplier } = thresholds;

  // Fail-closed: baseline missing
  if (baselineMissing || baselineMaxDrawdownPct == null) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_BASELINE_MISSING",
      measured: liveMaxDrawdownPct,
      threshold: 0,
      message: "BacktestBaseline not found — cannot evaluate drawdown breach",
    };
  }

  // Invalid input guard
  if (
    !Number.isFinite(liveMaxDrawdownPct) ||
    !Number.isFinite(baselineMaxDrawdownPct) ||
    !Number.isFinite(drawdownBreachMultiplier)
  ) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_INVALID_INPUT",
      measured: liveMaxDrawdownPct,
      threshold: baselineMaxDrawdownPct * drawdownBreachMultiplier,
      message: "Invalid input: NaN or Infinity detected in drawdown values",
    };
  }

  const breachThreshold = baselineMaxDrawdownPct * drawdownBreachMultiplier;

  if (liveMaxDrawdownPct > breachThreshold) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_DRAWDOWN_BREACH",
      measured: liveMaxDrawdownPct,
      threshold: breachThreshold,
      message: `Live drawdown ${liveMaxDrawdownPct.toFixed(2)}% exceeds baseline ${baselineMaxDrawdownPct.toFixed(2)}% × ${drawdownBreachMultiplier}`,
    };
  }

  return {
    ruleId: RULE_ID,
    status: "PASS",
    reasonCode: null,
    measured: liveMaxDrawdownPct,
    threshold: breachThreshold,
    message: "Drawdown within acceptable range",
  };
}
