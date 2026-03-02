import { describe, it, expect } from "vitest";
import {
  computeThresholdsHash,
  buildConfigSnapshot,
  verifyConfigSnapshot,
  isV2OrLater,
} from "./config-snapshot";
import type {
  VerificationThresholds,
  MonitoringThresholds,
  VerificationThresholdsSnapshot,
} from "./config-snapshot";

const BASE_THRESHOLDS: VerificationThresholds = {
  minTradeCount: 30,
  readyConfidenceThreshold: 0.75,
  notDeployableThreshold: 0.45,
  maxSharpeDegradationPct: 40,
  extremeSharpeDegradationPct: 80,
  minOosTradeCount: 20,
  ruinProbabilityCeiling: 0.15,
  monteCarloIterations: 10_000,
};

const BASE_MONITORING: MonitoringThresholds = {
  drawdownBreachMultiplier: 1.5,
  sharpeMinRatio: 0.5,
  maxLosingStreak: 10,
  maxInactivityDays: 14,
  cusumDriftConsecutiveSnapshots: 3,
  recoveryRunsRequired: 3,
};

describe("computeThresholdsHash", () => {
  it("returns a 64-char hex string", () => {
    const hash = computeThresholdsHash(BASE_THRESHOLDS);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same input produces same hash", () => {
    const a = computeThresholdsHash(BASE_THRESHOLDS);
    const b = computeThresholdsHash(BASE_THRESHOLDS);
    expect(a).toBe(b);
  });

  it("is order-independent — shuffled keys produce same hash", () => {
    const shuffled = {
      ruinProbabilityCeiling: 0.15,
      minTradeCount: 30,
      monteCarloIterations: 10_000,
      extremeSharpeDegradationPct: 80,
      readyConfidenceThreshold: 0.75,
      maxSharpeDegradationPct: 40,
      notDeployableThreshold: 0.45,
      minOosTradeCount: 20,
    } as VerificationThresholds;

    expect(computeThresholdsHash(shuffled)).toBe(computeThresholdsHash(BASE_THRESHOLDS));
  });

  it("changes when any threshold value changes", () => {
    const original = computeThresholdsHash(BASE_THRESHOLDS);

    const mutations: Partial<VerificationThresholds>[] = [
      { minTradeCount: 31 },
      { readyConfidenceThreshold: 0.8 },
      { notDeployableThreshold: 0.5 },
      { maxSharpeDegradationPct: 41 },
      { extremeSharpeDegradationPct: 81 },
      { minOosTradeCount: 21 },
      { ruinProbabilityCeiling: 0.16 },
      { monteCarloIterations: 10_001 },
    ];

    for (const mutation of mutations) {
      const altered = { ...BASE_THRESHOLDS, ...mutation };
      const alteredHash = computeThresholdsHash(altered);
      expect(alteredHash).not.toBe(original);
    }
  });

  it("backward compat: hash without monitoring thresholds matches v1.0.0 behavior", () => {
    const hashWithout = computeThresholdsHash(BASE_THRESHOLDS);
    const hashWithUndefined = computeThresholdsHash(BASE_THRESHOLDS, undefined);
    expect(hashWithout).toBe(hashWithUndefined);
  });

  it("hash changes when monitoring thresholds are added", () => {
    const hashWithout = computeThresholdsHash(BASE_THRESHOLDS);
    const hashWith = computeThresholdsHash(BASE_THRESHOLDS, BASE_MONITORING);
    expect(hashWith).not.toBe(hashWithout);
  });

  it("hash changes when any monitoring threshold value changes", () => {
    const original = computeThresholdsHash(BASE_THRESHOLDS, BASE_MONITORING);

    const mutations: Partial<MonitoringThresholds>[] = [
      { drawdownBreachMultiplier: 2.0 },
      { sharpeMinRatio: 0.6 },
      { maxLosingStreak: 15 },
      { maxInactivityDays: 7 },
      { cusumDriftConsecutiveSnapshots: 5 },
      { recoveryRunsRequired: 5 },
    ];

    for (const mutation of mutations) {
      const altered = { ...BASE_MONITORING, ...mutation };
      const alteredHash = computeThresholdsHash(BASE_THRESHOLDS, altered);
      expect(alteredHash).not.toBe(original);
    }
  });

  it("monitoring hash is deterministic with same inputs", () => {
    const a = computeThresholdsHash(BASE_THRESHOLDS, BASE_MONITORING);
    const b = computeThresholdsHash(BASE_THRESHOLDS, BASE_MONITORING);
    expect(a).toBe(b);
  });
});

