import { describe, it, expect } from "vitest";
import { buildTradeSnapshot } from "./build-snapshot";

interface TestFact {
  id: string;
  profit: number;
  executedAt: Date;
  source: string;
}

function makeFact(overrides: Partial<TestFact> & { id: string }): TestFact {
  return {
    profit: 100,
    executedAt: new Date("2025-01-15T10:00:00Z"),
    source: "BACKTEST",
    ...overrides,
  };
}

describe("buildTradeSnapshot", () => {
  it("produces deterministic hash for same facts", () => {
    const facts = [
      makeFact({ id: "a1", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeFact({ id: "a2", profit: -50, executedAt: new Date("2025-01-15T11:00:00Z") }),
    ];

    const snap1 = buildTradeSnapshot(facts, 10000);
    const snap2 = buildTradeSnapshot(facts, 10000);

    expect(snap1.snapshotHash).toBe(snap2.snapshotHash);
  });

  it("unsorted input produces same hash as sorted input", () => {
    const fact1 = makeFact({ id: "a1", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") });
    const fact2 = makeFact({ id: "a2", profit: -50, executedAt: new Date("2025-01-15T11:00:00Z") });

    const snapSorted = buildTradeSnapshot([fact1, fact2], 10000);
    const snapUnsorted = buildTradeSnapshot([fact2, fact1], 10000);

    expect(snapSorted.snapshotHash).toBe(snapUnsorted.snapshotHash);
  });

  it("throws on empty facts array", () => {
    expect(() => buildTradeSnapshot([], 10000)).toThrow("Cannot build snapshot from empty facts");
  });

  it("hash changes when any fact profit changes", () => {
    const base = [
      makeFact({ id: "a1", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeFact({ id: "a2", profit: -50, executedAt: new Date("2025-01-15T11:00:00Z") }),
    ];

    const modified = [
      makeFact({ id: "a1", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeFact({ id: "a2", profit: -51, executedAt: new Date("2025-01-15T11:00:00Z") }),
    ];

    const snap1 = buildTradeSnapshot(base, 10000);
    const snap2 = buildTradeSnapshot(modified, 10000);

    expect(snap1.snapshotHash).not.toBe(snap2.snapshotHash);
  });

  it("hash changes when initialBalance changes", () => {
    const facts = [
      makeFact({ id: "a1", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
    ];

    const snap1 = buildTradeSnapshot(facts, 10000);
    const snap2 = buildTradeSnapshot(facts, 20000);

    expect(snap1.snapshotHash).not.toBe(snap2.snapshotHash);
  });

  it("tradePnls matches expected sort order", () => {
    const facts = [
      makeFact({ id: "a3", profit: 300, executedAt: new Date("2025-01-15T12:00:00Z") }),
      makeFact({ id: "a1", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeFact({ id: "a2", profit: 200, executedAt: new Date("2025-01-15T11:00:00Z") }),
    ];

    const snap = buildTradeSnapshot(facts, 10000);

    expect(snap.tradePnls).toEqual([100, 200, 300]);
  });

  it("uses id as tiebreaker for same executedAt", () => {
    const facts = [
      makeFact({ id: "b", profit: 200, executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeFact({ id: "a", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
    ];

    const snap = buildTradeSnapshot(facts, 10000);

    // "a" < "b" lexicographically
    expect(snap.tradePnls).toEqual([100, 200]);
  });

  it("range and dataSources correctly populated", () => {
    const facts = [
      makeFact({
        id: "a1",
        profit: 100,
        executedAt: new Date("2025-01-15T10:00:00Z"),
        source: "BACKTEST",
      }),
      makeFact({
        id: "a2",
        profit: 200,
        executedAt: new Date("2025-02-20T15:00:00Z"),
        source: "BACKTEST",
      }),
    ];

    const snap = buildTradeSnapshot(facts, 10000);

    expect(snap.range.earliest).toBe("2025-01-15T10:00:00.000Z");
    expect(snap.range.latest).toBe("2025-02-20T15:00:00.000Z");
    expect(snap.dataSources).toEqual(["BACKTEST"]);
  });

  it("dataSources includes multiple unique sources sorted", () => {
    const facts = [
      makeFact({ id: "a1", source: "LIVE", executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeFact({ id: "a2", source: "BACKTEST", executedAt: new Date("2025-01-16T10:00:00Z") }),
      makeFact({ id: "a3", source: "LIVE", executedAt: new Date("2025-01-17T10:00:00Z") }),
    ];

    const snap = buildTradeSnapshot(facts, 10000);

    expect(snap.dataSources).toEqual(["BACKTEST", "LIVE"]);
  });

  it("factCount matches input length", () => {
    const facts = [
      makeFact({ id: "a1", executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeFact({ id: "a2", executedAt: new Date("2025-01-16T10:00:00Z") }),
      makeFact({ id: "a3", executedAt: new Date("2025-01-17T10:00:00Z") }),
    ];

    const snap = buildTradeSnapshot(facts, 10000);

    expect(snap.factCount).toBe(3);
  });
});
