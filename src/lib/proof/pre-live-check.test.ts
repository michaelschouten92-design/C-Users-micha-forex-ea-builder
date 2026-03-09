import { describe, it, expect } from "vitest";
import {
  computePreLiveVerdict,
  extractPreLiveInput,
  type PreLiveCheckInput,
} from "./pre-live-check";
import type { BacktestRun } from "@prisma/client";

// ============================================
// HELPERS
// ============================================

function makeInput(overrides: Partial<PreLiveCheckInput> = {}): PreLiveCheckInput {
  return {
    healthScore: 85,
    healthStatus: "ROBUST",
    totalTrades: 200,
    profitFactor: 1.8,
    maxDrawdownPct: 15,
    expectedPayoff: 5.5,
    winRate: 0.6,
    sharpeRatio: 1.2,
    recoveryFactor: 2.5,
    confidenceLower: 70,
    confidenceUpper: 95,
    warnings: [],
    monteCarlo: {
      survivalRate: 0.9,
      p5: 5,
      p50: 25,
      p95: 60,
    },
    ...overrides,
  };
}

// ============================================
// HARD GATES
// ============================================

describe("computePreLiveVerdict — Hard Gates", () => {
  it("H1: fails when totalTrades < 100", () => {
    const result = computePreLiveVerdict(makeInput({ totalTrades: 99 }));
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H1")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "INSUFFICIENT_TRADES")).toBe(true);
  });

  it("H1: passes when totalTrades = 100", () => {
    const result = computePreLiveVerdict(makeInput({ totalTrades: 100 }));
    expect(result.verdict).toBe("READY");
    expect(result.gateResults.find((g) => g.gate === "H1")?.passed).toBe(true);
  });

  it("H2: fails when healthScore < 50", () => {
    const result = computePreLiveVerdict(makeInput({ healthScore: 49 }));
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H2")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "LOW_HEALTH_SCORE")).toBe(true);
  });

  it("H2: passes when healthScore = 50", () => {
    const result = computePreLiveVerdict(makeInput({ healthScore: 50, healthStatus: "MODERATE" }));
    expect(result.gateResults.find((g) => g.gate === "H2")?.passed).toBe(true);
  });

  it("H3: fails when healthStatus is WEAK", () => {
    const result = computePreLiveVerdict(makeInput({ healthStatus: "WEAK" }));
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H3")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "HEALTH_STATUS_WEAK")).toBe(true);
  });

  it("H3: fails when healthStatus is INSUFFICIENT_DATA", () => {
    const result = computePreLiveVerdict(makeInput({ healthStatus: "INSUFFICIENT_DATA" }));
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H3")?.passed).toBe(false);
  });

  it("H3: passes when healthStatus is MODERATE", () => {
    const result = computePreLiveVerdict(makeInput({ healthScore: 60, healthStatus: "MODERATE" }));
    expect(result.gateResults.find((g) => g.gate === "H3")?.passed).toBe(true);
  });

  it("H4: fails when expectedPayoff <= 0", () => {
    const result = computePreLiveVerdict(makeInput({ expectedPayoff: 0 }));
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H4")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "LOW_EXPECTED_PAYOFF")).toBe(true);
  });

  it("H4: fails when expectedPayoff is negative", () => {
    const result = computePreLiveVerdict(makeInput({ expectedPayoff: -2.5 }));
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H4")?.passed).toBe(false);
  });

  it("H5: fails when profitFactor < 1.0", () => {
    const result = computePreLiveVerdict(makeInput({ profitFactor: 0.95 }));
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H5")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "LOW_PROFIT_FACTOR")).toBe(true);
  });

  it("H5: passes when profitFactor = 1.0", () => {
    const result = computePreLiveVerdict(makeInput({ profitFactor: 1.0 }));
    expect(result.gateResults.find((g) => g.gate === "H5")?.passed).toBe(true);
  });

  it("collects ALL hard gate failures (no short-circuit)", () => {
    const result = computePreLiveVerdict(
      makeInput({
        totalTrades: 50,
        healthScore: 30,
        healthStatus: "WEAK",
        expectedPayoff: -1,
        profitFactor: 0.5,
      })
    );
    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    const failedHard = result.gateResults.filter((g) => g.hard && !g.passed);
    expect(failedHard).toHaveLength(5);
    expect(result.reasons.filter((r) => r.severity === "error").length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================
// SOFT GATES
// ============================================

describe("computePreLiveVerdict — Soft Gates", () => {
  it("S1: fails when Monte Carlo survivalRate < 0.70", () => {
    const result = computePreLiveVerdict(
      makeInput({ monteCarlo: { survivalRate: 0.69, p5: 5, p50: 25, p95: 60 } })
    );
    expect(result.gateResults.find((g) => g.gate === "S1")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "LOW_SURVIVAL_RATE")).toBe(true);
  });

  it("S1: passes when survivalRate = 0.70", () => {
    const result = computePreLiveVerdict(
      makeInput({ monteCarlo: { survivalRate: 0.7, p5: 5, p50: 25, p95: 60 } })
    );
    expect(result.gateResults.find((g) => g.gate === "S1")?.passed).toBe(true);
  });

  it("S2: fails when Monte Carlo p5 < 0", () => {
    const result = computePreLiveVerdict(
      makeInput({ monteCarlo: { survivalRate: 0.9, p5: -1, p50: 25, p95: 60 } })
    );
    expect(result.gateResults.find((g) => g.gate === "S2")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "NEGATIVE_P5_RETURN")).toBe(true);
  });

  it("S3: fails when maxDrawdownPct > 30", () => {
    const result = computePreLiveVerdict(makeInput({ maxDrawdownPct: 31 }));
    expect(result.gateResults.find((g) => g.gate === "S3")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "EXCESSIVE_DRAWDOWN")).toBe(true);
  });

  it("S3: passes when maxDrawdownPct = 30", () => {
    const result = computePreLiveVerdict(makeInput({ maxDrawdownPct: 30 }));
    expect(result.gateResults.find((g) => g.gate === "S3")?.passed).toBe(true);
  });

  it("S4: fails when warnings are present", () => {
    const result = computePreLiveVerdict(makeInput({ warnings: ["Martingale detected"] }));
    expect(result.gateResults.find((g) => g.gate === "S4")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "BACKTEST_WARNINGS")).toBe(true);
  });

  it("S5: fails when healthScore < 80", () => {
    const result = computePreLiveVerdict(makeInput({ healthScore: 79, healthStatus: "MODERATE" }));
    expect(result.gateResults.find((g) => g.gate === "S5")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "BELOW_ROBUST_SCORE")).toBe(true);
  });

  it("S6: fails when sharpeRatio < 0.5", () => {
    const result = computePreLiveVerdict(makeInput({ sharpeRatio: 0.4 }));
    expect(result.gateResults.find((g) => g.gate === "S6")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "LOW_SHARPE")).toBe(true);
  });

  it("S6: skipped (passed) when sharpeRatio is null", () => {
    const result = computePreLiveVerdict(makeInput({ sharpeRatio: null }));
    expect(result.gateResults.find((g) => g.gate === "S6")?.passed).toBe(true);
    expect(result.reasons.some((r) => r.type === "LOW_SHARPE")).toBe(false);
  });

  it("S7: fails when recoveryFactor < 1.0", () => {
    const result = computePreLiveVerdict(makeInput({ recoveryFactor: 0.8 }));
    expect(result.gateResults.find((g) => g.gate === "S7")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "LOW_RECOVERY_FACTOR")).toBe(true);
  });

  it("S7: skipped (passed) when recoveryFactor is null", () => {
    const result = computePreLiveVerdict(makeInput({ recoveryFactor: null }));
    expect(result.gateResults.find((g) => g.gate === "S7")?.passed).toBe(true);
    expect(result.reasons.some((r) => r.type === "LOW_RECOVERY_FACTOR")).toBe(false);
  });
});

