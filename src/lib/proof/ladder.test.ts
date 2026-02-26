import { describe, it, expect } from "vitest";
import {
  computeLadderLevel,
  mergeThresholds,
  LADDER_META,
  LADDER_RANK,
  DEFAULT_THRESHOLDS,
  type LadderInput,
} from "./ladder";

// ============================================
// HELPERS
// ============================================

function makeInput(overrides: Partial<LadderInput> = {}): LadderInput {
  return {
    hasBacktest: true,
    backtestHealthScore: 75,
    monteCarloSurvival: 0.85,
    backtestTrades: 200,
    hasLiveChain: true,
    liveTrades: 100,
    chainIntegrity: true,
    liveDays: 120,
    liveHealthScore: 0.7,
    liveMaxDrawdownPct: 15,
    scoreCollapsed: false,
    ...overrides,
  };
}

// ============================================
// computeLadderLevel
// ============================================

describe("computeLadderLevel", () => {
  describe("all levels are reachable", () => {
    it("returns SUBMITTED when no backtest data", () => {
      expect(
        computeLadderLevel(
          makeInput({
            hasBacktest: false,
            backtestHealthScore: null,
            monteCarloSurvival: null,
            backtestTrades: 0,
          })
        )
      ).toBe("SUBMITTED");
    });

    it("returns SUBMITTED when backtest exists but score too low", () => {
      expect(computeLadderLevel(makeInput({ backtestHealthScore: 30 }))).toBe("SUBMITTED");
    });

    it("returns VALIDATED when health + Monte Carlo + trades pass but no live chain", () => {
      expect(
        computeLadderLevel(
          makeInput({
            hasLiveChain: false,
            liveTrades: 0,
            chainIntegrity: false,
            liveDays: 0,
          })
        )
      ).toBe("VALIDATED");
    });

    it("returns VERIFIED when live chain + min trades + integrity", () => {
      expect(computeLadderLevel(makeInput({ liveDays: 30 }))).toBe("VERIFIED");
    });

    it("returns PROVEN when verified + 90+ live days + stable", () => {
      expect(computeLadderLevel(makeInput())).toBe("PROVEN");
    });
  });

  describe("VALIDATED requirements", () => {
    it("requires backtestHealthScore >= 50", () => {
      expect(computeLadderLevel(makeInput({ backtestHealthScore: 49 }))).toBe("SUBMITTED");
      expect(
        computeLadderLevel(
          makeInput({ backtestHealthScore: 50, hasLiveChain: false, liveTrades: 0 })
        )
      ).toBe("VALIDATED");
    });

    it("requires monteCarloSurvival >= 0.7", () => {
      expect(computeLadderLevel(makeInput({ monteCarloSurvival: 0.69, hasLiveChain: false }))).toBe(
        "SUBMITTED"
      );
      expect(
        computeLadderLevel(
          makeInput({ monteCarloSurvival: 0.7, hasLiveChain: false, liveTrades: 0 })
        )
      ).toBe("VALIDATED");
    });

    it("requires min trades >= 100", () => {
      expect(computeLadderLevel(makeInput({ backtestTrades: 99, hasLiveChain: false }))).toBe(
        "SUBMITTED"
      );
      expect(
        computeLadderLevel(makeInput({ backtestTrades: 100, hasLiveChain: false, liveTrades: 0 }))
      ).toBe("VALIDATED");
    });

    it("requires monteCarloSurvival to be non-null", () => {
      expect(computeLadderLevel(makeInput({ monteCarloSurvival: null, hasLiveChain: false }))).toBe(
        "SUBMITTED"
      );
    });
  });

  describe("VERIFIED requirements", () => {
    it("requires hasLiveChain", () => {
      expect(computeLadderLevel(makeInput({ hasLiveChain: false, liveDays: 30 }))).toBe(
        "VALIDATED"
      );
    });

    it("requires min live trades >= 50", () => {
      expect(computeLadderLevel(makeInput({ liveTrades: 49, liveDays: 30 }))).toBe("VALIDATED");
    });

    it("requires chain integrity", () => {
      expect(computeLadderLevel(makeInput({ chainIntegrity: false, liveDays: 30 }))).toBe(
        "VALIDATED"
      );
    });
  });

  describe("PROVEN requirements", () => {
    it("requires min 90 live days", () => {
      expect(computeLadderLevel(makeInput({ liveDays: 89 }))).toBe("VERIFIED");
      expect(computeLadderLevel(makeInput({ liveDays: 90 }))).toBe("PROVEN");
    });

    it("rejects if score collapsed", () => {
      expect(computeLadderLevel(makeInput({ scoreCollapsed: true }))).toBe("VERIFIED");
    });

    it("rejects if drawdown exceeds threshold", () => {
      expect(computeLadderLevel(makeInput({ liveMaxDrawdownPct: 31 }))).toBe("VERIFIED");
      expect(computeLadderLevel(makeInput({ liveMaxDrawdownPct: 30 }))).toBe("PROVEN");
    });

    it("rejects if live health score below stability threshold (40%)", () => {
      // 0.39 * 100 = 39 < 40
      expect(computeLadderLevel(makeInput({ liveHealthScore: 0.39 }))).toBe("VERIFIED");
      // 0.4 * 100 = 40 >= 40
      expect(computeLadderLevel(makeInput({ liveHealthScore: 0.4 }))).toBe("PROVEN");
    });

    it("allows null liveMaxDrawdownPct (passes check)", () => {
      expect(computeLadderLevel(makeInput({ liveMaxDrawdownPct: null }))).toBe("PROVEN");
    });

    it("allows null liveHealthScore (passes check)", () => {
      expect(computeLadderLevel(makeInput({ liveHealthScore: null }))).toBe("PROVEN");
    });
  });
});

