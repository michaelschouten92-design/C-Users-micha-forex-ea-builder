import { describe, it, expect } from "vitest";
import { evaluateMonitoring } from "./evaluate-monitoring";
import type { MonitoringContext } from "./types";
import type { MonitoringThresholds } from "@/domain/verification/config-snapshot";

const baseThresholds: MonitoringThresholds = {
  drawdownBreachMultiplier: 1.5,
  sharpeMinRatio: 0.5,
  maxLosingStreak: 10,
  maxInactivityDays: 14,
  cusumDriftConsecutiveSnapshots: 3,
  recoveryRunsRequired: 3,
  ackDeadlineMinutes: 60,
  escalationIntervalMinutes: 120,
  autoInvalidateMinutes: null,
  overrideApprovalPolicy: "DIFFERENT_REQUIRED",
  overrideExpiryMinutes: 60,
  overrideSuppressionMinutes: 10,
};

/** All-pass context: everything within limits */
const healthyCtx: MonitoringContext = {
  strategyId: "strat_1",
  configVersion: "2.2.0",
  liveFactCount: 50,
  snapshotHash: "abc123",
  liveMaxDrawdownPct: 5,
  liveRollingSharpe: 1.0,
  currentLosingStreak: 2,
  daysSinceLastTrade: 1,
  baselineMaxDrawdownPct: 8,
  baselineSharpeRatio: 1.5,
  baselineMissing: false,
  consecutiveDriftSnapshots: 0,
};

describe("evaluateMonitoring", () => {
  it("returns HEALTHY when all rules pass", () => {
    const result = evaluateMonitoring(healthyCtx, baseThresholds);

    expect(result.verdict).toBe("HEALTHY");
    expect(result.reasons).toEqual([]);
    expect(result.ruleResults).toHaveLength(5);
    expect(result.ruleResults.every((r) => r.status === "PASS")).toBe(true);
  });

  it("is deterministic — same inputs produce same output", () => {
    const a = evaluateMonitoring(healthyCtx, baseThresholds);
    const b = evaluateMonitoring(healthyCtx, baseThresholds);
    expect(a).toEqual(b);
  });

  it("throws when strategyId is empty", () => {
    expect(() => evaluateMonitoring({ ...healthyCtx, strategyId: "" }, baseThresholds)).toThrow(
      "MonitoringContext.strategyId is required"
    );
  });

  it("throws when liveFactCount is negative", () => {
    expect(() => evaluateMonitoring({ ...healthyCtx, liveFactCount: -1 }, baseThresholds)).toThrow(
      "MonitoringContext.liveFactCount must be non-negative"
    );
  });

  it("accepts liveFactCount of zero", () => {
    const result = evaluateMonitoring({ ...healthyCtx, liveFactCount: 0 }, baseThresholds);
    expect(result.verdict).toBe("HEALTHY");
  });

  it("single drawdown breach → AT_RISK with MONITORING_DRAWDOWN_BREACH", () => {
    const ctx: MonitoringContext = {
      ...healthyCtx,
      liveMaxDrawdownPct: 15, // 15 > 8 × 1.5 = 12
    };
    const result = evaluateMonitoring(ctx, baseThresholds);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toContain("MONITORING_DRAWDOWN_BREACH");
  });

  it("single Sharpe degradation → AT_RISK", () => {
    const ctx: MonitoringContext = {
      ...healthyCtx,
      liveRollingSharpe: 0.3, // 0.3 < 1.5 × 0.5 = 0.75
    };
    const result = evaluateMonitoring(ctx, baseThresholds);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toContain("MONITORING_SHARPE_DEGRADATION");
  });

  it("multiple breaches → AT_RISK with reasons in evaluation order", () => {
    const ctx: MonitoringContext = {
      ...healthyCtx,
      liveMaxDrawdownPct: 15, // drawdown breach
      currentLosingStreak: 12, // losing streak
      daysSinceLastTrade: 20, // inactivity
    };
    const result = evaluateMonitoring(ctx, baseThresholds);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toEqual([
      "MONITORING_DRAWDOWN_BREACH",
      "MONITORING_LOSS_STREAK",
      "MONITORING_INACTIVITY",
    ]);
  });

  it("baseline missing → AT_RISK with MONITORING_BASELINE_MISSING (deduplicated)", () => {
    const ctx: MonitoringContext = {
      ...healthyCtx,
      baselineMissing: true,
      baselineMaxDrawdownPct: null,
      baselineSharpeRatio: null,
    };
    const result = evaluateMonitoring(ctx, baseThresholds);

    expect(result.verdict).toBe("AT_RISK");
    // Both drawdown and Sharpe rules produce MONITORING_BASELINE_MISSING
    // but it should be deduplicated
    expect(result.reasons).toEqual(["MONITORING_BASELINE_MISSING"]);
  });

  it("invalid input (NaN) → AT_RISK with MONITORING_INVALID_INPUT", () => {
    const ctx: MonitoringContext = {
      ...healthyCtx,
      liveMaxDrawdownPct: NaN,
    };
    const result = evaluateMonitoring(ctx, baseThresholds);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toContain("MONITORING_INVALID_INPUT");
  });

  it("CUSUM drift → AT_RISK", () => {
    const ctx: MonitoringContext = {
      ...healthyCtx,
      consecutiveDriftSnapshots: 5,
    };
    const result = evaluateMonitoring(ctx, baseThresholds);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toContain("MONITORING_CUSUM_DRIFT");
  });

  it("always returns exactly 5 rule results", () => {
    const result = evaluateMonitoring(healthyCtx, baseThresholds);
    expect(result.ruleResults).toHaveLength(5);

    const ruleIds = result.ruleResults.map((r) => r.ruleId);
    expect(ruleIds).toEqual([
      "drawdown-breach",
      "sharpe-degradation",
      "losing-streak",
      "inactivity",
      "cusum-drift",
    ]);
  });
});