// ============================================
// MISSING DATA SCENARIOS
// ============================================

describe("computePreLiveVerdict — Missing Data", () => {
  it("missing monteCarlo → S1/S2 fail with MISSING_MONTE_CARLO reason", () => {
    const result = computePreLiveVerdict(makeInput({ monteCarlo: null }));
    expect(result.gateResults.find((g) => g.gate === "S1")?.passed).toBe(false);
    expect(result.gateResults.find((g) => g.gate === "S2")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "MISSING_MONTE_CARLO")).toBe(true);
    expect(result.actions.some((a) => a.label === "Run Monte Carlo validation")).toBe(true);
  });

  it("missing MC → clearly UNCERTAIN", () => {
    const result = computePreLiveVerdict(makeInput({ monteCarlo: null }));
    expect(result.verdict).toBe("UNCERTAIN");
    // S1(3) + S2(1) = 4 failed weight >= threshold
  });
});

// ============================================
// THRESHOLD BOUNDARIES (UNCERTAIN_WEIGHT_THRESHOLD = 4)
// ============================================

describe("computePreLiveVerdict — Threshold Boundaries", () => {
  it("soft weight exactly at threshold → UNCERTAIN", () => {
    // Missing MC only: S1(3) + S2(1) = 4 failed weight = threshold
    const result = computePreLiveVerdict(makeInput({ monteCarlo: null }));
    expect(result.verdict).toBe("UNCERTAIN");
  });

  it("soft weight just below threshold → READY", () => {
    // S4(1) warning + S5(1) below robust + S6(1) low sharpe = 3 < 4
    const result = computePreLiveVerdict(
      makeInput({
        healthScore: 75,
        healthStatus: "MODERATE",
        sharpeRatio: 0.3,
        warnings: ["Minor issue"],
      })
    );
    expect(result.verdict).toBe("READY");
  });
});

