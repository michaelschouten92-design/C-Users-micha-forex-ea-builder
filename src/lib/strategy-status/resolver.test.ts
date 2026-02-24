import { describe, it, expect } from "vitest";
import {
  resolveStrategyStatus,
  resolveStatusConfidence,
  getStatusExplanation,
  type StatusInput,
  type ConfidenceInput,
} from "./resolver";

// ============================================
// HELPERS
// ============================================

const NOW = Date.now();

/** Healthy, online, PROVEN strategy with chain + baseline — should be VERIFIED */
function makeInput(overrides: Partial<StatusInput> = {}): StatusInput {
  return {
    eaStatus: "ONLINE",
    lastHeartbeat: new Date(NOW - 60_000), // 1 min ago
    createdAt: new Date(NOW - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    deletedAt: null,
    lifecyclePhase: "PROVEN",
    healthStatus: "HEALTHY",
    driftDetected: false,
    hasBaseline: true,
    chainVerified: true,
    ...overrides,
  };
}

function hoursAgo(hours: number): Date {
  return new Date(NOW - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(NOW - days * 24 * 60 * 60 * 1000);
}

// ============================================
// resolveStrategyStatus
// ============================================

describe("resolveStrategyStatus", () => {
  // ------------------------------------------
  // All 6 states are reachable
  // ------------------------------------------
  describe("all 6 states are reachable", () => {
    it("returns VERIFIED for PROVEN + HEALTHY + chain + baseline", () => {
      expect(resolveStrategyStatus(makeInput())).toBe("VERIFIED");
    });

    it("returns MONITORING for PROVING + HEALTHY (missing PROVEN)", () => {
      expect(resolveStrategyStatus(makeInput({ lifecyclePhase: "PROVING" }))).toBe("MONITORING");
    });

    it("returns TESTING for NEW lifecycle phase", () => {
      expect(resolveStrategyStatus(makeInput({ lifecyclePhase: "NEW" }))).toBe("TESTING");
    });

    it("returns UNSTABLE for WARNING health", () => {
      expect(resolveStrategyStatus(makeInput({ healthStatus: "WARNING" }))).toBe("UNSTABLE");
    });

    it("returns EDGE_DEGRADED for DEGRADED health", () => {
      expect(resolveStrategyStatus(makeInput({ healthStatus: "DEGRADED" }))).toBe("EDGE_DEGRADED");
    });

    it("returns INACTIVE for RETIRED lifecycle", () => {
      expect(resolveStrategyStatus(makeInput({ lifecyclePhase: "RETIRED" }))).toBe("INACTIVE");
    });
  });

  // ------------------------------------------
  // Priority #1: INACTIVE
  // ------------------------------------------
  describe("INACTIVE (priority #1)", () => {
    it("deletedAt is set → INACTIVE", () => {
      expect(resolveStrategyStatus(makeInput({ deletedAt: new Date() }))).toBe("INACTIVE");
    });

    it("RETIRED overrides DEGRADED health", () => {
      expect(
        resolveStrategyStatus(makeInput({ lifecyclePhase: "RETIRED", healthStatus: "DEGRADED" }))
      ).toBe("INACTIVE");
    });

    it("OFFLINE with last heartbeat > 24h ago → INACTIVE", () => {
      expect(
        resolveStrategyStatus(makeInput({ eaStatus: "OFFLINE", lastHeartbeat: hoursAgo(25) }))
      ).toBe("INACTIVE");
    });

    it("OFFLINE with last heartbeat < 24h ago → NOT INACTIVE", () => {
      const result = resolveStrategyStatus(
        makeInput({ eaStatus: "OFFLINE", lastHeartbeat: hoursAgo(12) })
      );
      expect(result).not.toBe("INACTIVE");
    });

    it("ONLINE with old heartbeat → NOT INACTIVE (only OFFLINE triggers)", () => {
      const result = resolveStrategyStatus(
        makeInput({ eaStatus: "ONLINE", lastHeartbeat: hoursAgo(30) })
      );
      expect(result).not.toBe("INACTIVE");
    });

    it("no heartbeat ever, created > 48h ago → INACTIVE", () => {
      expect(resolveStrategyStatus(makeInput({ lastHeartbeat: null, createdAt: daysAgo(3) }))).toBe(
        "INACTIVE"
      );
    });

    it("no heartbeat ever, created < 48h ago → NOT INACTIVE", () => {
      const result = resolveStrategyStatus(
        makeInput({ lastHeartbeat: null, createdAt: hoursAgo(24) })
      );
      expect(result).not.toBe("INACTIVE");
    });

    it("deleted + HEALTHY → still INACTIVE (delete wins)", () => {
      expect(
        resolveStrategyStatus(makeInput({ deletedAt: new Date(), healthStatus: "HEALTHY" }))
      ).toBe("INACTIVE");
    });
  });

  // ------------------------------------------
  // Priority #2: EDGE_DEGRADED
  // ------------------------------------------
  describe("EDGE_DEGRADED (priority #2)", () => {
    it("DEGRADED health → EDGE_DEGRADED", () => {
      expect(resolveStrategyStatus(makeInput({ healthStatus: "DEGRADED" }))).toBe("EDGE_DEGRADED");
    });

    it("drift detected with HEALTHY health → EDGE_DEGRADED", () => {
      expect(resolveStrategyStatus(makeInput({ driftDetected: true }))).toBe("EDGE_DEGRADED");
    });

    it("drift detected with WARNING health → EDGE_DEGRADED (drift wins over WARNING)", () => {
      expect(
        resolveStrategyStatus(makeInput({ driftDetected: true, healthStatus: "WARNING" }))
      ).toBe("EDGE_DEGRADED");
    });

    it("DEGRADED + NEW lifecycle → EDGE_DEGRADED (health severity wins over lifecycle)", () => {
      expect(
        resolveStrategyStatus(makeInput({ healthStatus: "DEGRADED", lifecyclePhase: "NEW" }))
      ).toBe("EDGE_DEGRADED");
    });
  });

  // ------------------------------------------
  // Priority #3: UNSTABLE
  // ------------------------------------------
  describe("UNSTABLE (priority #3)", () => {
    it("WARNING health → UNSTABLE", () => {
      expect(resolveStrategyStatus(makeInput({ healthStatus: "WARNING" }))).toBe("UNSTABLE");
    });

    it("WARNING + NEW lifecycle → UNSTABLE (WARNING wins over NEW)", () => {
      expect(
        resolveStrategyStatus(makeInput({ healthStatus: "WARNING", lifecyclePhase: "NEW" }))
      ).toBe("UNSTABLE");
    });

    it("WARNING + PROVEN + chain + baseline → UNSTABLE (not VERIFIED)", () => {
      expect(resolveStrategyStatus(makeInput({ healthStatus: "WARNING" }))).toBe("UNSTABLE");
    });
  });

  // ------------------------------------------
  // Priority #4: TESTING
  // ------------------------------------------
  describe("TESTING (priority #4)", () => {
    it("NEW lifecycle phase → TESTING", () => {
      expect(resolveStrategyStatus(makeInput({ lifecyclePhase: "NEW" }))).toBe("TESTING");
    });

    it("INSUFFICIENT_DATA health → TESTING", () => {
      expect(
        resolveStrategyStatus(
          makeInput({ healthStatus: "INSUFFICIENT_DATA", lifecyclePhase: "PROVING" })
        )
      ).toBe("TESTING");
    });

    it("NEW + HEALTHY health → TESTING (NEW lifecycle wins)", () => {
      expect(
        resolveStrategyStatus(makeInput({ lifecyclePhase: "NEW", healthStatus: "HEALTHY" }))
      ).toBe("TESTING");
    });

    it("INSUFFICIENT_DATA + PROVEN → TESTING", () => {
      expect(
        resolveStrategyStatus(
          makeInput({ healthStatus: "INSUFFICIENT_DATA", lifecyclePhase: "PROVEN" })
        )
      ).toBe("TESTING");
    });
  });

  // ------------------------------------------
  // Priority #5: VERIFIED
  // ------------------------------------------
  describe("VERIFIED (priority #5)", () => {
    it("PROVEN + HEALTHY + chainVerified + hasBaseline → VERIFIED", () => {
      expect(resolveStrategyStatus(makeInput())).toBe("VERIFIED");
    });

    it("PROVEN + HEALTHY but no chain → MONITORING (not VERIFIED)", () => {
      expect(resolveStrategyStatus(makeInput({ chainVerified: false }))).toBe("MONITORING");
    });

    it("PROVEN + HEALTHY but no baseline → MONITORING (not VERIFIED)", () => {
      expect(resolveStrategyStatus(makeInput({ hasBaseline: false }))).toBe("MONITORING");
    });

    it("PROVING + HEALTHY + chain + baseline → MONITORING (not VERIFIED — requires PROVEN)", () => {
      expect(resolveStrategyStatus(makeInput({ lifecyclePhase: "PROVING" }))).toBe("MONITORING");
    });

    it("PROVEN + null health + chain + baseline → MONITORING (needs HEALTHY)", () => {
      expect(resolveStrategyStatus(makeInput({ healthStatus: null }))).toBe("MONITORING");
    });
  });

  // ------------------------------------------
  // Priority #6: MONITORING (catch-all)
  // ------------------------------------------
  describe("MONITORING (priority #6 — catch-all)", () => {
    it("PROVING + HEALTHY → MONITORING", () => {
      expect(resolveStrategyStatus(makeInput({ lifecyclePhase: "PROVING" }))).toBe("MONITORING");
    });

    it("PROVEN + HEALTHY but missing both chain and baseline → MONITORING", () => {
      expect(resolveStrategyStatus(makeInput({ chainVerified: false, hasBaseline: false }))).toBe(
        "MONITORING"
      );
    });

    it("null healthStatus + PROVING → MONITORING", () => {
      expect(
        resolveStrategyStatus(makeInput({ healthStatus: null, lifecyclePhase: "PROVING" }))
      ).toBe("MONITORING");
    });
  });

  // ------------------------------------------
  // Priority ordering correctness
  // ------------------------------------------
  describe("priority ordering", () => {
    it("INACTIVE beats EDGE_DEGRADED (deleted + DEGRADED → INACTIVE)", () => {
      expect(
        resolveStrategyStatus(makeInput({ deletedAt: new Date(), healthStatus: "DEGRADED" }))
      ).toBe("INACTIVE");
    });

    it("INACTIVE beats UNSTABLE (RETIRED + WARNING → INACTIVE)", () => {
      expect(
        resolveStrategyStatus(makeInput({ lifecyclePhase: "RETIRED", healthStatus: "WARNING" }))
      ).toBe("INACTIVE");
    });

    it("EDGE_DEGRADED beats UNSTABLE (DEGRADED wins over WARNING path)", () => {
      // DEGRADED is checked before WARNING in priority
      expect(resolveStrategyStatus(makeInput({ healthStatus: "DEGRADED" }))).toBe("EDGE_DEGRADED");
    });

    it("EDGE_DEGRADED beats TESTING (drift + NEW → EDGE_DEGRADED)", () => {
      expect(resolveStrategyStatus(makeInput({ driftDetected: true, lifecyclePhase: "NEW" }))).toBe(
        "EDGE_DEGRADED"
      );
    });

    it("UNSTABLE beats TESTING (WARNING + NEW → UNSTABLE)", () => {
      expect(
        resolveStrategyStatus(makeInput({ healthStatus: "WARNING", lifecyclePhase: "NEW" }))
      ).toBe("UNSTABLE");
    });

    it("TESTING beats VERIFIED (INSUFFICIENT_DATA + PROVEN + chain + baseline → TESTING)", () => {
      expect(resolveStrategyStatus(makeInput({ healthStatus: "INSUFFICIENT_DATA" }))).toBe(
        "TESTING"
      );
    });
  });

  // ------------------------------------------
  // Edge cases
  // ------------------------------------------
  describe("edge cases", () => {
    it("ERROR ea status with no other issues → falls through to health-based resolution", () => {
      const result = resolveStrategyStatus(makeInput({ eaStatus: "ERROR" }));
      // ERROR ea status doesn't directly map to INACTIVE (only OFFLINE 24h+ does)
      expect(result).toBe("VERIFIED");
    });

    it("OFFLINE but recent heartbeat → not INACTIVE", () => {
      const result = resolveStrategyStatus(
        makeInput({ eaStatus: "OFFLINE", lastHeartbeat: hoursAgo(2) })
      );
      expect(result).toBe("VERIFIED");
    });

    it("OFFLINE just under 24h boundary → not INACTIVE", () => {
      // Use 23h 59m to stay safely under the boundary
      const result = resolveStrategyStatus(
        makeInput({ eaStatus: "OFFLINE", lastHeartbeat: hoursAgo(23.98) })
      );
      expect(result).not.toBe("INACTIVE");
    });

    it("no heartbeat, created just under 48h boundary → not INACTIVE", () => {
      // Use 47h 59m to stay safely under the boundary
      const result = resolveStrategyStatus(
        makeInput({ lastHeartbeat: null, createdAt: hoursAgo(47.98) })
      );
      expect(result).not.toBe("INACTIVE");
    });
  });
});

// ============================================
// resolveStatusConfidence
// ============================================

describe("resolveStatusConfidence", () => {
  function makeConfidenceInput(overrides: Partial<ConfidenceInput> = {}): ConfidenceInput {
    return {
      tradeCount: 150,
      windowDays: 45,
      confidenceInterval: { lower: 0.65, upper: 0.8 },
      ...overrides,
    };
  }

  it("returns HIGH with 100+ trades, 30+ days, narrow CI", () => {
    expect(resolveStatusConfidence(makeConfidenceInput())).toBe("HIGH");
  });

  it("returns MEDIUM with 50 trades, 20 days, moderate CI", () => {
    expect(
      resolveStatusConfidence(
        makeConfidenceInput({
          tradeCount: 50,
          windowDays: 20,
          confidenceInterval: { lower: 0.4, upper: 0.7 },
        })
      )
    ).toBe("MEDIUM");
  });

  it("returns LOW with < 30 trades", () => {
    expect(resolveStatusConfidence(makeConfidenceInput({ tradeCount: 10 }))).toBe("LOW");
  });

  it("returns LOW with < 14 days", () => {
    expect(resolveStatusConfidence(makeConfidenceInput({ tradeCount: 50, windowDays: 7 }))).toBe(
      "LOW"
    );
  });

  it("returns LOW when CI width >= 0.4 even with enough trades and days", () => {
    expect(
      resolveStatusConfidence(
        makeConfidenceInput({
          tradeCount: 50,
          windowDays: 20,
          confidenceInterval: { lower: 0.2, upper: 0.7 },
        })
      )
    ).toBe("LOW");
  });

  it("returns MEDIUM not HIGH when CI width >= 0.2 with 100+ trades", () => {
    expect(
      resolveStatusConfidence(
        makeConfidenceInput({
          tradeCount: 120,
          windowDays: 40,
          confidenceInterval: { lower: 0.5, upper: 0.75 },
        })
      )
    ).toBe("MEDIUM");
  });

  it("boundary: exactly 100 trades, 30 days, CI width 0.19 → HIGH", () => {
    expect(
      resolveStatusConfidence({
        tradeCount: 100,
        windowDays: 30,
        confidenceInterval: { lower: 0.6, upper: 0.79 },
      })
    ).toBe("HIGH");
  });

  it("boundary: exactly 30 trades, 14 days, CI width 0.39 → MEDIUM", () => {
    expect(
      resolveStatusConfidence({
        tradeCount: 30,
        windowDays: 14,
        confidenceInterval: { lower: 0.4, upper: 0.79 },
      })
    ).toBe("MEDIUM");
  });

  it("boundary: 29 trades → LOW regardless of other inputs", () => {
    expect(
      resolveStatusConfidence({
        tradeCount: 29,
        windowDays: 60,
        confidenceInterval: { lower: 0.7, upper: 0.8 },
      })
    ).toBe("LOW");
  });
});

// ============================================
// getStatusExplanation
// ============================================

describe("getStatusExplanation", () => {
  it("returns explanation for VERIFIED", () => {
    const msg = getStatusExplanation("VERIFIED", {});
    expect(msg).toContain("Proven");
    expect(msg).toContain("verified chain");
  });

  it("returns explanation for MONITORING", () => {
    expect(getStatusExplanation("MONITORING", {})).toContain("expected parameters");
  });

  it("returns NEW-specific explanation for TESTING when lifecyclePhase is NEW", () => {
    const msg = getStatusExplanation("TESTING", { lifecyclePhase: "NEW" });
    expect(msg).toContain("New strategy");
  });

  it("returns data-gathering explanation for TESTING when not NEW", () => {
    const msg = getStatusExplanation("TESTING", { lifecyclePhase: "PROVING" });
    expect(msg).toContain("Gathering more data");
  });

  it("returns drift explanation for EDGE_DEGRADED when driftDetected", () => {
    const msg = getStatusExplanation("EDGE_DEGRADED", { driftDetected: true });
    expect(msg).toContain("drift");
  });

  it("returns degraded explanation for EDGE_DEGRADED when no drift", () => {
    const msg = getStatusExplanation("EDGE_DEGRADED", { driftDetected: false });
    expect(msg).toContain("degraded");
  });

  it("returns retired explanation for INACTIVE when RETIRED", () => {
    const msg = getStatusExplanation("INACTIVE", { lifecyclePhase: "RETIRED" });
    expect(msg).toContain("retired");
  });

  it("returns removed explanation for INACTIVE when deletedAt", () => {
    const msg = getStatusExplanation("INACTIVE", { deletedAt: new Date() });
    expect(msg).toContain("removed");
  });

  it("returns offline explanation for INACTIVE otherwise", () => {
    const msg = getStatusExplanation("INACTIVE", {});
    expect(msg).toContain("offline");
  });
});