// ============================================
// mergeThresholds
// ============================================

describe("mergeThresholds", () => {
  it("returns defaults when no overrides", () => {
    const result = mergeThresholds([]);
    expect(result.VALIDATED_MIN_SCORE).toBe(50);
    expect(result.MIN_LIVE_DAYS_PROVEN).toBe(90);
  });

  it("overrides matching keys", () => {
    const result = mergeThresholds([
      { key: "VALIDATED_MIN_SCORE", value: 60 },
      { key: "MIN_LIVE_DAYS_PROVEN", value: 180 },
    ]);
    expect(result.VALIDATED_MIN_SCORE).toBe(60);
    expect(result.MIN_LIVE_DAYS_PROVEN).toBe(180);
    // Others remain default
    expect(result.MIN_LIVE_TRADES_VERIFIED).toBe(50);
  });

  it("ignores unknown keys", () => {
    const result = mergeThresholds([{ key: "UNKNOWN_KEY", value: 999 }]);
    expect(result.VALIDATED_MIN_SCORE).toBe(50);
    expect("UNKNOWN_KEY" in result).toBe(false);
  });

  it("works with custom thresholds in computeLadderLevel", () => {
    const thresholds = mergeThresholds([{ key: "VALIDATED_MIN_SCORE", value: 30 }]);
    // Score 35 would fail default (50) but pass custom (30)
    expect(
      computeLadderLevel(
        makeInput({ backtestHealthScore: 35, hasLiveChain: false, liveTrades: 0 }),
        thresholds
      )
    ).toBe("VALIDATED");
  });
});

// ============================================
// LADDER_META & LADDER_RANK
// ============================================

describe("LADDER_META", () => {
  it("defines metadata for all levels", () => {
    const levels = ["SUBMITTED", "VALIDATED", "VERIFIED", "PROVEN", "INSTITUTIONAL"] as const;
    for (const level of levels) {
      expect(LADDER_META[level]).toBeDefined();
      expect(LADDER_META[level].label).toBeTruthy();
      expect(LADDER_META[level].color).toMatch(/^#/);
      expect(LADDER_META[level].description).toBeTruthy();
    }
  });
});

describe("LADDER_RANK", () => {
  it("ranks levels in ascending order", () => {
    expect(LADDER_RANK.SUBMITTED).toBeLessThan(LADDER_RANK.VALIDATED);
    expect(LADDER_RANK.VALIDATED).toBeLessThan(LADDER_RANK.VERIFIED);
    expect(LADDER_RANK.VERIFIED).toBeLessThan(LADDER_RANK.PROVEN);
    expect(LADDER_RANK.PROVEN).toBeLessThan(LADDER_RANK.INSTITUTIONAL);
  });
});

// ============================================
// DEFAULT_THRESHOLDS
// ============================================

describe("DEFAULT_THRESHOLDS", () => {
  it("has expected keys and reasonable values", () => {
    expect(DEFAULT_THRESHOLDS.VALIDATED_MIN_SCORE).toBe(50);
    expect(DEFAULT_THRESHOLDS.VALIDATED_MIN_SURVIVAL).toBe(0.7);
    expect(DEFAULT_THRESHOLDS.MIN_TRADES_VALIDATION).toBe(100);
    expect(DEFAULT_THRESHOLDS.MIN_LIVE_TRADES_VERIFIED).toBe(50);
    expect(DEFAULT_THRESHOLDS.MIN_LIVE_DAYS_PROVEN).toBe(90);
    expect(DEFAULT_THRESHOLDS.PROVEN_MAX_DRAWDOWN_PCT).toBe(30);
    expect(DEFAULT_THRESHOLDS.PROVEN_MIN_SCORE_STABILITY).toBe(40);
    expect(DEFAULT_THRESHOLDS.HUB_MIN_TRADES).toBe(50);
    expect(DEFAULT_THRESHOLDS.HUB_MIN_DAYS).toBe(14);
  });
});
