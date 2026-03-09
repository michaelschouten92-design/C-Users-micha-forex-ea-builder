import { describe, it, expect } from "vitest";
import { buildEvaluationSummary } from "./evaluation-summary";
import type { EvaluationInput } from "./evaluation-summary";

const healthyInput: EvaluationInput = {
  totalTrades: 500,
  profitFactor: 1.8,
  maxDrawdownPct: 18,
  winRate: 0.6,
};

describe("buildEvaluationSummary", () => {
  it("VERIFIED when all metrics pass", () => {
    const result = buildEvaluationSummary(healthyInput);
    expect(result.verdict).toBe("VERIFIED");
    expect(result.reasons).toEqual([]);
  });

  it("NOT_VERIFIED when too few trades", () => {
    const result = buildEvaluationSummary({ ...healthyInput, totalTrades: 40 });
    expect(result.verdict).toBe("NOT_VERIFIED");
    expect(result.reasons).toEqual(["Too few trades"]);
  });

  it("NOT_VERIFIED when profit factor below threshold", () => {
    const result = buildEvaluationSummary({ ...healthyInput, profitFactor: 0.9 });
    expect(result.verdict).toBe("NOT_VERIFIED");
    expect(result.reasons).toEqual(["Profit factor below minimum threshold"]);
  });

  it("NOT_VERIFIED when drawdown too high", () => {
    const result = buildEvaluationSummary({ ...healthyInput, maxDrawdownPct: 48 });
    expect(result.verdict).toBe("NOT_VERIFIED");
    expect(result.reasons).toEqual(["Drawdown too high"]);
  });

  it("NOT_VERIFIED when win rate too low", () => {
    const result = buildEvaluationSummary({ ...healthyInput, winRate: 0.2 });
    expect(result.verdict).toBe("NOT_VERIFIED");
    expect(result.reasons).toEqual(["Win rate unusually low"]);
  });

  it("NOT_VERIFIED with multiple reasons", () => {
    const result = buildEvaluationSummary({
      totalTrades: 60,
      profitFactor: 0.9,
      maxDrawdownPct: 48,
      winRate: 0.6,
    });
    expect(result.verdict).toBe("NOT_VERIFIED");
    expect(result.reasons).toEqual([
      "Too few trades",
      "Profit factor below minimum threshold",
      "Drawdown too high",
    ]);
  });

  it("limits reasons to 3", () => {
    const result = buildEvaluationSummary({
      totalTrades: 10,
      profitFactor: 0.5,
      maxDrawdownPct: 80,
      winRate: 0.1,
    });
    expect(result.verdict).toBe("NOT_VERIFIED");
    expect(result.reasons).toHaveLength(3);
  });

  it("VERIFIED at exact boundary values", () => {
    const result = buildEvaluationSummary({
      totalTrades: 100,
      profitFactor: 1.2,
      maxDrawdownPct: 35,
      winRate: 0.35,
    });
    expect(result.verdict).toBe("VERIFIED");
    expect(result.reasons).toEqual([]);
  });

  it("is deterministic — same inputs produce same output", () => {
    const a = buildEvaluationSummary(healthyInput);
    const b = buildEvaluationSummary(healthyInput);
    expect(a).toEqual(b);
  });
});
