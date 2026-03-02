/**
 * Monitoring evaluation — pure, deterministic rule layer.
 *
 * Runs 5 rules in fixed order, collects results, composes verdict.
 * Fail-closed: if evaluation itself throws, the orchestrator treats it as FAILED.
 */

import type {
  MonitoringContext,
  MonitoringEvaluationResult,
  MonitoringReasonCode,
  RuleResult,
} from "./types";
import type { MonitoringThresholds } from "@/domain/verification/config-snapshot";
import { evaluateDrawdownBreach } from "./rules/drawdown-breach";
import { evaluateSharpeDegradation } from "./rules/sharpe-degradation";
import { evaluateLosingStreak } from "./rules/losing-streak";
import { evaluateInactivity } from "./rules/inactivity";
import { evaluateCusumDrift } from "./rules/cusum-drift";

/**
 * Evaluate monitoring rules against the provided context and thresholds.
 *
 * Pure function — no IO, no side effects, no randomness.
 * Same inputs → same outputs (deterministic).
 *
 * Fixed evaluation order:
 *   1. Drawdown breach
 *   2. Sharpe degradation
 *   3. Losing streak
 *   4. Inactivity
 *   5. CUSUM drift
 *
 * Verdict composition:
 *   - any INVALIDATED → INVALIDATED
 *   - else any AT_RISK → AT_RISK
 *   - else HEALTHY
 */
export function evaluateMonitoring(
  ctx: MonitoringContext,
  thresholds: MonitoringThresholds
): MonitoringEvaluationResult {
  if (!ctx.strategyId) {
    throw new Error("MonitoringContext.strategyId is required");
  }
  if (ctx.liveFactCount < 0) {
    throw new Error("MonitoringContext.liveFactCount must be non-negative");
  }

  // Fixed evaluation order — deterministic
  const ruleResults: RuleResult[] = [
    evaluateDrawdownBreach(
      {
        liveMaxDrawdownPct: ctx.liveMaxDrawdownPct,
        baselineMaxDrawdownPct: ctx.baselineMaxDrawdownPct,
        baselineMissing: ctx.baselineMissing,
      },
      { drawdownBreachMultiplier: thresholds.drawdownBreachMultiplier }
    ),
    evaluateSharpeDegradation(
      {
        liveRollingSharpe: ctx.liveRollingSharpe,
        baselineSharpeRatio: ctx.baselineSharpeRatio,
        baselineMissing: ctx.baselineMissing,
      },
      { sharpeMinRatio: thresholds.sharpeMinRatio }
    ),
    evaluateLosingStreak(
      { currentLosingStreak: ctx.currentLosingStreak },
      { maxLosingStreak: thresholds.maxLosingStreak }
    ),
    evaluateInactivity(
      { daysSinceLastTrade: ctx.daysSinceLastTrade },
      { maxInactivityDays: thresholds.maxInactivityDays }
    ),
    evaluateCusumDrift(
      { consecutiveDriftSnapshots: ctx.consecutiveDriftSnapshots },
      { cusumDriftConsecutiveSnapshots: thresholds.cusumDriftConsecutiveSnapshots }
    ),
  ];

  // Collect reason codes in evaluation order (stable, deduplicated)
  const seen = new Set<MonitoringReasonCode>();
  const reasons: MonitoringReasonCode[] = [];
  for (const result of ruleResults) {
    if (result.reasonCode && !seen.has(result.reasonCode)) {
      seen.add(result.reasonCode);
      reasons.push(result.reasonCode);
    }
  }

  // Verdict composition
  const hasInvalidated = ruleResults.some((r) => r.status === "INVALIDATED");
  const hasAtRisk = ruleResults.some((r) => r.status === "AT_RISK");

  const verdict = hasInvalidated ? "INVALIDATED" : hasAtRisk ? "AT_RISK" : "HEALTHY";

  return { verdict, reasons, ruleResults };
}
