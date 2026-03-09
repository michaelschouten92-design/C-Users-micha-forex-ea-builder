import { describe, it, expect } from "vitest";
import { evaluateProfitFactorDegradation } from "./profit-factor-degradation";
import type {
  ProfitFactorDegradationInput,
  ProfitFactorDegradationThresholds,
} from "./profit-factor-degradation";

const thresholds: ProfitFactorDegradationThresholds = { profitFactorMinRatio: 0.6 };

describe("evaluateProfitFactorDegradation", () => {
  it("PASS when live profit factor is above baseline × ratio", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: 1.5,
      baselineProfitFactor: 2.0,
      baselineMissing: false,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
    expect(result.reasonCode).toBeNull();
    expect(result.threshold).toBe(1.2); // 2.0 × 0.6
  });

  it("AT_RISK when live profit factor is below baseline × ratio", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: 0.8,
      baselineProfitFactor: 2.0,
      baselineMissing: false,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_PROFIT_FACTOR_DEGRADED");
    expect(result.measured).toBe(0.8);
    expect(result.threshold).toBe(1.2);
  });

  it("PASS at exact boundary (equal to threshold)", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: 1.2,
      baselineProfitFactor: 2.0,
      baselineMissing: false,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when baseline profit factor is zero (no meaningful comparison)", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: 0.5,
      baselineProfitFactor: 0,
      baselineMissing: false,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when baseline profit factor is negative", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: 0.5,
      baselineProfitFactor: -1.0,
      baselineMissing: false,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("AT_RISK when baseline is missing", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: 1.5,
      baselineProfitFactor: null,
      baselineMissing: true,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_BASELINE_MISSING");
  });

  it("AT_RISK when liveProfitFactor is NaN", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: NaN,
      baselineProfitFactor: 2.0,
      baselineMissing: false,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INVALID_INPUT");
  });

  it("ruleId is 'profit-factor-degradation'", () => {
    const input: ProfitFactorDegradationInput = {
      liveProfitFactor: 1.5,
      baselineProfitFactor: 2.0,
      baselineMissing: false,
    };
    const result = evaluateProfitFactorDegradation(input, thresholds);
    expect(result.ruleId).toBe("profit-factor-degradation");
  });
});
