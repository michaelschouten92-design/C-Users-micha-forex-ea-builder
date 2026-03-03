import { describe, it, expect } from "vitest";
import { evaluateAuthorityReadiness } from "./authority-readiness";

describe("evaluateAuthorityReadiness", () => {
  it("(0,0) → not ready, reasons include both", () => {
    const result = evaluateAuthorityReadiness(0, 0);
    expect(result.ready).toBe(false);
    expect(result.reasons).toContain("NO_STRATEGIES");
    expect(result.reasons).toContain("NO_LIVE_INSTANCE");
    expect(result.reasons).toHaveLength(2);
  });

  it("(1,0) → not ready, reasons ['NO_LIVE_INSTANCE']", () => {
    const result = evaluateAuthorityReadiness(1, 0);
    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(["NO_LIVE_INSTANCE"]);
  });

  it("(0,1) → not ready, reasons ['NO_STRATEGIES']", () => {
    const result = evaluateAuthorityReadiness(0, 1);
    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(["NO_STRATEGIES"]);
  });

  it("(1,1) → ready, reasons []", () => {
    const result = evaluateAuthorityReadiness(1, 1);
    expect(result.ready).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("(5,3) → ready with larger counts", () => {
    const result = evaluateAuthorityReadiness(5, 3);
    expect(result.ready).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("is pure: identical inputs produce identical outputs", () => {
    const a = evaluateAuthorityReadiness(0, 1);
    const b = evaluateAuthorityReadiness(0, 1);
    expect(a).toEqual(b);
  });

  it("reasons array order is deterministic: NO_STRATEGIES before NO_LIVE_INSTANCE", () => {
    const result = evaluateAuthorityReadiness(0, 0);
    expect(result.reasons[0]).toBe("NO_STRATEGIES");
    expect(result.reasons[1]).toBe("NO_LIVE_INSTANCE");
  });
});