// ============================================
// REASON ORDERING
// ============================================

describe("computePreLiveVerdict — Reason Ordering", () => {
  it("orders errors before warnings, limits to top 3", () => {
    const result = computePreLiveVerdict(
      makeInput({
        totalTrades: 50,
        healthScore: 30,
        healthStatus: "WEAK",
        expectedPayoff: -1,
        profitFactor: 0.5,
        monteCarlo: null,
        warnings: ["Test warning"],
      })
    );
    // Should have many reasons but only 3 returned
    expect(result.reasons).toHaveLength(3);
    // All returned reasons should be errors (since there are 5 hard gate failures)
    expect(result.reasons.every((r) => r.severity === "error")).toBe(true);
  });
});

// ============================================
// READINESS SCORE
// ============================================

describe("computePreLiveVerdict — Readiness Score", () => {
  it("all pass → readinessScore = 100", () => {
    const result = computePreLiveVerdict(makeInput());
    expect(result.readinessScore).toBe(100);
  });

  it("all hard + all soft fail → low score", () => {
    const result = computePreLiveVerdict(
      makeInput({
        totalTrades: 50,
        healthScore: 30,
        healthStatus: "WEAK",
        expectedPayoff: -1,
        profitFactor: 0.5,
        monteCarlo: null,
        maxDrawdownPct: 40,
        warnings: ["Warning"],
        sharpeRatio: 0.1,
        recoveryFactor: 0.3,
      })
    );
    expect(result.readinessScore).toBe(0);
  });

  it("all hard pass, all soft fail → score between 0 and 100", () => {
    const result = computePreLiveVerdict(
      makeInput({
        healthScore: 60,
        healthStatus: "MODERATE",
        totalTrades: 200,
        profitFactor: 1.5,
        expectedPayoff: 3,
        monteCarlo: null,
        maxDrawdownPct: 40,
        warnings: ["Warning"],
        sharpeRatio: 0.1,
        recoveryFactor: 0.3,
      })
    );
    expect(result.readinessScore).toBeGreaterThan(0);
    expect(result.readinessScore).toBeLessThan(100);
  });
});

// ============================================
// extractPreLiveInput
// ============================================

