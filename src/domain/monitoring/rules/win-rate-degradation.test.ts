import { describe, it, expect } from "vitest";
import { evaluateWinRateDegradation } from "./win-rate-degradation";
import type { WinRateDegradationInput, WinRateDegradationThresholds } from "./win-rate-degradation";

const thresholds: WinRateDegradationThresholds = { winRateMinRatio: 0.7 };

describe("evaluateWinRateDegradation", () => {
  it("PASS when live win rate is above baseline × ratio", () => {
    const input: WinRateDegradationInput = {
      liveWinRate: 0.55,
      baselineWinRate: 0.65,
      baselineMissing: false,
    };
    const result = evaluateWinRateDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
    expect(result.reasonCode).toBeNull();
    expect(result.threshold).toBeCloseTo(0.455); // 0.65 × 0.7
  });

  it("AT_RISK when live win rate is below baseline × ratio", () => {
    const input: WinRateDegradationInput = {
      liveWinRate: 0.3,
      baselineWinRate: 0.65,
      baselineMissing: false,
    };
    const result = evaluateWinRateDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_WIN_RATE_DEGRADED");
    expect(result.measured).toBe(0.3);
  });

  it("PASS at exact boundary (equal to threshold)", () => {
    const input: WinRateDegradationInput = {
      liveWinRate: 0.455,
      baselineWinRate: 0.65,
      baselineMissing: false,
    };
    const result = evaluateWinRateDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when baseline win rate is zero (no meaningful comparison)", () => {
    const input: WinRateDegradationInput = {
      liveWinRate: 0.3,
      baselineWinRate: 0,
      baselineMissing: false,
    };
    const result = evaluateWinRateDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("AT_RISK when baseline is missing", () => {
    const input: WinRateDegradationInput = {
      liveWinRate: 0.55,
      baselineWinRate: null,
      baselineMissing: true,
    };
    const result = evaluateWinRateDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_BASELINE_MISSING");
  });

  it("AT_RISK when liveWinRate is NaN", () => {
    const input: WinRateDegradationInput = {
      liveWinRate: NaN,
      baselineWinRate: 0.65,
      baselineMissing: false,
    };
    const result = evaluateWinRateDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INVALID_INPUT");
  });

  it("ruleId is 'win-rate-degradation'", () => {
    const input: WinRateDegradationInput = {
      liveWinRate: 0.55,
      baselineWinRate: 0.65,
      baselineMissing: false,
    };
    const result = evaluateWinRateDegradation(input, thresholds);
    expect(result.ruleId).toBe("win-rate-degradation");
  });
});
