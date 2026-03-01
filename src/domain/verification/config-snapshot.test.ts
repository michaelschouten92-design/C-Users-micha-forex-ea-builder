import { describe, it, expect } from "vitest";
import {
  computeThresholdsHash,
  buildConfigSnapshot,
  verifyConfigSnapshot,
} from "./config-snapshot";
import type { VerificationThresholds } from "./config-snapshot";

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
});

describe("buildConfigSnapshot", () => {
  it("returns configVersion, thresholds, and thresholdsHash", () => {
    const snapshot = buildConfigSnapshot();

    expect(snapshot.configVersion).toBe("1.0.0");
    expect(snapshot.thresholds).toEqual(BASE_THRESHOLDS);
    expect(snapshot.thresholdsHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hash matches recomputation from thresholds", () => {
    const snapshot = buildConfigSnapshot();
    const recomputed = computeThresholdsHash(snapshot.thresholds);
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
});