describe("extractPreLiveInput", () => {
  function makeBacktestRun(overrides: Partial<BacktestRun> = {}): BacktestRun {
    return {
      id: "test-id",
      uploadId: "upload-id",
      eaName: "Test EA",
      symbol: "EURUSD",
      timeframe: "H1",
      period: "2020.01.01-2024.01.01",
      initialDeposit: 10000,
      totalNetProfit: 5000,
      profitFactor: 1.8,
      maxDrawdownPct: 15,
      maxDrawdownAbs: 1500,
      sharpeRatio: 1.2,
      recoveryFactor: 2.5,
      expectedPayoff: 5.5,
      totalTrades: 200,
      winRate: 0.6,
      longWinRate: 0.58,
      shortWinRate: 0.62,
      healthScore: 85,
      healthStatus: "ROBUST",
      healthScoreVersion: 1,
      confidenceLower: 70,
      confidenceUpper: 95,
      walkForwardResult: null,
      trades: [],
      scoreBreakdown: null,
      parseWarnings: ["Test warning"],
      detectedLocale: "en",
      validationResult: {
        survivalRate: 0.9,
        p5: 5,
        p50: 25,
        p95: 60,
      },
      createdAt: new Date(),
      ...overrides,
    } as BacktestRun;
  }

  it("extracts all fields correctly from a full BacktestRun", () => {
    const backtest = makeBacktestRun();
    const input = extractPreLiveInput(backtest);

    expect(input.healthScore).toBe(85);
    expect(input.healthStatus).toBe("ROBUST");
    expect(input.totalTrades).toBe(200);
    expect(input.profitFactor).toBe(1.8);
    expect(input.maxDrawdownPct).toBe(15);
    expect(input.expectedPayoff).toBe(5.5);
    expect(input.winRate).toBe(0.6);
    expect(input.sharpeRatio).toBe(1.2);
    expect(input.recoveryFactor).toBe(2.5);
    expect(input.confidenceLower).toBe(70);
    expect(input.confidenceUpper).toBe(95);
    expect(input.warnings).toEqual(["Test warning"]);
    expect(input.monteCarlo).toEqual({
      survivalRate: 0.9,
      p5: 5,
      p50: 25,
      p95: 60,
    });
  });

  it("handles missing JSON fields gracefully", () => {
    const backtest = makeBacktestRun({
      validationResult: null,
      parseWarnings: null,
      sharpeRatio: null,
      recoveryFactor: null,
    });
    const input = extractPreLiveInput(backtest);

    expect(input.monteCarlo).toBeNull();
    expect(input.warnings).toEqual([]);
    expect(input.sharpeRatio).toBeNull();
    expect(input.recoveryFactor).toBeNull();
  });
});

// ============================================
// VERDICT INTEGRATION
// ============================================

describe("computePreLiveVerdict — Verdict Integration", () => {
  it("perfect strategy → READY", () => {
    const result = computePreLiveVerdict(makeInput());
    expect(result.verdict).toBe("READY");
    expect(result.readinessScore).toBe(100);
    expect(result.reasons).toHaveLength(0);
  });

  it("minor issues only (S4+S5+S6 = 3) → READY", () => {
    const result = computePreLiveVerdict(
      makeInput({
        healthScore: 75,
        healthStatus: "MODERATE",
        sharpeRatio: 0.3,
        warnings: ["Minor"],
      })
    );
    expect(result.verdict).toBe("READY");
  });
});

// ============================================
// SCENARIO TESTS
// ============================================

