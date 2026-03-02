/**
 * Losing streak rule — flags when consecutive losses reach threshold.
 *
 * Pure function — no IO, no side effects.
 */

import type { RuleResult } from "../types";

export interface LosingStreakInput {
  currentLosingStreak: number;
}

export interface LosingStreakThresholds {
  maxLosingStreak: number;
}

const RULE_ID = "losing-streak";

export function evaluateLosingStreak(
  input: LosingStreakInput,
  thresholds: LosingStreakThresholds
): RuleResult {
  const { currentLosingStreak } = input;
  const { maxLosingStreak } = thresholds;

  // Invalid input guard
  if (currentLosingStreak < 0) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_INVALID_INPUT",
      measured: currentLosingStreak,
      threshold: maxLosingStreak,
      message: "Invalid input: negative losing streak count",
    };
  }

  if (currentLosingStreak >= maxLosingStreak) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_LOSS_STREAK",
      measured: currentLosingStreak,
      threshold: maxLosingStreak,
      message: `Current losing streak ${currentLosingStreak} reaches threshold ${maxLosingStreak}`,
    };
  }

  return {
    ruleId: RULE_ID,
    status: "PASS",
    reasonCode: null,
    measured: currentLosingStreak,
    threshold: maxLosingStreak,
    message: "Losing streak within acceptable range",
  };
}
