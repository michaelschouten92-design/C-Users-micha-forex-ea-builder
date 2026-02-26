import { describe, it, expect } from "vitest";
import { computeTrustScore, computeBadges, type TrustScoreInput } from "./trust-score";
import type { LadderLevel } from "@prisma/client";

// ============================================
// HELPERS
// ============================================

function makeStrategy(overrides: Partial<TrustScoreInput["strategies"][0]> = {}) {
  return {
    ladderLevel: "PROVEN" as LadderLevel,
    backtestHealthScore: 75 as number | null,
    liveTrades: 200,
    liveDays: 120,
    liveMaxDrawdownPct: 15 as number | null,
    liveHealthScore: 0.7 as number | null,
    ...overrides,
  };
}

function makeInput(overrides?: { strategies?: TrustScoreInput["strategies"] }): TrustScoreInput {
  return {
    strategies: overrides?.strategies ?? [makeStrategy()],
  };
}

// ============================================
// computeTrustScore
// ============================================

describe("computeTrustScore", () => {
  it("returns a score between 0 and 100", () => {
    const result = computeTrustScore(makeInput());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns higher scores for higher ladder levels", () => {
    const submitted = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ ladderLevel: "SUBMITTED" })] })
    );
    const validated = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ ladderLevel: "VALIDATED" })] })
    );
    const verified = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ ladderLevel: "VERIFIED" })] })
    );
    const proven = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ ladderLevel: "PROVEN" })] })
    );

    expect(proven.score).toBeGreaterThan(verified.score);
    expect(verified.score).toBeGreaterThan(validated.score);
    expect(validated.score).toBeGreaterThan(submitted.score);
  });

  it("includes breakdown approximately summing to total score", () => {
    const result = computeTrustScore(makeInput());
    const { levelPoints, healthPoints, depthPoints, consistencyPoints } = result.breakdown;
    const sum = levelPoints + healthPoints + depthPoints + consistencyPoints;
    // Score is Math.round of sum, so they should be close
    expect(Math.abs(sum - result.score)).toBeLessThanOrEqual(1);
  });

  it("caps level points at 40", () => {
    const result = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ ladderLevel: "INSTITUTIONAL" })] })
    );
    expect(result.breakdown.levelPoints).toBeLessThanOrEqual(40);
  });

  it("caps health points at 25", () => {
    const result = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ backtestHealthScore: 100 })] })
    );
    expect(result.breakdown.healthPoints).toBeLessThanOrEqual(25);
  });

  it("returns 0 for empty strategies", () => {
    const result = computeTrustScore({ strategies: [] });
    expect(result.score).toBe(0);
    expect(result.level).toBe("SUBMITTED");
  });

  it("awards depth points for live trades and days", () => {
    const few = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ liveTrades: 10, liveDays: 5 })] })
    );
    const many = computeTrustScore(
      makeInput({ strategies: [makeStrategy({ liveTrades: 500, liveDays: 365 })] })
    );
    expect(many.breakdown.depthPoints).toBeGreaterThan(few.breakdown.depthPoints);
  });

  it("awards consistency points for stable + low-drawdown strategies", () => {
    const stable = computeTrustScore(
      makeInput({
        strategies: [makeStrategy({ liveHealthScore: 0.8, liveMaxDrawdownPct: 10 })],
      })
    );
    const unstable = computeTrustScore(
      makeInput({
        strategies: [makeStrategy({ liveHealthScore: 0.3, liveMaxDrawdownPct: 40 })],
      })
    );
    expect(stable.breakdown.consistencyPoints).toBeGreaterThan(
      unstable.breakdown.consistencyPoints
    );
  });
});

// ============================================
// computeBadges
// ============================================

describe("computeBadges", () => {
  it("returns an array of badges", () => {
    const badges = computeBadges([makeStrategy()]);
    expect(Array.isArray(badges)).toBe(true);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("awards consistent badge for 30+ live days with healthy score", () => {
    const badges = computeBadges([makeStrategy({ liveDays: 31, liveHealthScore: 0.75 })]);
    const consistent = badges.find((b) => b.id === "consistent");
    expect(consistent?.earned).toBe(true);
  });

  it("does not award consistent badge for short duration", () => {
    const badges = computeBadges([makeStrategy({ liveDays: 10, liveHealthScore: 0.75 })]);
    const consistent = badges.find((b) => b.id === "consistent");
    expect(consistent?.earned).toBe(false);
  });

  it("awards low-dd badge for max drawdown <= 10%", () => {
    const badges = computeBadges([makeStrategy({ liveMaxDrawdownPct: 8 })]);
    const lowDD = badges.find((b) => b.id === "low-dd");
    expect(lowDD?.earned).toBe(true);
  });

  it("does not award low-dd badge for high drawdown", () => {
    const badges = computeBadges([makeStrategy({ liveMaxDrawdownPct: 25 })]);
    const lowDD = badges.find((b) => b.id === "low-dd");
    expect(lowDD?.earned).toBe(false);
  });

  it("awards execution-quality badge for verified+ strategies", () => {
    const badges = computeBadges([makeStrategy({ ladderLevel: "VERIFIED" })]);
    const eq = badges.find((b) => b.id === "execution-quality");
    expect(eq?.earned).toBe(true);
  });

  it("awards multi-strategy badge for 2+ validated strategies", () => {
    const badges = computeBadges([
      makeStrategy({ ladderLevel: "VALIDATED" }),
      makeStrategy({ ladderLevel: "VERIFIED" }),
    ]);
    const multi = badges.find((b) => b.id === "multi-strategy");
    expect(multi?.earned).toBe(true);
  });

  it("does not award multi-strategy with only 1 strategy", () => {
    const badges = computeBadges([makeStrategy({ ladderLevel: "VALIDATED" })]);
    const multi = badges.find((b) => b.id === "multi-strategy");
    expect(multi?.earned).toBe(false);
  });

  it("does not award badges for SUBMITTED-only strategies", () => {
    const badges = computeBadges([
      makeStrategy({
        ladderLevel: "SUBMITTED",
        liveDays: 5,
        liveHealthScore: 0.2,
        liveMaxDrawdownPct: 50,
      }),
    ]);
    const earned = badges.filter((b) => b.earned);
    expect(earned.length).toBe(0);
  });
});
