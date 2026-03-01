import { describe, it, expect } from "vitest";
import { evaluateWalkForwardDegradation } from "./walk-forward";
import type { WalkForwardInput, WalkForwardThresholds } from "./walk-forward";

/** Default thresholds matching VERIFICATION constants. */
const THRESHOLDS: WalkForwardThresholds = {
  maxSharpeDegradationPct: 40,
  extremeSharpeDegradationPct: 80,
  minOosTradeCount: 20,
};

describe("evaluateWalkForwardDegradation", () => {
  describe("pass — degradation within limits", () => {
    it("0% degradation → pass", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 0, outOfSampleTradeCount: 50 },
        THRESHOLDS
      );
      expect(result.tier).toBe("pass");
      expect(result.reasonCode).toBeNull();
    });

    it("degradation at exact MAX threshold (40%) → pass (not >)", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 40, outOfSampleTradeCount: 50 },
        THRESHOLDS
      );
      expect(result.tier).toBe("pass");
      expect(result.reasonCode).toBeNull();
    });

    it("degradation just below MAX threshold (39.99%) → pass", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 39.99, outOfSampleTradeCount: 50 },
        THRESHOLDS
      );
      expect(result.tier).toBe("pass");
      expect(result.reasonCode).toBeNull();
    });

    it("negative degradation (OOS better than IS) → pass", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: -10, outOfSampleTradeCount: 50 },
        THRESHOLDS
      );
      expect(result.tier).toBe("pass");
      expect(result.reasonCode).toBeNull();
    });
  });

  describe("D1a — moderate degradation with sufficient OOS data", () => {
    it("degradation 41% with 20 OOS trades → D1a NOT_DEPLOYABLE", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 41, outOfSampleTradeCount: 20 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1a");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });

    it("degradation 60% with 100 OOS trades → D1a", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 60, outOfSampleTradeCount: 100 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1a");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });

    it("degradation just above MAX (40.01%) with exact MIN_OOS (20) → D1a", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 40.01, outOfSampleTradeCount: 20 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1a");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });

    it("degradation at exact EXTREME threshold (80%) with enough OOS → D1a (not D1c)", () => {
      // 80% is NOT > 80%, so it's moderate-band with enough OOS → D1a
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 80, outOfSampleTradeCount: 50 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1a");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });
  });

  describe("D1b — moderate degradation with thin OOS data", () => {
    it("degradation 41% with 19 OOS trades → D1b UNCERTAIN", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 41, outOfSampleTradeCount: 19 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1b");
      expect(result.reasonCode).toBe("WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE");
    });

    it("degradation 60% with 0 OOS trades → D1b", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 60, outOfSampleTradeCount: 0 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1b");
      expect(result.reasonCode).toBe("WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE");
    });

    it("degradation at 80% with thin OOS (19) → D1b (moderate band, thin data)", () => {
      // 80% is NOT > 80%, so it's in the moderate band; thin OOS → D1b
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 80, outOfSampleTradeCount: 19 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1b");
      expect(result.reasonCode).toBe("WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE");
    });
  });

  describe("D1c — extreme degradation (regardless of OOS count)", () => {
    it("degradation 81% with many OOS trades → D1c NOT_DEPLOYABLE", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 81, outOfSampleTradeCount: 100 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1c");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });

    it("degradation 81% with 0 OOS trades → D1c (overrides thin-OOS gate)", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 81, outOfSampleTradeCount: 0 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1c");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });

    it("degradation 200% → D1c", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 200, outOfSampleTradeCount: 50 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1c");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });

    it("degradation just above EXTREME (80.01%) → D1c", () => {
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 80.01, outOfSampleTradeCount: 50 },
        THRESHOLDS
      );
      expect(result.tier).toBe("D1c");
      expect(result.reasonCode).toBe("WALK_FORWARD_DEGRADATION_EXTREME");
    });
  });

  describe("measured values pass-through", () => {
    it("measured values match input exactly", () => {
      const input: WalkForwardInput = {
        sharpeDegradationPct: 35.7,
        outOfSampleTradeCount: 42,
      };
      const result = evaluateWalkForwardDegradation(input, THRESHOLDS);
      expect(result.measured).toEqual(input);
    });
  });

  describe("custom thresholds", () => {
    it("respects custom maxSharpeDegradationPct", () => {
      const custom: WalkForwardThresholds = {
        ...THRESHOLDS,
        maxSharpeDegradationPct: 20,
      };
      // 25% would pass with default (40) but fails with custom (20)
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 25, outOfSampleTradeCount: 50 },
        custom
      );
      expect(result.tier).toBe("D1a");
    });

    it("respects custom extremeSharpeDegradationPct", () => {
      const custom: WalkForwardThresholds = {
        ...THRESHOLDS,
        extremeSharpeDegradationPct: 50,
      };
      // 55% would be D1a with default (extreme=80) but D1c with custom (extreme=50)
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 55, outOfSampleTradeCount: 50 },
        custom
      );
      expect(result.tier).toBe("D1c");
    });

    it("respects custom minOosTradeCount", () => {
      const custom: WalkForwardThresholds = {
        ...THRESHOLDS,
        minOosTradeCount: 50,
      };
      // 20 OOS would be D1a with default (minOos=20) but D1b with custom (minOos=50)
      const result = evaluateWalkForwardDegradation(
        { sharpeDegradationPct: 50, outOfSampleTradeCount: 20 },
        custom
      );
      expect(result.tier).toBe("D1b");
    });
  });

  describe("determinism", () => {
    it("identical inputs produce identical outputs", () => {
      const input: WalkForwardInput = {
        sharpeDegradationPct: 45,
        outOfSampleTradeCount: 25,
      };
      const a = evaluateWalkForwardDegradation(input, THRESHOLDS);
      const b = evaluateWalkForwardDegradation(input, THRESHOLDS);
      expect(a).toEqual(b);
    });
  });
});
