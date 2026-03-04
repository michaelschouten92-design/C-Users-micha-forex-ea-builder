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
      expect(result.resolution.length).toBeGreaterThan(0);
    }
  });

  it("covers all known reason codes (exhaustiveness)", () => {
    const covered = ALL_HEARTBEAT_REASON_CODES.filter((code) => {
      const result = getControlExplanation(code);
      return result !== undefined;
    });
    expect(covered).toHaveLength(ALL_HEARTBEAT_REASON_CODES.length);
  });

  it("every resolution item has a text field", () => {
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      const result = getControlExplanation(code);
      for (const item of result.resolution) {
        expect(typeof item.text).toBe("string");
        expect(item.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("all href values are internal paths starting with /", () => {
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      const result = getControlExplanation(code);
      for (const item of result.resolution) {
        if (item.href !== undefined) {
          expect(item.href).toMatch(/^\//);
        }
      }
    }
  });

  it("returns correct explanation for OK", () => {
    const result = getControlExplanation("OK");
    expect(result.title).toBe("Execution Authorized");
    expect(result.explanation).toContain("All governance checks passed");
    expect(result.resolution[0].text).toContain("No action required");
  });

  it("returns correct explanation for AUTHORITY_UNINITIALIZED with deep links", () => {
    const result = getControlExplanation("AUTHORITY_UNINITIALIZED");
    expect(result.title).toBe("Authority Not Initialized");
    expect(result.explanation).toContain("authority system is not yet ready");

    // Must include at least one link to onboarding
    const hrefs = result.resolution.filter((r) => r.href);
    expect(hrefs.length).toBeGreaterThanOrEqual(1);
    expect(hrefs.some((r) => r.href === "/app/onboarding?step=scope")).toBe(true);
  });

  it("returns correct explanation for STRATEGY_HALTED with deep link", () => {
    const result = getControlExplanation("STRATEGY_HALTED");
    expect(result.title).toBe("Operator Halt Active");
    expect(result.explanation).toContain("HALT override");
    expect(result.resolution[0].text).toContain("Release the operator hold");
    expect(result.resolution[0].href).toBe("/app/live#operator-hold");
  });

  it("returns correct explanation for STRATEGY_INVALIDATED", () => {
    const result = getControlExplanation("STRATEGY_INVALIDATED");
    expect(result.title).toBe("Strategy Invalidated");
    expect(result.explanation).toContain("terminal lifecycle state");
    expect(result.resolution[0].text).toContain("permanent state");
  });

  it("returns correct explanation for CONTROL_INCONSISTENCY_DETECTED", () => {
    const result = getControlExplanation("CONTROL_INCONSISTENCY_DETECTED");
    expect(result.title).toBe("Control Inconsistency");
    expect(result.explanation).toContain("consistency guard");
    expect(result.resolution[0].text).toContain("self-correct");
  });

  it("NO_INSTANCE includes a link to /app/live", () => {
    const result = getControlExplanation("NO_INSTANCE");
    const link = result.resolution.find((r) => r.href === "/app/live");
    expect(link).toBeDefined();
    expect(link!.text).toBe("Go to Command Center");
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
      const resolutionText = result.resolution.map((r) => r.text).join(" ");
      const combined = `${result.title} ${result.explanation} ${resolutionText}`;
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
