import { describe, it, expect } from "vitest";
import {
  mulberry32,
  evaluateMonteCarloRuin,
  type MonteCarloInput,
  type MonteCarloThresholds,
} from "./monte-carlo-ruin";

const DEFAULT_THRESHOLDS: MonteCarloThresholds = {
  ruinProbabilityCeiling: 0.15,
  monteCarloIterations: 10_000,
};

describe("mulberry32 PRNG", () => {
  it("same seed produces identical sequence", () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = Array.from({ length: 100 }, () => rng1());
    const seq2 = Array.from({ length: 100 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("different seeds produce different sequences", () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(99);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it("output is in [0, 1) range", () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 10_000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe("evaluateMonteCarloRuin", () => {
  describe("determinism", () => {
    it("exact same inputs + seed produce identical ruinProbability", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5, 15, -20, 8, -3, 12, -7],
        initialBalance: 100,
      };
      const a = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      const b = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(a.ruinProbability).toBe(b.ruinProbability);
      expect(a).toEqual(b);
    });
  });

  describe("boundary scenarios", () => {
    it("trades that always ruin → ruinProbability ≈ 1.0", () => {
      // All trades are large losses — every path ruins
      const input: MonteCarloInput = {
        tradePnls: [-1000, -1000, -1000],
        initialBalance: 100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.ruinProbability).toBe(1.0);
      expect(result.reasonCode).toBe("RUIN_PROBABILITY_EXCEEDED");
    });

    it("highly profitable trades → ruinProbability ≈ 0.0", () => {
      // All trades are large wins — no path can ruin
      const input: MonteCarloInput = {
        tradePnls: [100, 200, 300, 150, 250],
        initialBalance: 1000,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.ruinProbability).toBe(0);
      expect(result.reasonCode).toBeNull();
    });
  });

  describe("threshold evaluation", () => {
    it("ruinProbability > ceiling → RUIN_PROBABILITY_EXCEEDED", () => {
      // Single huge loss with tiny balance — almost certain ruin
      const input: MonteCarloInput = {
        tradePnls: [-50, -50, -50, -50, 10],
        initialBalance: 60,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.ruinProbability).toBeGreaterThan(0.15);
      expect(result.reasonCode).toBe("RUIN_PROBABILITY_EXCEEDED");
    });

    it("ruinProbability ≤ ceiling → null reasonCode (pass)", () => {
      const input: MonteCarloInput = {
        tradePnls: [50, 50, 50, 50, -10],
        initialBalance: 1000,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.ruinProbability).toBeLessThanOrEqual(0.15);
      expect(result.reasonCode).toBeNull();
    });

    it("custom thresholds are respected", () => {
      // Trades with moderate risk — ruin probability between 0 and 1
      const input: MonteCarloInput = {
        tradePnls: [20, -15, 25, -10, 30],
        initialBalance: 50,
      };
      const strictThresholds: MonteCarloThresholds = {
        ruinProbabilityCeiling: 0.0, // impossibly strict
        monteCarloIterations: 1_000,
      };
      const lenientThresholds: MonteCarloThresholds = {
        ruinProbabilityCeiling: 1.0, // impossibly lenient
        monteCarloIterations: 1_000,
      };
      const strictResult = evaluateMonteCarloRuin(input, strictThresholds, 42);
      const lenientResult = evaluateMonteCarloRuin(input, lenientThresholds, 42);
      // Same data, different ceilings → different outcomes
      expect(strictResult.reasonCode).toBe("RUIN_PROBABILITY_EXCEEDED");
      expect(lenientResult.reasonCode).toBeNull();
    });
  });

  describe("input validation", () => {
    it("empty tradePnls → INVALID_SCORE", () => {
      const input: MonteCarloInput = { tradePnls: [], initialBalance: 100 };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
      expect(result.simulationsRun).toBe(0);
    });

    it("NaN in tradePnls → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, NaN, -5],
        initialBalance: 100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
      expect(result.simulationsRun).toBe(0);
    });

    it("Infinity in tradePnls → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, Infinity, -5],
        initialBalance: 100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
      expect(result.simulationsRun).toBe(0);
    });

    it("-Infinity in tradePnls → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -Infinity, -5],
        initialBalance: 100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
    });

    it("initialBalance ≤ 0 → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5],
        initialBalance: 0,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
    });

    it("negative initialBalance → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5],
        initialBalance: -100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
    });

    it("NaN initialBalance → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5],
        initialBalance: NaN,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
    });

    it("Infinity initialBalance → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5],
        initialBalance: Infinity,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.reasonCode).toBe("INVALID_SCORE");
    });

    it("NaN seed → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5],
        initialBalance: 100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, NaN);
      expect(result.reasonCode).toBe("INVALID_SCORE");
    });

    it("Infinity seed → INVALID_SCORE", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5],
        initialBalance: 100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, Infinity);
      expect(result.reasonCode).toBe("INVALID_SCORE");
    });
  });

  describe("measured values", () => {
    it("measured values match top-level computed values", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5, 15, -20, 8],
        initialBalance: 100,
      };
      const result = evaluateMonteCarloRuin(input, DEFAULT_THRESHOLDS, 42);
      expect(result.measured.ruinProbability).toBe(result.ruinProbability);
      expect(result.measured.simulationsRun).toBe(result.simulationsRun);
    });

    it("simulationsRun matches iterations config", () => {
      const input: MonteCarloInput = {
        tradePnls: [10, -5],
        initialBalance: 100,
      };
      const smallThresholds: MonteCarloThresholds = {
        ruinProbabilityCeiling: 0.15,
        monteCarloIterations: 500,
      };
      const result = evaluateMonteCarloRuin(input, smallThresholds, 42);
      expect(result.simulationsRun).toBe(500);
      expect(result.measured.simulationsRun).toBe(500);
    });
  });
});
