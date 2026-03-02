import { describe, it, expect } from "vitest";
import { evaluateLosingStreak } from "./losing-streak";
import type { LosingStreakInput, LosingStreakThresholds } from "./losing-streak";

const thresholds: LosingStreakThresholds = { maxLosingStreak: 10 };

describe("evaluateLosingStreak", () => {
  it("PASS when losing streak is below threshold", () => {
    const input: LosingStreakInput = { currentLosingStreak: 3 };
    const result = evaluateLosingStreak(input, thresholds);
    expect(result.status).toBe("PASS");
    expect(result.reasonCode).toBeNull();
  });

  it("AT_RISK when losing streak reaches threshold", () => {
    const input: LosingStreakInput = { currentLosingStreak: 10 };
    const result = evaluateLosingStreak(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_LOSS_STREAK");
    expect(result.measured).toBe(10);
    expect(result.threshold).toBe(10);
  });

  it("AT_RISK when losing streak exceeds threshold", () => {
    const input: LosingStreakInput = { currentLosingStreak: 15 };
    const result = evaluateLosingStreak(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_LOSS_STREAK");
  });

  it("PASS at boundary (one below threshold)", () => {
    const input: LosingStreakInput = { currentLosingStreak: 9 };
    const result = evaluateLosingStreak(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when losing streak is zero", () => {
    const input: LosingStreakInput = { currentLosingStreak: 0 };
    const result = evaluateLosingStreak(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("AT_RISK when losing streak is negative (invalid input)", () => {
    const input: LosingStreakInput = { currentLosingStreak: -1 };
    const result = evaluateLosingStreak(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_INVALID_INPUT");
  });

  it("ruleId is 'losing-streak'", () => {
    const input: LosingStreakInput = { currentLosingStreak: 5 };
    const result = evaluateLosingStreak(input, thresholds);
    expect(result.ruleId).toBe("losing-streak");
  });
});
