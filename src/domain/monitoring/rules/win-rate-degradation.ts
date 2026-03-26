/**
 * Win rate degradation rule — compares live win rate against baseline × ratio.
 *
 * Pure function — no IO, no side effects.
 */

import type { RuleResult } from "../types";

export interface WinRateDegradationInput {
  liveWinRate: number;
  baselineWinRate: number | null;
  baselineMissing: boolean;
}

export interface WinRateDegradationThresholds {
  winRateMinRatio: number;
}

const RULE_ID = "win-rate-degradation";

export function evaluateWinRateDegradation(
  input: WinRateDegradationInput,
  thresholds: WinRateDegradationThresholds
): RuleResult {
  const { liveWinRate, baselineWinRate, baselineMissing } = input;
  const { winRateMinRatio } = thresholds;

  // Fail-closed: baseline missing
  if (baselineMissing || baselineWinRate == null) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_BASELINE_MISSING",
      measured: liveWinRate,
      threshold: 0,
      message: "BacktestBaseline not found — cannot evaluate win rate degradation",
    };
  }

  // No meaningful baseline to compare — pass
  if (baselineWinRate <= 0) {
    return {
      ruleId: RULE_ID,
      status: "PASS",
      reasonCode: null,
      measured: liveWinRate,
      threshold: 0,
      message: "Baseline win rate ≤ 0 — no meaningful comparison",
    };
  }

  // Invalid input guard
  if (!Number.isFinite(liveWinRate) || !Number.isFinite(baselineWinRate)) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_INVALID_INPUT",
      measured: liveWinRate,
      threshold: baselineWinRate * winRateMinRatio,
      message: "Invalid input: NaN or Infinity detected in win rate values",
    };
  }

  const minAcceptable = baselineWinRate * winRateMinRatio;

  if (liveWinRate <= minAcceptable) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_WIN_RATE_DEGRADED",
      measured: liveWinRate,
      threshold: minAcceptable,
      message: `Live win rate ${liveWinRate.toFixed(2)} below baseline ${baselineWinRate.toFixed(2)} × ${winRateMinRatio}`,
    };
  }

  return {
    ruleId: RULE_ID,
    status: "PASS",
    reasonCode: null,
    measured: liveWinRate,
    threshold: minAcceptable,
    message: "Win rate within acceptable range",
  };
}
