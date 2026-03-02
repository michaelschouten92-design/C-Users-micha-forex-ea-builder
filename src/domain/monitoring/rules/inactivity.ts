/**
 * Inactivity rule — flags when too many days have passed since last trade.
 *
 * Pure function — no IO, no side effects.
 */

import type { RuleResult } from "../types";

export interface InactivityInput {
  daysSinceLastTrade: number;
}

export interface InactivityThresholds {
  maxInactivityDays: number;
}

const RULE_ID = "inactivity";

export function evaluateInactivity(
  input: InactivityInput,
  thresholds: InactivityThresholds
): RuleResult {
  const { daysSinceLastTrade } = input;
  const { maxInactivityDays } = thresholds;

  // Invalid input guard
  if (daysSinceLastTrade < 0) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_INVALID_INPUT",
      measured: daysSinceLastTrade,
      threshold: maxInactivityDays,
      message: "Invalid input: negative days since last trade",
    };
  }

  if (daysSinceLastTrade >= maxInactivityDays) {
    return {
      ruleId: RULE_ID,
      status: "AT_RISK",
      reasonCode: "MONITORING_INACTIVITY",
      measured: daysSinceLastTrade,
      threshold: maxInactivityDays,
      message: `${daysSinceLastTrade} days since last trade exceeds threshold ${maxInactivityDays}`,
    };
  }

  return {
    ruleId: RULE_ID,
    status: "PASS",
    reasonCode: null,
    measured: daysSinceLastTrade,
    threshold: maxInactivityDays,
    message: "Trade activity within acceptable range",
  };
}
