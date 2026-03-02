import { describe, it, expect } from "vitest";
import { evaluateInactivity } from "./inactivity";
import type { InactivityInput, InactivityThresholds } from "./inactivity";

const thresholds: InactivityThresholds = { maxInactivityDays: 14 };

describe("evaluateInactivity", () => {
  it("PASS when days since last trade is below threshold", () => {
    const input: InactivityInput = { daysSinceLastTrade: 5 };
    const result = evaluateInactivity(input, thresholds);
    expect(result.status).toBe("PASS");
    expect(result.reasonCode).toBeNull();
  });

  it("AT_RISK when days since last trade reaches threshold", () => {
    const input: InactivityInput = { daysSinceLastTrade: 14 };
    const result = evaluateInactivity(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INACTIVITY");
    expect(result.measured).toBe(14);
    expect(result.threshold).toBe(14);
  });

  it("AT_RISK when days since last trade exceeds threshold", () => {
    const input: InactivityInput = { daysSinceLastTrade: 30 };
    const result = evaluateInactivity(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INACTIVITY");
  });

  it("PASS at boundary (one below threshold)", () => {
    const input: InactivityInput = { daysSinceLastTrade: 13 };
    const result = evaluateInactivity(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when days since last trade is zero", () => {
    const input: InactivityInput = { daysSinceLastTrade: 0 };
    const result = evaluateInactivity(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("AT_RISK when days since last trade is negative (invalid input)", () => {
    const input: InactivityInput = { daysSinceLastTrade: -1 };
    const result = evaluateInactivity(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INVALID_INPUT");
  });

  it("ruleId is 'inactivity'", () => {
    const input: InactivityInput = { daysSinceLastTrade: 5 };
    const result = evaluateInactivity(input, thresholds);
    expect(result.ruleId).toBe("inactivity");
  });
});
