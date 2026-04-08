/**
 * Profit factor degradation rule — compares live profit factor against baseline × ratio.
 *
 * Pure function — no IO, no side effects.
 */

import type { RuleResult } from "../types";

export interface ProfitFactorDegradationInput {
  liveProfitFactor: number;
  baselineProfitFactor: number | null;
  baselineMissing: boolean;
}

export interface ProfitFactorDegradationThresholds {
  profitFactorMinRatio: number;
}

const RULE_ID = "profit-factor-degradation";

export function evaluateProfitFactorDegradation(
  input: ProfitFactorDegradationInput,
  thresholds: ProfitFactorDegradationThresholds
): RuleResult {
  const { liveProfitFactor, baselineProfitFactor, baselineMissing } = input;
  const { profitFactorMinRatio } = thresholds;

  // Fail-closed: baseline missing
  if (baselineMissing || baselineProfitFactor == null) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_BASELINE_MISSING",
      measured: liveProfitFactor,
      threshold: 0,
      message: "BacktestBaseline not found — cannot evaluate profit factor degradation",
    };
  }

  // No meaningful baseline to compare — pass
  if (baselineProfitFactor <= 0 || baselineProfitFactor === Infinity) {
    return {
      ruleId: RULE_ID,
      status: "PASS",
      reasonCode: null,
      measured: liveProfitFactor,
      threshold: 0,
      message:
        baselineProfitFactor === Infinity
          ? "Baseline profit factor is Infinity (no losses in backtest) — no meaningful comparison"
          : "Baseline profit factor ≤ 0 — no meaningful comparison",
    };
  }

  // Infinity profit factor = no losing trades — no degradation possible
  if (liveProfitFactor === Infinity) {
    return {
      ruleId: RULE_ID,
      status: "PASS",
      reasonCode: null,
      measured: liveProfitFactor,
      threshold: baselineProfitFactor * profitFactorMinRatio,
      message: "Live profit factor is Infinity (no losses) — no degradation",
    };
  }

  // Invalid input guard (NaN, -Infinity, or non-finite baseline)
  if (!Number.isFinite(liveProfitFactor) || !Number.isFinite(baselineProfitFactor)) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_INVALID_INPUT",
      measured: liveProfitFactor,
      threshold: baselineProfitFactor * profitFactorMinRatio,
      message: "Invalid input: NaN or non-finite value detected in profit factor",
    };
  }

  const minAcceptable = baselineProfitFactor * profitFactorMinRatio;

  if (liveProfitFactor < minAcceptable) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_PROFIT_FACTOR_DEGRADED",
      measured: liveProfitFactor,
      threshold: minAcceptable,
      message: `Live profit factor ${liveProfitFactor.toFixed(2)} below baseline ${baselineProfitFactor.toFixed(2)} × ${profitFactorMinRatio}`,
    };
  }

  return {
    ruleId: RULE_ID,
    status: "PASS",
    reasonCode: null,
    measured: liveProfitFactor,
    threshold: minAcceptable,
    message: "Profit factor within acceptable range",
  };
}
