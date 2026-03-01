import { describe, it, expect } from "vitest";
import { runVerification } from "./verification-service";

function makeTrades(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

describe("runVerification", () => {
  it("READY + BACKTESTED → VERIFIED", () => {
    const result = runVerification({
      strategyId: "strat_1",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    expect(result.lifecycleState).toBe("VERIFIED");
    expect(result.transitioned).toBe(true);
    expect(result.verdictResult.verdict).toBe("READY");
  });

  it("UNCERTAIN + BACKTESTED → stays BACKTESTED", () => {
    const result = runVerification({
      strategyId: "strat_2",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
    });

    expect(result.lifecycleState).toBe("BACKTESTED");
    expect(result.transitioned).toBe(false);
    expect(result.verdictResult.verdict).toBe("UNCERTAIN");
  });

  it("NOT_DEPLOYABLE + BACKTESTED → stays BACKTESTED", () => {
    const result = runVerification({
      strategyId: "strat_3",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(5),
      backtestParameters: {},
    });

    expect(result.lifecycleState).toBe("BACKTESTED");
    expect(result.transitioned).toBe(false);
    expect(result.verdictResult.verdict).toBe("NOT_DEPLOYABLE");
  });

  it("READY + not BACKTESTED → no transition (guarded)", () => {
    const result = runVerification({
      strategyId: "strat_4",
      strategyVersion: 1,
      currentLifecycleState: "DRAFT",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    expect(result.lifecycleState).toBe("DRAFT");
    expect(result.transitioned).toBe(false);
  });
});
