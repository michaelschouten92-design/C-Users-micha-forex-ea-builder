import { describe, it, expect } from "vitest";
import { computeEdgeDrift } from "./edge-drift";

describe("computeEdgeDrift", () => {
  it("no drift → OK", () => {
    const r = computeEdgeDrift(50, 50);
    expect(r.driftPct).toBe(0);
    expect(r.status).toBe("OK");
  });

  it("small drift (3%) → OK", () => {
    const r = computeEdgeDrift(55, 52);
    expect(r.driftPct).toBe(3);
    expect(r.status).toBe("OK");
  });

  it("warning drift (8%) → WARNING", () => {
    const r = computeEdgeDrift(60, 52);
    expect(r.driftPct).toBe(8);
    expect(r.status).toBe("WARNING");
  });

  it("high drift (15%) → HIGH", () => {
    const r = computeEdgeDrift(60, 45);
    expect(r.driftPct).toBe(15);
    expect(r.status).toBe("HIGH");
  });

  it("symmetry: baseline < live same as baseline > live", () => {
    const r = computeEdgeDrift(40, 60);
    expect(r.driftPct).toBe(20);
    expect(r.status).toBe("HIGH");
  });

  it("boundary: driftPct exactly 5 → WARNING", () => {
    const r = computeEdgeDrift(50, 55);
    expect(r.driftPct).toBe(5);
    expect(r.status).toBe("WARNING");
  });

  it("boundary: driftPct exactly 10 → HIGH", () => {
    const r = computeEdgeDrift(50, 60);
    expect(r.driftPct).toBe(10);
    expect(r.status).toBe("HIGH");
  });

  it("throws on negative baselineWinrate", () => {
    expect(() => computeEdgeDrift(-1, 50)).toThrow("baselineWinrate must be between 0 and 100");
  });

  it("throws on baselineWinrate > 100", () => {
    expect(() => computeEdgeDrift(101, 50)).toThrow("baselineWinrate must be between 0 and 100");
  });

  it("throws on negative liveWinrate", () => {
    expect(() => computeEdgeDrift(50, -5)).toThrow("liveWinrate must be between 0 and 100");
  });

  it("throws on liveWinrate > 100", () => {
    expect(() => computeEdgeDrift(50, 150)).toThrow("liveWinrate must be between 0 and 100");
  });

  it("throws on NaN input", () => {
    expect(() => computeEdgeDrift(NaN, 50)).toThrow("baselineWinrate must be between 0 and 100");
  });

  it("accepts edge values 0 and 100", () => {
    const r = computeEdgeDrift(0, 100);
    expect(r.driftPct).toBe(100);
    expect(r.status).toBe("HIGH");
  });

  it("returns all fields correctly", () => {
    const r = computeEdgeDrift(65, 58);
    expect(r).toEqual({
      baselineWinrate: 65,
      liveWinrate: 58,
      driftPct: 7,
      status: "WARNING",
    });
  });
});
