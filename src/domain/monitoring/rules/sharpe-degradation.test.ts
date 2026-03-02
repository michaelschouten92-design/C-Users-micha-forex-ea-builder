import { describe, it, expect } from "vitest";
import { evaluateSharpeDegradation } from "./sharpe-degradation";
import type { SharpeDegradationInput, SharpeDegradationThresholds } from "./sharpe-degradation";

const thresholds: SharpeDegradationThresholds = { sharpeMinRatio: 0.5 };

describe("evaluateSharpeDegradation", () => {
  it("PASS when live Sharpe is above baseline × ratio", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: 1.0,
      baselineSharpeRatio: 1.5,
      baselineMissing: false,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
    expect(result.reasonCode).toBeNull();
    expect(result.threshold).toBe(0.75); // 1.5 × 0.5
  });

  it("AT_RISK when live Sharpe is below baseline × ratio", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: 0.3,
      baselineSharpeRatio: 1.5,
      baselineMissing: false,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_SHARPE_DEGRADATION");
    expect(result.measured).toBe(0.3);
  });

  it("PASS at exact boundary (equal to threshold)", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: 0.75,
      baselineSharpeRatio: 1.5,
      baselineMissing: false,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when baseline Sharpe is zero (no meaningful comparison)", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: -0.5,
      baselineSharpeRatio: 0,
      baselineMissing: false,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when baseline Sharpe is negative", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: -1.0,
      baselineSharpeRatio: -0.5,
      baselineMissing: false,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("AT_RISK when baseline is missing", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: 1.0,
      baselineSharpeRatio: null,
      baselineMissing: true,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_BASELINE_MISSING");
  });

  it("AT_RISK when liveRollingSharpe is NaN", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: NaN,
      baselineSharpeRatio: 1.5,
      baselineMissing: false,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INVALID_INPUT");
  });

  it("ruleId is 'sharpe-degradation'", () => {
    const input: SharpeDegradationInput = {
      liveRollingSharpe: 1.0,
      baselineSharpeRatio: 1.5,
      baselineMissing: false,
    };
    const result = evaluateSharpeDegradation(input, thresholds);
    expect(result.ruleId).toBe("sharpe-degradation");
  });
});
