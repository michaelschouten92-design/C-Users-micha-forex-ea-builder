import { computeVerdict } from "./compute-verdict";
import { VERIFICATION } from "./constants";
import { buildConfigSnapshot } from "./config-snapshot";
import type { VerificationInput } from "./types";

const CONFIG = buildConfigSnapshot();

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
      const result = computeVerdict(makeInput(0), CONFIG);
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toEqual(["INSUFFICIENT_DATA"]);
    });

    it("rejects 29 trades (just below threshold)", () => {
      const result = computeVerdict(makeInput(29), CONFIG);
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toEqual(["INSUFFICIENT_DATA"]);
    });

    it("passes 30 trades (at threshold) → UNCERTAIN", () => {
      const result = computeVerdict(makeInput(30), CONFIG);
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });

    it("passes 100 trades → UNCERTAIN", () => {
      const result = computeVerdict(makeInput(100), CONFIG);
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });
  });

  describe("determinism", () => {
    it("returns identical output for identical input", () => {
      const input = makeInput(50);
      const a = computeVerdict(input, CONFIG);
      const b = computeVerdict(input, CONFIG);
      expect(a).toEqual(b);
    });
  });

  describe("scores on D0 short-circuit", () => {
    it("has all stage scores null and correct sampleSize", () => {
      const result = computeVerdict(makeInput(5), CONFIG);
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
      const result = computeVerdict(makeInput(50), CONFIG);
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
      const result = computeVerdict(makeInput(50), CONFIG);
      expect(result.thresholdsUsed.thresholdsHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("near-minimum warning", () => {
    it("warns when tradeCount is 30–59", () => {
      const result = computeVerdict(makeInput(30), CONFIG);
      expect(result.warnings).toContain("Sample size near minimum threshold");
    });

    it("warns at 59 trades", () => {
      const result = computeVerdict(makeInput(59), CONFIG);
      expect(result.warnings).toContain("Sample size near minimum threshold");
    });

    it("does not warn at 60+ trades", () => {
      const result = computeVerdict(makeInput(60), CONFIG);
      expect(result.warnings).not.toContain("Sample size near minimum threshold");
    });

    it("does not warn on D0 rejection", () => {
      const result = computeVerdict(makeInput(10), CONFIG);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("D4 — READY path", () => {
    it("composite=1.0 at MIN_TRADE_COUNT → READY + ALL_CHECKS_PASSED", () => {
      const result = computeVerdict(makeInput(VERIFICATION.MIN_TRADE_COUNT, 1.0), CONFIG);
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
    });

    it("composite at exact threshold → READY + ALL_CHECKS_PASSED", () => {
      const result = computeVerdict(
        makeInput(100, VERIFICATION.READY_CONFIDENCE_THRESHOLD),
        CONFIG
      );
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
    });

    it("composite just below threshold → UNCERTAIN + COMPOSITE_IN_UNCERTAIN_BAND", () => {
      const result = computeVerdict(
        makeInput(100, VERIFICATION.READY_CONFIDENCE_THRESHOLD - 0.01),
        CONFIG
      );
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });

    it("composite=0 (no intermediateResults) → UNCERTAIN (backwards compat)", () => {
      const result = computeVerdict(makeInput(100), CONFIG);
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toEqual(["COMPOSITE_IN_UNCERTAIN_BAND"]);
    });

    it("READY result has correct composite in scores", () => {
      const result = computeVerdict(makeInput(100, 0.85), CONFIG);
      expect(result.verdict).toBe("READY");
      expect(result.scores.composite).toBe(0.85);
      expect(result.scores.sampleSize).toBe(100);
    });
  });

  describe("config injection", () => {
    it("uses injected thresholds — custom minTradeCount", () => {
      const customConfig = {
        ...CONFIG,
        thresholds: { ...CONFIG.thresholds, minTradeCount: 10 },
      };
      // 15 trades passes minTradeCount=10 but would fail minTradeCount=30
      const result = computeVerdict(makeInput(15), customConfig);
      expect(result.verdict).not.toBe("NOT_DEPLOYABLE");
    });

    it("uses injected thresholds — custom readyConfidenceThreshold", () => {
      const customConfig = {
        ...CONFIG,
        thresholds: { ...CONFIG.thresholds, readyConfidenceThreshold: 0.5 },
      };
      // composite=0.6 passes threshold=0.5 but would fail threshold=0.75
      const result = computeVerdict(makeInput(100, 0.6), customConfig);
      expect(result.verdict).toBe("READY");
    });
  });

  describe("D1 — Walk-Forward Degradation integration", () => {
    /** Helper: build input with walk-forward stage results. */
    function makeWfInput(
      tradeCount: number,
      composite: number,
      wf: { sharpeDegradationPct: number; outOfSampleTradeCount: number }
    ): VerificationInput {
      return {
        strategyId: "strat-1",
        strategyVersion: 1,
        tradeHistory: Array.from({ length: tradeCount }, () => ({})),
        backtestParameters: {},
        intermediateResults: {
          robustnessScores: { composite },
          walkForward: wf,
        },
      };
    }

    it("D1 pass + high composite → READY with walk-forward scores populated", () => {
      const result = computeVerdict(
        makeWfInput(100, 0.9, { sharpeDegradationPct: 20, outOfSampleTradeCount: 50 }),
        CONFIG
      );
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
      expect(result.scores.walkForwardDegradationPct).toBe(20);
      expect(result.scores.walkForwardOosSampleSize).toBe(50);
    });

    it("D1a (moderate + enough OOS) blocks READY → NOT_DEPLOYABLE", () => {
      const result = computeVerdict(
        makeWfInput(100, 0.9, { sharpeDegradationPct: 50, outOfSampleTradeCount: 25 }),
        CONFIG
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("WALK_FORWARD_DEGRADATION_EXTREME");
      expect(result.scores.walkForwardDegradationPct).toBe(50);
      expect(result.scores.walkForwardOosSampleSize).toBe(25);
    });

    it("D1b (moderate + thin OOS) blocks READY → UNCERTAIN", () => {
      const result = computeVerdict(
        makeWfInput(100, 0.9, { sharpeDegradationPct: 50, outOfSampleTradeCount: 10 }),
        CONFIG
      );
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.reasonCodes).toContain("WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE");
    });

    it("D1c (extreme) → NOT_DEPLOYABLE regardless of composite or OOS count", () => {
      const result = computeVerdict(
        makeWfInput(100, 1.0, { sharpeDegradationPct: 85, outOfSampleTradeCount: 0 }),
        CONFIG
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("WALK_FORWARD_DEGRADATION_EXTREME");
    });

    it("D0 short-circuits before D1 — walk-forward scores stay null", () => {
      const input: VerificationInput = {
        strategyId: "strat-1",
        strategyVersion: 1,
        tradeHistory: Array.from({ length: 5 }, () => ({})),
        backtestParameters: {},
        intermediateResults: {
          robustnessScores: { composite: 0.9 },
          walkForward: { sharpeDegradationPct: 85, outOfSampleTradeCount: 50 },
        },
      };
      const result = computeVerdict(input, CONFIG);
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toEqual(["INSUFFICIENT_DATA"]);
      expect(result.scores.walkForwardDegradationPct).toBeNull();
      expect(result.scores.walkForwardOosSampleSize).toBeNull();
    });

    it("no walkForward stage → scores stay null, no D1 flags", () => {
      const result = computeVerdict(makeInput(100, 0.9), CONFIG);
      expect(result.verdict).toBe("READY");
      expect(result.scores.walkForwardDegradationPct).toBeNull();
      expect(result.scores.walkForwardOosSampleSize).toBeNull();
    });

    it("NaN degradation → INVALID_SCORE → NOT_DEPLOYABLE", () => {
      const result = computeVerdict(
        makeWfInput(100, 0.9, { sharpeDegradationPct: NaN, outOfSampleTradeCount: 50 }),
        CONFIG
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("INVALID_SCORE");
    });

    it("negative OOS trade count → INVALID_SCORE → NOT_DEPLOYABLE", () => {
      const result = computeVerdict(
        makeWfInput(100, 0.9, { sharpeDegradationPct: 20, outOfSampleTradeCount: -1 }),
        CONFIG
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("INVALID_SCORE");
    });

    it("Infinity degradation → INVALID_SCORE → NOT_DEPLOYABLE", () => {
      const result = computeVerdict(
        makeWfInput(100, 0.9, {
          sharpeDegradationPct: Infinity,
          outOfSampleTradeCount: 50,
        }),
        CONFIG
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("INVALID_SCORE");
    });

    it("READY with D1 pass has exactly ['ALL_CHECKS_PASSED'] reason codes", () => {
      const result = computeVerdict(
        makeWfInput(100, 0.9, { sharpeDegradationPct: 10, outOfSampleTradeCount: 50 }),
        CONFIG
      );
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
    });
  });

  describe("D2 — Monte Carlo Ruin Probability integration", () => {
    const MC_SEED = 12345;

    /** Helper: build input with monteCarlo stage results. */
    function makeMcInput(
      tradeCount: number,
      composite: number,
      mc: { tradePnls: number[]; initialBalance: number },
      wf?: { sharpeDegradationPct: number; outOfSampleTradeCount: number }
    ): VerificationInput {
      return {
        strategyId: "strat-1",
        strategyVersion: 1,
        tradeHistory: Array.from({ length: tradeCount }, () => ({})),
        backtestParameters: {},
        intermediateResults: {
          robustnessScores: { composite },
          ...(wf && { walkForward: wf }),
          monteCarlo: mc,
        },
      };
    }

    it("D2 pass + high composite → READY with monteCarloRuinProbability populated", () => {
      const result = computeVerdict(
        makeMcInput(100, 0.9, {
          tradePnls: [50, 50, 50, 50, -10],
          initialBalance: 1000,
        }),
        CONFIG,
        { monteCarloSeed: MC_SEED }
      );
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
      expect(result.scores.monteCarloRuinProbability).not.toBeNull();
      expect(result.scores.monteCarloRuinProbability).toBeGreaterThanOrEqual(0);
    });

    it("D2 fail (ruinProbability > ceiling) → NOT_DEPLOYABLE + RUIN_PROBABILITY_EXCEEDED", () => {
      const result = computeVerdict(
        makeMcInput(100, 0.9, {
          tradePnls: [-1000, -1000, -1000],
          initialBalance: 100,
        }),
        CONFIG,
        { monteCarloSeed: MC_SEED }
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("RUIN_PROBABILITY_EXCEEDED");
      expect(result.scores.monteCarloRuinProbability).toBe(1.0);
    });

    it("D0 short-circuits before D2 — MC score stays null", () => {
      const input: VerificationInput = {
        strategyId: "strat-1",
        strategyVersion: 1,
        tradeHistory: Array.from({ length: 5 }, () => ({})),
        backtestParameters: {},
        intermediateResults: {
          robustnessScores: { composite: 0.9 },
          monteCarlo: {
            tradePnls: [-1000, -1000, -1000],
            initialBalance: 100,
          },
        },
      };
      const result = computeVerdict(input, CONFIG, { monteCarloSeed: MC_SEED });
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toEqual(["INSUFFICIENT_DATA"]);
      expect(result.scores.monteCarloRuinProbability).toBeNull();
    });

    it("no monteCarlo data → D2 skipped, score stays null", () => {
      const result = computeVerdict(makeInput(100, 0.9), CONFIG, {
        monteCarloSeed: MC_SEED,
      });
      expect(result.verdict).toBe("READY");
      expect(result.scores.monteCarloRuinProbability).toBeNull();
    });

    it("no seed → D2 skipped, score stays null", () => {
      const result = computeVerdict(
        makeMcInput(100, 0.9, {
          tradePnls: [50, 50, 50, 50, -10],
          initialBalance: 1000,
        }),
        CONFIG
      );
      expect(result.verdict).toBe("READY");
      expect(result.scores.monteCarloRuinProbability).toBeNull();
    });

    it("NaN tradePnls → INVALID_SCORE → NOT_DEPLOYABLE", () => {
      const result = computeVerdict(
        makeMcInput(100, 0.9, {
          tradePnls: [10, NaN, -5],
          initialBalance: 100,
        }),
        CONFIG,
        { monteCarloSeed: MC_SEED }
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("INVALID_SCORE");
    });

    it("D1 fail + D2 fail → both reason codes accumulated", () => {
      const result = computeVerdict(
        makeMcInput(
          100,
          0.9,
          { tradePnls: [-1000, -1000, -1000], initialBalance: 100 },
          { sharpeDegradationPct: 85, outOfSampleTradeCount: 50 }
        ),
        CONFIG,
        { monteCarloSeed: MC_SEED }
      );
      expect(result.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.reasonCodes).toContain("WALK_FORWARD_DEGRADATION_EXTREME");
      expect(result.reasonCodes).toContain("RUIN_PROBABILITY_EXCEEDED");
    });

    it("READY with D2 pass has exactly ['ALL_CHECKS_PASSED']", () => {
      const result = computeVerdict(
        makeMcInput(100, 0.9, {
          tradePnls: [100, 200, 300, 150, 250],
          initialBalance: 1000,
        }),
        CONFIG,
        { monteCarloSeed: MC_SEED }
      );
      expect(result.verdict).toBe("READY");
      expect(result.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
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
      const result = computeVerdict(input, CONFIG);
      expect(result.strategyId).toBe("my-strategy");
      expect(result.strategyVersion).toBe(42);
    });
  });
});
