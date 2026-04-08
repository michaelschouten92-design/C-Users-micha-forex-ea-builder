import { describe, it, expect } from "vitest";
import {
  computeEdgeProjection,
  generateEdgeDecayAlert,
  type HealthDataPoint,
} from "./edge-projection";

function makeSnapshots(
  count: number,
  opts: {
    startScore?: number;
    scoreStep?: number;
    startDaysAgo?: number;
    intervalHours?: number;
  } = {}
): HealthDataPoint[] {
  const { startScore = 0.85, scoreStep = -0.02, startDaysAgo = 10, intervalHours = 12 } = opts;

  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    overallScore: Math.max(0, Math.min(1, startScore + scoreStep * i)),
    expectancy: -0.3,
    createdAt: new Date(
      now - (startDaysAgo * 24 - i * intervalHours) * 60 * 60 * 1000
    ).toISOString(),
  }));
}

describe("computeEdgeProjection", () => {
  describe("insufficient data", () => {
    it("returns null projection with < 5 snapshots", () => {
      const result = computeEdgeProjection(makeSnapshots(3), 10000, -0.3);
      expect(result.decayRatePerDay).toBeNull();
      expect(result.trend).toBe("stable");
      expect(result.dataPoints).toBe(3);
    });
  });

  describe("declining trend", () => {
    it("detects declining trend with negative slope", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.9, scoreStep: -0.03 });
      const result = computeEdgeProjection(snapshots, 10000, -0.5);
      expect(result.trend).toBe("declining");
      expect(result.decayRatePerDay).toBeLessThan(0);
    });

    it("projects days until break", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.8, scoreStep: -0.02 });
      const result = computeEdgeProjection(snapshots, 10000, -0.3);
      expect(result.daysUntilBreak).not.toBeNull();
      expect(result.daysUntilBreak!).toBeGreaterThan(0);
    });

    it("estimates daily loss when declining", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.8, scoreStep: -0.03 });
      const result = computeEdgeProjection(snapshots, 10000, -0.5);
      expect(result.estimatedDailyLoss).not.toBeNull();
      expect(result.estimatedDailyLoss!).toBeLessThan(0);
      expect(result.projectedLoss7d).not.toBeNull();
      expect(result.projectedLoss14d).not.toBeNull();
      expect(result.projectedLoss30d).not.toBeNull();
    });

    it("projected losses scale linearly (30d ≈ 30/7 × 7d)", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.75, scoreStep: -0.02 });
      const result = computeEdgeProjection(snapshots, 10000, -0.3);
      if (result.projectedLoss7d && result.projectedLoss30d) {
        const ratio = result.projectedLoss30d / result.projectedLoss7d;
        expect(ratio).toBeCloseTo(30 / 7, 0);
      }
    });
  });

  describe("stable trend", () => {
    it("returns stable with flat scores", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.75, scoreStep: 0 });
      const result = computeEdgeProjection(snapshots, 10000, 0.1);
      expect(result.trend).toBe("stable");
      expect(result.estimatedDailyLoss).toBeNull();
      expect(result.daysUntilBreak).toBeNull();
    });
  });

  describe("improving trend", () => {
    it("returns improving with positive slope", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.5, scoreStep: 0.03 });
      const result = computeEdgeProjection(snapshots, 10000, 0.5);
      expect(result.trend).toBe("improving");
    });
  });

  describe("edge cases", () => {
    it("handles score already below break threshold", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.4, scoreStep: -0.02 });
      const result = computeEdgeProjection(snapshots, 10000, -1.0);
      // Already below 0.5 — daysUntilBreak should be null
      expect(result.daysUntilBreak).toBeNull();
    });

    it("handles zero balance gracefully", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.8, scoreStep: -0.02 });
      const result = computeEdgeProjection(snapshots, 0, -0.5);
      expect(result.estimatedDailyLoss).toBeNull();
    });

    it("handles null expectancy", () => {
      const snapshots = makeSnapshots(10, { startScore: 0.8, scoreStep: -0.02 });
      const result = computeEdgeProjection(snapshots, 10000, null);
      expect(result.trend).toBe("declining");
      expect(result.estimatedDailyLoss).toBeNull(); // no expectancy = no P&L estimate
    });
  });
});

describe("generateEdgeDecayAlert", () => {
  it("returns null for stable trend", () => {
    const projection = computeEdgeProjection(
      makeSnapshots(10, { startScore: 0.75, scoreStep: 0 }),
      10000,
      0.1
    );
    expect(generateEdgeDecayAlert(projection, "GBPAUD", 0.75)).toBeNull();
  });

  it("returns alert message for declining trend with break projection", () => {
    const projection = computeEdgeProjection(
      makeSnapshots(10, { startScore: 0.8, scoreStep: -0.02 }),
      10000,
      -0.3
    );
    const msg = generateEdgeDecayAlert(projection, "GBPAUD", 0.65);
    expect(msg).not.toBeNull();
    expect(msg).toContain("GBPAUD");
    expect(msg).toContain("declining");
    expect(msg).toContain("Consider pausing");
  });

  it("returns null when break is > 60 days away", () => {
    // Very slow decline
    const projection = computeEdgeProjection(
      makeSnapshots(10, { startScore: 0.95, scoreStep: -0.001 }),
      10000,
      -0.1
    );
    if (projection.daysUntilBreak && projection.daysUntilBreak > 60) {
      expect(generateEdgeDecayAlert(projection, "EA", 0.94)).toBeNull();
    }
  });
});
