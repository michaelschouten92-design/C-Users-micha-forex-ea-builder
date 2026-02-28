import { describe, it, expect } from "vitest";
import { mapLegacyPhase } from "./backfill";

describe("mapLegacyPhase", () => {
  it("maps NEW → DRAFT", () => {
    expect(mapLegacyPhase("NEW")).toBe("DRAFT");
  });

  it("maps PROVING → LIVE_MONITORING", () => {
    expect(mapLegacyPhase("PROVING")).toBe("LIVE_MONITORING");
  });

  it("maps PROVEN → LIVE_MONITORING", () => {
    expect(mapLegacyPhase("PROVEN")).toBe("LIVE_MONITORING");
  });

  it("maps RETIRED → INVALIDATED", () => {
    expect(mapLegacyPhase("RETIRED")).toBe("INVALIDATED");
  });

  it("throws on unknown phase", () => {
    expect(() => mapLegacyPhase("UNKNOWN")).toThrow("Unknown legacy lifecyclePhase: UNKNOWN");
  });

  it("covers all 4 known legacy phases", () => {
    const knownPhases = ["NEW", "PROVING", "PROVEN", "RETIRED"];
    for (const phase of knownPhases) {
      expect(() => mapLegacyPhase(phase)).not.toThrow();
    }
  });
});