describe("buildConfigSnapshot", () => {
  it("returns configVersion, thresholds, monitoringThresholds, and thresholdsHash", () => {
    const snapshot = buildConfigSnapshot();

    expect(snapshot.configVersion).toBe("2.1.0");
    expect(snapshot.thresholds).toEqual(BASE_THRESHOLDS);
    expect(snapshot.monitoringThresholds).toEqual(BASE_MONITORING);
    expect(snapshot.thresholdsHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hash matches recomputation from thresholds + monitoringThresholds", () => {
    const snapshot = buildConfigSnapshot();
    const recomputed = computeThresholdsHash(snapshot.thresholds, snapshot.monitoringThresholds);
    expect(snapshot.thresholdsHash).toBe(recomputed);
  });
});

describe("verifyConfigSnapshot", () => {
  it("returns valid for an unmodified snapshot", () => {
    const snapshot = buildConfigSnapshot();
    const result = verifyConfigSnapshot(snapshot);

    expect(result.valid).toBe(true);
    expect(result.expected).toBe(result.actual);
  });

  it("returns invalid when thresholdsHash is tampered", () => {
    const snapshot = buildConfigSnapshot();
    const tampered = { ...snapshot, thresholdsHash: "0".repeat(64) };
    const result = verifyConfigSnapshot(tampered);

    expect(result.valid).toBe(false);
    expect(result.actual).toBe(snapshot.thresholdsHash);
    expect(result.expected).toBe("0".repeat(64));
  });

  it("returns invalid when thresholds are tampered", () => {
    const snapshot = buildConfigSnapshot();
    const tampered = {
      ...snapshot,
      thresholds: { ...snapshot.thresholds, minTradeCount: 999 },
    };
    const result = verifyConfigSnapshot(tampered);

    expect(result.valid).toBe(false);
    expect(result.expected).toBe(snapshot.thresholdsHash);
    expect(result.actual).not.toBe(snapshot.thresholdsHash);
  });

  it("returns invalid when monitoringThresholds are tampered", () => {
    const snapshot = buildConfigSnapshot();
    const tampered = {
      ...snapshot,
      monitoringThresholds: {
        ...snapshot.monitoringThresholds!,
        maxLosingStreak: 999,
      },
    };
    const result = verifyConfigSnapshot(tampered);

    expect(result.valid).toBe(false);
  });

  it("returns invalid for v2 snapshot with monitoringThresholds stripped", () => {
    const snapshot = buildConfigSnapshot();
    // Simulate stripping monitoringThresholds from a v2 snapshot
    const stripped: VerificationThresholdsSnapshot = {
      configVersion: "2.1.0",
      thresholds: snapshot.thresholds,
      // monitoringThresholds intentionally missing
      thresholdsHash: snapshot.thresholdsHash,
    };
    const result = verifyConfigSnapshot(stripped);

    expect(result.valid).toBe(false);
    expect(result.actual).toContain("STRUCTURAL");
  });

  it("returns invalid for v2 snapshot even if hash was recomputed without monitoring", () => {
    // Attacker recomputes hash without monitoring to make it "match"
    const snapshot = buildConfigSnapshot();
    const v1StyleHash = computeThresholdsHash(snapshot.thresholds);
    const stripped: VerificationThresholdsSnapshot = {
      configVersion: "2.1.0",
      thresholds: snapshot.thresholds,
      thresholdsHash: v1StyleHash,
    };
    const result = verifyConfigSnapshot(stripped);

    expect(result.valid).toBe(false);
    expect(result.actual).toContain("STRUCTURAL");
  });

  it("v1 snapshot without monitoringThresholds still verifies", () => {
    const v1Snapshot: VerificationThresholdsSnapshot = {
      configVersion: "1.0.0",
      thresholds: BASE_THRESHOLDS,
      thresholdsHash: computeThresholdsHash(BASE_THRESHOLDS),
    };
    const result = verifyConfigSnapshot(v1Snapshot);

    expect(result.valid).toBe(true);
  });
});

describe("isV2OrLater", () => {
  it("returns false for 1.0.0", () => {
    expect(isV2OrLater("1.0.0")).toBe(false);
  });

  it("returns false for 1.9.9", () => {
    expect(isV2OrLater("1.9.9")).toBe(false);
  });

  it("returns true for 2.0.0", () => {
    expect(isV2OrLater("2.0.0")).toBe(true);
  });

  it("returns true for 3.0.0", () => {
    expect(isV2OrLater("3.0.0")).toBe(true);
  });

  it("returns false for non-numeric", () => {
    expect(isV2OrLater("abc")).toBe(false);
  });
});
