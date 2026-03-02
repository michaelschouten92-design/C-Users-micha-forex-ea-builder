import { describe, it, expect } from "vitest";
import { evaluateDrawdownBreach } from "./drawdown-breach";
import type { DrawdownBreachInput, DrawdownBreachThresholds } from "./drawdown-breach";

const thresholds: DrawdownBreachThresholds = { drawdownBreachMultiplier: 1.5 };

describe("evaluateDrawdownBreach", () => {
  it("PASS when live drawdown is within baseline × multiplier", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: 10,
      baselineMaxDrawdownPct: 8,
      baselineMissing: false,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.status).toBe("PASS");
    expect(result.reasonCode).toBeNull();
    expect(result.threshold).toBe(12); // 8 × 1.5
  });

  it("AT_RISK when live drawdown exceeds baseline × multiplier", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: 15,
      baselineMaxDrawdownPct: 8,
      baselineMissing: false,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_DRAWDOWN_BREACH");
    expect(result.measured).toBe(15);
    expect(result.threshold).toBe(12);
  });

  it("PASS at exact boundary (equal to threshold)", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: 12,
      baselineMaxDrawdownPct: 8,
      baselineMissing: false,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("AT_RISK when baseline is missing", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: 5,
      baselineMaxDrawdownPct: null,
      baselineMissing: true,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_BASELINE_MISSING");
  });

  it("AT_RISK when baselineMaxDrawdownPct is null but baselineMissing is false", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: 5,
      baselineMaxDrawdownPct: null,
      baselineMissing: false,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_BASELINE_MISSING");
  });

  it("AT_RISK when liveMaxDrawdownPct is NaN", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: NaN,
      baselineMaxDrawdownPct: 8,
      baselineMissing: false,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INVALID_INPUT");
  });

  it("AT_RISK when baselineMaxDrawdownPct is Infinity", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: 10,
      baselineMaxDrawdownPct: Infinity,
      baselineMissing: false,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INVALID_INPUT");
  });

  it("ruleId is 'drawdown-breach'", () => {
    const input: DrawdownBreachInput = {
      liveMaxDrawdownPct: 5,
      baselineMaxDrawdownPct: 8,
      baselineMissing: false,
    };
    const result = evaluateDrawdownBreach(input, thresholds);
    expect(result.ruleId).toBe("drawdown-breach");
  });
});
