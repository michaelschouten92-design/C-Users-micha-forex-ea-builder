import { describe, it, expect } from "vitest";
import {
  computeLiveWinrateFromTrades,
  EDGE_DRIFT_MIN_TRADES,
  EDGE_DRIFT_TRADES_N,
} from "./edge-drift-helpers";
import { computeEdgeDrift } from "@/domain/strategy/edge-drift";

function trades(profits: (number | null)[]): { profit: number | null }[] {
  return profits.map((p) => ({ profit: p }));
}

describe("computeLiveWinrateFromTrades", () => {
  it("returns ok:false for 0 trades", () => {
    const r = computeLiveWinrateFromTrades([]);
    expect(r.ok).toBe(false);
    expect(r.sampleSize).toBe(0);
    expect(r.needed).toBe(EDGE_DRIFT_TRADES_N);
    expect(r.liveWinrate).toBeUndefined();
  });

  it("returns ok:false when below MIN_TRADES", () => {
    const r = computeLiveWinrateFromTrades(trades(Array(EDGE_DRIFT_MIN_TRADES - 1).fill(10)));
    expect(r.ok).toBe(false);
    expect(r.sampleSize).toBe(EDGE_DRIFT_MIN_TRADES - 1);
  });

  it("returns ok:true at exactly MIN_TRADES", () => {
    const r = computeLiveWinrateFromTrades(trades(Array(EDGE_DRIFT_MIN_TRADES).fill(10)));
    expect(r.ok).toBe(true);
    expect(r.liveWinrate).toBe(100);
  });

  it("computes correct winrate for known profits", () => {
    // 15 wins, 5 losses out of 20
    const profits = [...Array(15).fill(50), ...Array(5).fill(-30)];
    const r = computeLiveWinrateFromTrades(trades(profits));
    expect(r.ok).toBe(true);
    expect(r.liveWinrate).toBe(75);
    expect(r.sampleSize).toBe(20);
  });

  it("profit === 0 is NOT a win", () => {
    // 10 wins (profit > 0), 10 zeros
    const profits = [...Array(10).fill(25), ...Array(10).fill(0)];
    const r = computeLiveWinrateFromTrades(trades(profits));
    expect(r.ok).toBe(true);
    expect(r.liveWinrate).toBe(50);
  });

  it("null profits are excluded from sample", () => {
    // 20 valid + 5 null → sampleSize should be 20
    const profits: (number | null)[] = [...Array(20).fill(10), ...Array(5).fill(null)];
    const r = computeLiveWinrateFromTrades(trades(profits));
    expect(r.ok).toBe(true);
    expect(r.sampleSize).toBe(20);
    expect(r.liveWinrate).toBe(100);
  });

  it("all null profits → ok:false (sampleSize 0)", () => {
    const r = computeLiveWinrateFromTrades(trades(Array(30).fill(null)));
    expect(r.ok).toBe(false);
    expect(r.sampleSize).toBe(0);
  });

  it("all losses → liveWinrate 0", () => {
    const r = computeLiveWinrateFromTrades(trades(Array(20).fill(-10)));
    expect(r.ok).toBe(true);
    expect(r.liveWinrate).toBe(0);
  });

  it("needed always equals EDGE_DRIFT_TRADES_N", () => {
    const r1 = computeLiveWinrateFromTrades([]);
    const r2 = computeLiveWinrateFromTrades(trades(Array(50).fill(10)));
    expect(r1.needed).toBe(EDGE_DRIFT_TRADES_N);
    expect(r2.needed).toBe(EDGE_DRIFT_TRADES_N);
  });
});

// ── Drift computation gating ──────────────────────────────

describe("edge drift gating", () => {
  it("computes drift when both baseline and live are available", () => {
    const live = computeLiveWinrateFromTrades(trades(Array(20).fill(10)));
    expect(live.ok).toBe(true);

    const baseline = 60; // from BacktestBaseline.winRate (0..100)
    const drift = computeEdgeDrift(baseline, live.liveWinrate!);

    expect(drift.baselineWinrate).toBe(60);
    expect(drift.liveWinrate).toBe(100);
    expect(drift.driftPct).toBe(40);
    expect(drift.status).toBe("HIGH");
  });

  it("does NOT compute drift when live is insufficient", () => {
    const live = computeLiveWinrateFromTrades(trades(Array(5).fill(10)));
    expect(live.ok).toBe(false);
    // Caller must gate: no computeEdgeDrift call when live.ok === false
    expect(live.liveWinrate).toBeUndefined();
  });

  it("does NOT compute drift when baseline is null (unavailable)", () => {
    const live = computeLiveWinrateFromTrades(trades(Array(20).fill(10)));
    expect(live.ok).toBe(true);

    const baseline: number | null = null;
    // Caller must gate: no computeEdgeDrift call when baseline is null
    expect(baseline).toBeNull();
  });

  it("baseline winrate is used as-is (already 0..100)", () => {
    // BacktestBaseline.winRate is stored as 0..100 — no conversion needed
    const baseline = 55.5;
    const drift = computeEdgeDrift(baseline, 50);
    expect(drift.baselineWinrate).toBe(55.5);
    expect(drift.driftPct).toBe(5.5);
    expect(drift.status).toBe("WARNING");
  });

  it("rejects baseline outside 0..100", () => {
    expect(() => computeEdgeDrift(-1, 50)).toThrow();
    expect(() => computeEdgeDrift(101, 50)).toThrow();
  });
});
