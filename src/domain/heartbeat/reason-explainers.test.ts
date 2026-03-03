import { describe, it, expect } from "vitest";
import { explainReasonCode, KNOWN_REASON_CODES } from "./reason-explainers";
import { ALL_HEARTBEAT_REASON_CODES } from "./decide-heartbeat-action";

describe("explainReasonCode", () => {
  it("returns an explanation for every known reason code", () => {
    for (const code of KNOWN_REASON_CODES) {
      const result = explainReasonCode(code);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(10);
    }
  });

  it("covers all contract-defined reason codes", () => {
    const CONTRACT_CODES = [
      "OK",
      "STRATEGY_HALTED",
      "STRATEGY_INVALIDATED",
      "MONITORING_AT_RISK",
      "MONITORING_SUPPRESSED",
      "NO_INSTANCE",
      "CONFIG_UNAVAILABLE",
      "COMPUTATION_FAILED",
      "NO_HEARTBEAT_PROOF",
    ];

    for (const code of CONTRACT_CODES) {
      expect(KNOWN_REASON_CODES).toContain(code);
      expect(explainReasonCode(code)).not.toContain("Unknown");
    }
  });

  it("has an explainer for every HeartbeatReasonCode union member (exhaustive)", () => {
    // ALL_HEARTBEAT_REASON_CODES is derived from a compile-time exhaustive
    // Record<HeartbeatReasonCode, true>. If a new union member is added
    // without an explainer, this test fails.
    for (const code of ALL_HEARTBEAT_REASON_CODES) {
      expect(KNOWN_REASON_CODES).toContain(code);
      expect(explainReasonCode(code)).not.toContain("Unknown");
    }
  });

  it("returns fallback for unknown reason codes", () => {
    expect(explainReasonCode("SOME_FUTURE_CODE")).toContain("Unknown");
  });

  it("never returns empty string", () => {
    expect(explainReasonCode("")).toBeTruthy();
    expect(explainReasonCode("NONEXISTENT")).toBeTruthy();
  });

  it("explanations never contain raw error messages or stack traces", () => {
    for (const code of KNOWN_REASON_CODES) {
      const explanation = explainReasonCode(code);
      expect(explanation).not.toMatch(/Error:|at \w+\.|stack|trace/i);
    }
  });

  it("STOP reason codes mention STOP in explanation", () => {
    expect(explainReasonCode("STRATEGY_HALTED")).toContain("STOP");
    expect(explainReasonCode("STRATEGY_INVALIDATED")).toContain("STOP");
  });

  it("PAUSE reason codes mention PAUSE in explanation", () => {
    expect(explainReasonCode("MONITORING_AT_RISK")).toContain("PAUSE");
    expect(explainReasonCode("MONITORING_SUPPRESSED")).toContain("PAUSE");
    expect(explainReasonCode("COMPUTATION_FAILED")).toContain("PAUSE");
    expect(explainReasonCode("NO_INSTANCE")).toContain("PAUSE");
    expect(explainReasonCode("NO_HEARTBEAT_PROOF")).toContain("PAUSE");
  });

  it("OK reason code mentions authorized", () => {
    expect(explainReasonCode("OK")).toContain("authorized");
  });
});
