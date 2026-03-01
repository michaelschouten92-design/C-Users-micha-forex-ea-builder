import { computeVerdict } from "./compute-verdict";
import { VERIFICATION } from "./constants";
import type { VerificationInput } from "./types";

function makeInput(tradeCount: number, composite?: number): VerificationInput {
  return {
    strategyId: "strat-1",
    strategyVersion: 1,
    tradeHistory: Array.from({ length: tradeCount }, () => ({})),
    backtestParameters: {},
    ...(composite !== undefined && {
      intermediateResults: { robustnessScores: { composite } },
    }),
  };
}

describe("computeVerdict", () => {
  describe("D0 — MIN_TRADE_COUNT gate", () => {
    it("rejects 0 trades as NOT_DEPLOYABLE + INSUFFICIENT_DATA", () => {
      const result = computeVerdict(makeInput(0));
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toEqual(["INSUFFICIENT_DATA"]);
    });

    it("rejects 29 trades (just below threshold)", () => {
      const result = computeVerdict(makeInput(29));
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toEqual(["INSUFFICIENT_DATA"]);
    });

    it("passes 30 trades (at threshold) → UNCERTAIN", () => {
      const result = computeVerdict(makeInput(30));
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });

    it("passes 100 trades → UNCERTAIN", () => {
      const result = computeVerdict(makeInput(100));
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });
  });

  describe("determinism", () => {
    it("returns identical output for identical input", () => {
      const input = makeInput(50);
      const a = computeVerdict(input);
      const b = computeVerdict(input);
      expect(a).toEqual(b);
    });
  });

  describe("scores on D0 short-circuit", () => {
    it("has all stage scores null and correct sampleSize", () => {
      const result = computeVerdict(makeInput(5));
      expect(result.scores).toEqual({
        composite: 0,
        walkForwardDegradationPct: null,
        walkForwardOosSampleSize: null,
        monteCarloRuinProbability: null,
        sampleSize: 5,
      });
    });
  });

  describe("thresholdsUsed", () => {
    it("contains all threshold fields", () => {
      const result = computeVerdict(makeInput(50));
      const t = result.thresholdsUsed;
      expect(t.configVersion).toBe(VERIFICATION.CONFIG_VERSION);
      expect(t.minTradeCount).toBe(VERIFICATION.MIN_TRADE_COUNT);
      expect(t.readyConfidenceThreshold).toBe(VERIFICATION.READY_CONFIDENCE_THRESHOLD);
      expect(t.notDeployableThreshold).toBe(VERIFICATION.NOT_DEPLOYABLE_THRESHOLD);
      expect(t.maxSharpeDegradationPct).toBe(VERIFICATION.MAX_SHARPE_DEGRADATION_PCT);
      expect(t.extremeSharpeDegradationPct).toBe(VERIFICATION.EXTREME_SHARPE_DEGRADATION_PCT);
      expect(t.minOosTradeCount).toBe(VERIFICATION.MIN_OOS_TRADE_COUNT);
      expect(t.ruinProbabilityCeiling).toBe(VERIFICATION.RUIN_PROBABILITY_CEILING);
      expect(t.monteCarloIterations).toBe(VERIFICATION.MONTE_CARLO_ITERATIONS);
    });

    it("has a 64-character hex thresholdsHash", () => {
      const result = computeVerdict(makeInput(50));
      expect(result.thresholdsUsed.thresholdsHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("near-minimum warning", () => {
    it("warns when tradeCount is 30–59", () => {
      const result = computeVerdict(makeInput(30));
      expect(result.warnings).toContain("Sample size near minimum threshold");
    });

    it("warns at 59 trades", () => {
      const result = computeVerdict(makeInput(59));
      expect(result.warnings).toContain("Sample size near minimum threshold");
    });

    it("does not warn at 60+ trades", () => {
      const result = computeVerdict(makeInput(60));
      expect(result.warnings).not.toContain("Sample size near minimum threshold");
    });

    it("does not warn on D0 rejection", () => {
      const result = computeVerdict(makeInput(10));
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("D4 — READY path", () => {
    it("composite=1.0 at MIN_TRADE_COUNT → READY + ALL_CHECKS_PASSED", () => {
      const result = computeVerdict(makeInput(VERIFICATION.MIN_TRADE_COUNT, 1.0));
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
    });

    it("composite=0.75 (exact threshold) → READY + ALL_CHECKS_PASSED", () => {
      const result = computeVerdict(makeInput(100, 0.75));
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
    });

    it("composite=0.74 (just below) → UNCERTAIN + COMPOSITE_IN_UNCERTAIN_BAND", () => {
      const result = computeVerdict(makeInput(100, 0.74));
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });

    it("composite=0 (no intermediateResults) → UNCERTAIN (backwards compat)", () => {
      const result = computeVerdict(makeInput(100));
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });

    it("READY result has correct composite in scores", () => {
      const result = computeVerdict(makeInput(100, 0.85));
      expect(result.verdict).toBe("READY");
      expect(result.scores.composite).toBe(0.85);
      expect(result.scores.sampleSize).toBe(100);
    });
  });

  describe("input pass-through", () => {
    it("strategyId and strategyVersion appear in output", () => {
      const input: VerificationInput = {
        strategyId: "my-strategy",
        strategyVersion: 42,
        tradeHistory: Array.from({ length: 50 }, () => ({})),
        backtestParameters: {},
      };
      const result = computeVerdict(input);
      expect(result.strategyId).toBe("my-strategy");
      expect(result.strategyVersion).toBe(42);
    });
  });
});
