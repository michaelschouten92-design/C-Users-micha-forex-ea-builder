import { describe, it, expect } from "vitest";
import { getControlExplanation, type ControlExplanation } from "./control-explanations";
import { ALL_HEARTBEAT_REASON_CODES } from "./decide-heartbeat-action";

describe("getControlExplanation", () => {
  it("returns an explanation for every HeartbeatReasonCode", () => {
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      const result = getControlExplanation(code);
      expect(result).toBeDefined();
      expect(result.title).toBeTruthy();
      expect(result.explanation).toBeTruthy();
      expect(result.resolution).toBeTruthy();
    }
  });

  it("covers all known reason codes (exhaustiveness)", () => {
    const covered = ALL_HEARTBEAT_REASON_CODES.filter((code) => {
      const result = getControlExplanation(code);
      return result !== undefined;
    });
    expect(covered).toHaveLength(ALL_HEARTBEAT_REASON_CODES.length);
  });

  it("every explanation has exactly 3 string fields", () => {
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      const result = getControlExplanation(code);
      const keys = Object.keys(result).sort();
      expect(keys).toEqual(["explanation", "resolution", "title"]);
      expect(typeof result.title).toBe("string");
      expect(typeof result.explanation).toBe("string");
      expect(typeof result.resolution).toBe("string");
    }
  });

  it("returns correct explanation for OK", () => {
    const result = getControlExplanation("OK");
    expect(result.title).toBe("Execution Authorized");
    expect(result.explanation).toContain("All governance checks passed");
    expect(result.resolution).toContain("No action required");
  });

  it("returns correct explanation for AUTHORITY_UNINITIALIZED", () => {
    const result = getControlExplanation("AUTHORITY_UNINITIALIZED");
    expect(result.title).toBe("Authority Not Initialized");
    expect(result.explanation).toContain("authority system is not yet ready");
    expect(result.resolution).toContain("Create a strategy");
    expect(result.resolution).toContain("live EA instance");
  });

  it("returns correct explanation for STRATEGY_HALTED", () => {
    const result = getControlExplanation("STRATEGY_HALTED");
    expect(result.title).toBe("Operator Halt Active");
    expect(result.explanation).toContain("HALT override");
    expect(result.resolution).toContain("Remove the operator hold");
  });

  it("returns correct explanation for STRATEGY_INVALIDATED", () => {
    const result = getControlExplanation("STRATEGY_INVALIDATED");
    expect(result.title).toBe("Strategy Invalidated");
    expect(result.explanation).toContain("terminal lifecycle state");
    expect(result.resolution).toContain("permanent state");
  });

  it("returns correct explanation for CONTROL_INCONSISTENCY_DETECTED", () => {
    const result = getControlExplanation("CONTROL_INCONSISTENCY_DETECTED");
    expect(result.title).toBe("Control Inconsistency");
    expect(result.explanation).toContain("consistency guard");
    expect(result.resolution).toContain("self-correct");
  });

  it("is deterministic (identical input → identical output)", () => {
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      const a = getControlExplanation(code);
      const b = getControlExplanation(code);
      expect(a).toEqual(b);
    }
  });

  it("no explanation contains raw error messages or internal details", () => {
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      const result = getControlExplanation(code);
      const combined = `${result.title} ${result.explanation} ${result.resolution}`;
      // Must not contain stack traces, error codes, or DB references
      expect(combined).not.toMatch(/Error:/i);
      expect(combined).not.toMatch(/stack/i);
      expect(combined).not.toMatch(/prisma/i);
      expect(combined).not.toMatch(/database/i);
      expect(combined).not.toMatch(/sql/i);
    }
  });

  it("all titles are concise (under 30 characters)", () => {
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      const result = getControlExplanation(code);
      expect(result.title.length).toBeLessThanOrEqual(30);
    }
  });
});