describe("computePreLiveVerdict — Scenarios", () => {
  it("strong edge: high metrics across the board → READY with score 100", () => {
    const result = computePreLiveVerdict(
      makeInput({
        healthScore: 92,
        healthStatus: "ROBUST",
        totalTrades: 500,
        profitFactor: 2.4,
        expectedPayoff: 12.3,
        maxDrawdownPct: 8,
        winRate: 0.68,
        sharpeRatio: 1.8,
        recoveryFactor: 4.2,
        warnings: [],
        monteCarlo: { survivalRate: 0.96, p5: 15, p50: 45, p95: 90 },
      })
    );

    expect(result.verdict).toBe("READY");
    expect(result.readinessScore).toBe(100);
    expect(result.reasons).toHaveLength(0);
    expect(result.actions).toHaveLength(0);
    expect(result.gateResults.every((g) => g.passed)).toBe(true);
  });

  it("borderline: passes hard gates, soft weight exactly at threshold → UNCERTAIN", () => {
    // Monte Carlo null → S1(3) + S2(1) = 4 = UNCERTAIN_WEIGHT_THRESHOLD
    const result = computePreLiveVerdict(
      makeInput({
        healthScore: 85,
        healthStatus: "ROBUST",
        totalTrades: 150,
        profitFactor: 1.3,
        expectedPayoff: 2.0,
        maxDrawdownPct: 20,
        sharpeRatio: 0.8,
        recoveryFactor: 1.5,
        warnings: [],
        monteCarlo: null,
      })
    );

    expect(result.verdict).toBe("UNCERTAIN");
    expect(result.gateResults.filter((g) => g.hard && !g.passed)).toHaveLength(0);
    expect(result.reasons.some((r) => r.type === "MISSING_MONTE_CARLO")).toBe(true);
    expect(result.readinessScore).toBeGreaterThan(50);
    expect(result.readinessScore).toBeLessThan(100);
  });

  it("weak: fails multiple hard gates → NOT_DEPLOYABLE with low score", () => {
    const result = computePreLiveVerdict(
      makeInput({
        healthScore: 35,
        healthStatus: "WEAK",
        totalTrades: 40,
        profitFactor: 0.7,
        expectedPayoff: -3.2,
        maxDrawdownPct: 55,
        winRate: 0.35,
        sharpeRatio: -0.2,
        recoveryFactor: 0.3,
        warnings: ["Martingale detected", "Outlier profit skew"],
        monteCarlo: { survivalRate: 0.3, p5: -20, p50: -5, p95: 10 },
      })
    );

    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.readinessScore).toBe(0);
    const failedHard = result.gateResults.filter((g) => g.hard && !g.passed);
    expect(failedHard.length).toBe(5);
    expect(result.reasons.every((r) => r.severity === "error")).toBe(true);
  });

  it("low trade count: only 30 trades → NOT_DEPLOYABLE, suggests extending backtest", () => {
    const result = computePreLiveVerdict(
      makeInput({
        totalTrades: 30,
        healthScore: 80,
        healthStatus: "ROBUST",
        profitFactor: 1.6,
        expectedPayoff: 4.0,
      })
    );

    expect(result.verdict).toBe("NOT_DEPLOYABLE");
    expect(result.gateResults.find((g) => g.gate === "H1")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "INSUFFICIENT_TRADES")).toBe(true);
    expect(result.actions.some((a) => a.label === "Extend backtest")).toBe(true);
    const failedHard = result.gateResults.filter((g) => g.hard && !g.passed);
    expect(failedHard).toHaveLength(1);
  });

  it("high drawdown: 45% drawdown → soft gate triggers UNCERTAIN", () => {
    const result = computePreLiveVerdict(
      makeInput({
        maxDrawdownPct: 45,
        healthScore: 70,
        healthStatus: "MODERATE",
        totalTrades: 200,
        profitFactor: 1.4,
        expectedPayoff: 3.0,
        monteCarlo: null,
      })
    );

    expect(result.verdict).toBe("UNCERTAIN");
    expect(result.gateResults.find((g) => g.gate === "S3")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "EXCESSIVE_DRAWDOWN")).toBe(true);
  });

  it("Monte Carlo instability: low survival + negative p5 → UNCERTAIN", () => {
    const result = computePreLiveVerdict(
      makeInput({
        healthScore: 82,
        healthStatus: "ROBUST",
        totalTrades: 300,
        profitFactor: 1.5,
        expectedPayoff: 4.0,
        monteCarlo: { survivalRate: 0.45, p5: -12, p50: 8, p95: 35 },
      })
    );

    expect(result.verdict).toBe("UNCERTAIN");
    // S1(3) + S2(1) = 4 failed weight → meets threshold
    expect(result.gateResults.find((g) => g.gate === "S1")?.passed).toBe(false);
    expect(result.gateResults.find((g) => g.gate === "S2")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.type === "LOW_SURVIVAL_RATE")).toBe(true);
    expect(result.reasons.some((r) => r.type === "NEGATIVE_P5_RETURN")).toBe(true);
    expect(result.gateResults.filter((g) => g.hard && !g.passed)).toHaveLength(0);
  });
});
