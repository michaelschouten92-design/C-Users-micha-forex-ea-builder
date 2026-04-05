import {
  computeEdgeScore,
  type EdgeScoreLiveInput,
  type EdgeScoreBaselineInput,
} from "./edge-score";

const baseline: EdgeScoreBaselineInput = {
  winRate: 0.6,
  profitFactor: 1.8,
  maxDrawdownPct: 10,
  netReturnPct: 25,
  initialDeposit: 10000,
};

function makeLive(overrides: Partial<EdgeScoreLiveInput> = {}): EdgeScoreLiveInput {
  return {
    totalTrades: 50,
    winCount: 30,
    lossCount: 20,
    grossProfit: 3000,
    grossLoss: 1500,
    maxDrawdownPct: 8,
    totalProfit: 1500,
    balance: 11500,
    ...overrides,
  };
}

describe("computeEdgeScore", () => {
  describe("phase transitions", () => {
    it("returns COLLECTING when < 10 trades", () => {
      const result = computeEdgeScore(makeLive({ totalTrades: 7 }), baseline);
      expect(result.phase).toBe("COLLECTING");
      expect(result.score).toBeNull();
      expect(result.breakdown).toBeNull();
      expect(result.tradesCompleted).toBe(7);
      expect(result.tradesRequired).toBe(10);
    });

    it("returns EARLY when 10-19 trades", () => {
      const result = computeEdgeScore(makeLive({ totalTrades: 15 }), baseline);
      expect(result.phase).toBe("EARLY");
      expect(result.score).not.toBeNull();
    });

    it("returns FULL when >= 20 trades", () => {
      const result = computeEdgeScore(makeLive({ totalTrades: 25 }), baseline);
      expect(result.phase).toBe("FULL");
      expect(result.score).not.toBeNull();
    });
  });

  describe("score computation", () => {
    it("returns ~100% when live matches baseline exactly", () => {
      // WR: 0.6, PF: 1.8, DD: 10%, Return: 25%
      const live = makeLive({
        totalTrades: 100,
        winCount: 60,
        lossCount: 40,
        grossProfit: 5400,
        grossLoss: 3000, // PF = 1.8
        maxDrawdownPct: 10,
        totalProfit: 2400,
        balance: 12500, // return = 25%
      });
      const result = computeEdgeScore(live, baseline);
      expect(result.score).toBeCloseTo(100, 0);
    });

    it("returns > 100% when live outperforms", () => {
      const live = makeLive({
        totalTrades: 50,
        winCount: 40,
        lossCount: 10,
        grossProfit: 5000,
        grossLoss: 1000, // PF = 5.0 (capped at 2.0 ratio)
        maxDrawdownPct: 5, // half of baseline = ratio 2.0 (capped)
        totalProfit: 4000,
        balance: 15000, // 50% return vs 25% baseline = ratio 2.0 (capped)
      });
      const result = computeEdgeScore(live, baseline);
      expect(result.score!).toBeGreaterThan(100);
    });

    it("returns < 100% when live underperforms", () => {
      const live = makeLive({
        totalTrades: 50,
        winCount: 20,
        lossCount: 30,
        grossProfit: 1200,
        grossLoss: 1800, // PF = 0.67
        maxDrawdownPct: 20, // 2x baseline
        totalProfit: -600,
        balance: 9500, // -5% return
      });
      const result = computeEdgeScore(live, baseline);
      expect(result.score!).toBeLessThan(100);
    });

    it("caps individual metric ratios at 200%", () => {
      const live = makeLive({
        totalTrades: 50,
        winCount: 50,
        lossCount: 0,
        grossProfit: 10000,
        grossLoss: 0, // infinite PF → capped at 2.0
        maxDrawdownPct: 0.1, // near zero DD → capped at 2.0
        totalProfit: 10000,
        balance: 100000, // huge return → capped at 2.0
      });
      const result = computeEdgeScore(live, baseline);
      // All ratios capped at 2.0, so max score = 200%
      expect(result.score!).toBeLessThanOrEqual(200);
    });
  });

  describe("edge cases", () => {
    it("skips profit factor when baseline PF is 0", () => {
      const zeroBaseline = { ...baseline, profitFactor: 0 };
      const result = computeEdgeScore(makeLive(), zeroBaseline);
      expect(result.score).not.toBeNull();
      expect(result.breakdown!.profitFactor.weight).toBe(0);
      // Other weights should be redistributed
      expect(result.breakdown!.winRate.weight).toBeGreaterThan(0.3);
    });

    it("handles zero live drawdown gracefully", () => {
      const live = makeLive({ maxDrawdownPct: 0 });
      const result = computeEdgeScore(live, baseline);
      expect(result.breakdown!.drawdown.ratio).toBe(2.0);
    });

    it("skips drawdown when baseline DD is 0", () => {
      const zeroDD = { ...baseline, maxDrawdownPct: 0 };
      const result = computeEdgeScore(makeLive(), zeroDD);
      expect(result.breakdown!.drawdown.weight).toBe(0);
    });

    it("handles all baseline metrics being 0", () => {
      const zeroBaseline: EdgeScoreBaselineInput = {
        winRate: 0,
        profitFactor: 0,
        maxDrawdownPct: 0,
        netReturnPct: 0,
        initialDeposit: 0,
      };
      const result = computeEdgeScore(makeLive(), zeroBaseline);
      expect(result.score).toBe(100); // fallback
    });
  });

  describe("breakdown", () => {
    it("includes all 4 metrics with correct weights summing to 1", () => {
      const result = computeEdgeScore(makeLive(), baseline);
      const bd = result.breakdown!;
      const totalWeight =
        bd.profitFactor.weight + bd.winRate.weight + bd.drawdown.weight + bd.returnPct.weight;
      expect(totalWeight).toBeCloseTo(1, 5);
    });

    it("shows correct live values in breakdown", () => {
      const live = makeLive({ winCount: 30, totalTrades: 50 });
      const result = computeEdgeScore(live, baseline);
      expect(result.breakdown!.winRate.live).toBeCloseTo(0.6, 2);
      expect(result.breakdown!.winRate.baseline).toBe(0.6);
    });
  });
});
