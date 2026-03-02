/**
 * Monitoring evaluation — pure, deterministic rule layer.
 *
 * Currently a stub: returns HEALTHY with no rule violations.
 * Future commits will add real rules (drawdown breach, Sharpe degradation, etc.).
 *
 * Fail-closed: if evaluation itself throws, the orchestrator treats it as FAILED.
 */

import type { MonitoringContext, MonitoringEvaluationResult } from "./types";

/**
 * Evaluate monitoring rules against the provided context.
 *
 * Pure function — no IO, no side effects, no randomness.
 * Same inputs → same outputs (deterministic).
 */
export function evaluateMonitoring(ctx: MonitoringContext): MonitoringEvaluationResult {
  if (!ctx.strategyId) {
    throw new Error("MonitoringContext.strategyId is required");
  }
  if (ctx.liveFactCount < 0) {
    throw new Error("MonitoringContext.liveFactCount must be non-negative");
  }

  // Stub: no rules implemented yet — return HEALTHY
  return {
    verdict: "HEALTHY",
    reasons: [],
    ruleResults: [],
  };
}
