import { describe, it, expect } from "vitest";
import { evaluateMonitoring } from "./evaluate-monitoring";
import type { MonitoringContext } from "./types";

describe("evaluateMonitoring", () => {
  const validCtx: MonitoringContext = {
    strategyId: "strat_1",
    liveFactCount: 10,
    snapshotHash: "abc123",
    configVersion: "1.0.0",
  };

  it("returns HEALTHY with empty reasons/ruleResults (stub)", () => {
    const result = evaluateMonitoring(validCtx);

    expect(result).toEqual({
      verdict: "HEALTHY",
      reasons: [],
      ruleResults: [],
    });
  });

  it("is deterministic — same inputs produce same output", () => {
    const a = evaluateMonitoring(validCtx);
    const b = evaluateMonitoring(validCtx);

    expect(a).toEqual(b);
  });

  it("throws when strategyId is empty", () => {
    expect(() => evaluateMonitoring({ ...validCtx, strategyId: "" })).toThrow(
      "MonitoringContext.strategyId is required"
    );
  });

  it("throws when liveFactCount is negative", () => {
    expect(() => evaluateMonitoring({ ...validCtx, liveFactCount: -1 })).toThrow(
      "MonitoringContext.liveFactCount must be non-negative"
    );
  });

  it("accepts liveFactCount of zero", () => {
    const result = evaluateMonitoring({ ...validCtx, liveFactCount: 0 });
    expect(result.verdict).toBe("HEALTHY");
  });
});
