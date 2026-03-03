import { describe, it, expect } from "vitest";
import { assertHeartbeatConsistency } from "./assert-heartbeat-consistency";
import type { HeartbeatInput, HeartbeatDecision } from "./decide-heartbeat-action";

const NOW = new Date("2026-03-03T12:00:00Z");

function input(overrides: Partial<HeartbeatInput> = {}): HeartbeatInput {
  return {
    lifecycleState: "LIVE_MONITORING",
    operatorHold: "NONE",
    monitoringSuppressedUntil: null,
    now: NOW,
    ...overrides,
  };
}

describe("assertHeartbeatConsistency", () => {
  // ── Consistent decisions pass through unchanged ─────────

  it("preserves RUN when state is all-clear", () => {
    const decision: HeartbeatDecision = { action: "RUN", reasonCode: "OK" };
    const result = assertHeartbeatConsistency(input(), decision);
    expect(result).toEqual(decision);
  });

  it("preserves STOP when HALTED", () => {
    const decision: HeartbeatDecision = { action: "STOP", reasonCode: "STRATEGY_HALTED" };
    const result = assertHeartbeatConsistency(input({ operatorHold: "HALTED" }), decision);
    expect(result).toEqual(decision);
  });

  it("preserves STOP when INVALIDATED", () => {
    const decision: HeartbeatDecision = { action: "STOP", reasonCode: "STRATEGY_INVALIDATED" };
    const result = assertHeartbeatConsistency(input({ lifecycleState: "INVALIDATED" }), decision);
    expect(result).toEqual(decision);
  });

  it("preserves PAUSE when EDGE_AT_RISK", () => {
    const decision: HeartbeatDecision = { action: "PAUSE", reasonCode: "MONITORING_AT_RISK" };
    const result = assertHeartbeatConsistency(input({ lifecycleState: "EDGE_AT_RISK" }), decision);
    expect(result).toEqual(decision);
  });

  it("preserves PAUSE when suppressed", () => {
    const decision: HeartbeatDecision = { action: "PAUSE", reasonCode: "MONITORING_SUPPRESSED" };
    const result = assertHeartbeatConsistency(
      input({ monitoringSuppressedUntil: new Date("2026-03-03T13:00:00Z") }),
      decision
    );
    expect(result).toEqual(decision);
  });

  it("preserves STOP when HALTED + INVALIDATED (both justify STOP)", () => {
    const decision: HeartbeatDecision = { action: "STOP", reasonCode: "STRATEGY_HALTED" };
    const result = assertHeartbeatConsistency(
      input({ operatorHold: "HALTED", lifecycleState: "INVALIDATED" }),
      decision
    );
    expect(result).toEqual(decision);
  });

  // ── Too-permissive decisions → corrected ────────────────

  it("corrects RUN when INVALIDATED → PAUSE + CONTROL_INCONSISTENCY_DETECTED", () => {
    const decision: HeartbeatDecision = { action: "RUN", reasonCode: "OK" };
    const result = assertHeartbeatConsistency(input({ lifecycleState: "INVALIDATED" }), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("corrects RUN when HALTED → PAUSE + CONTROL_INCONSISTENCY_DETECTED", () => {
    const decision: HeartbeatDecision = { action: "RUN", reasonCode: "OK" };
    const result = assertHeartbeatConsistency(input({ operatorHold: "HALTED" }), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("corrects RUN when EDGE_AT_RISK → PAUSE", () => {
    const decision: HeartbeatDecision = { action: "RUN", reasonCode: "OK" };
    const result = assertHeartbeatConsistency(input({ lifecycleState: "EDGE_AT_RISK" }), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("corrects RUN when suppressed → PAUSE", () => {
    const decision: HeartbeatDecision = { action: "RUN", reasonCode: "OK" };
    const result = assertHeartbeatConsistency(
      input({ monitoringSuppressedUntil: new Date("2026-03-03T13:00:00Z") }),
      decision
    );
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  // ── Insufficient-severity decisions → corrected ─────────

  it("corrects PAUSE when HALTED (should be STOP, but guard cannot escalate)", () => {
    const decision: HeartbeatDecision = { action: "PAUSE", reasonCode: "MONITORING_AT_RISK" };
    const result = assertHeartbeatConsistency(input({ operatorHold: "HALTED" }), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("corrects PAUSE when INVALIDATED (should be STOP, but guard cannot escalate)", () => {
    const decision: HeartbeatDecision = { action: "PAUSE", reasonCode: "MONITORING_AT_RISK" };
    const result = assertHeartbeatConsistency(input({ lifecycleState: "INVALIDATED" }), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  // ── Unjustified STOP → downgraded ──────────────────────

  it("corrects STOP when all-clear (unjustified) → PAUSE", () => {
    const decision: HeartbeatDecision = { action: "STOP", reasonCode: "STRATEGY_HALTED" };
    const result = assertHeartbeatConsistency(input(), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("corrects STOP when EDGE_AT_RISK (should be PAUSE, not STOP)", () => {
    const decision: HeartbeatDecision = { action: "STOP", reasonCode: "STRATEGY_HALTED" };
    const result = assertHeartbeatConsistency(input({ lifecycleState: "EDGE_AT_RISK" }), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("corrects STOP when suppressed (should be PAUSE, not STOP)", () => {
    const decision: HeartbeatDecision = { action: "STOP", reasonCode: "STRATEGY_HALTED" };
    const result = assertHeartbeatConsistency(
      input({ monitoringSuppressedUntil: new Date("2026-03-03T13:00:00Z") }),
      decision
    );
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  // ── Overly cautious decision → flagged ──────────────────

  it("corrects PAUSE when all-clear (should be RUN)", () => {
    const decision: HeartbeatDecision = { action: "PAUSE", reasonCode: "NO_INSTANCE" };
    const result = assertHeartbeatConsistency(input(), decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  // ── Null input ──────────────────────────────────────────

  it("preserves PAUSE when no input (fail-closed)", () => {
    const decision: HeartbeatDecision = { action: "PAUSE", reasonCode: "NO_INSTANCE" };
    const result = assertHeartbeatConsistency(null, decision);
    expect(result).toEqual(decision);
  });

  it("corrects RUN when no input → PAUSE", () => {
    const decision: HeartbeatDecision = { action: "RUN", reasonCode: "OK" };
    const result = assertHeartbeatConsistency(null, decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("corrects STOP when no input → PAUSE", () => {
    const decision: HeartbeatDecision = { action: "STOP", reasonCode: "STRATEGY_HALTED" };
    const result = assertHeartbeatConsistency(null, decision);
    expect(result.action).toBe("PAUSE");
    expect(result.reasonCode).toBe("CONTROL_INCONSISTENCY_DETECTED");
  });

  it("preserves PAUSE when lifecycleState is null", () => {
    const decision: HeartbeatDecision = { action: "PAUSE", reasonCode: "NO_INSTANCE" };
    const result = assertHeartbeatConsistency(input({ lifecycleState: null }), decision);
    expect(result).toEqual(decision);
  });

  // ── Guard never returns STOP ────────────────────────────

  it("never produces STOP in output (design invariant)", () => {
    const scenarios: Array<{ input: HeartbeatInput | null; decision: HeartbeatDecision }> = [
      { input: null, decision: { action: "RUN", reasonCode: "OK" } },
      { input: null, decision: { action: "STOP", reasonCode: "STRATEGY_HALTED" } },
      { input: input(), decision: { action: "STOP", reasonCode: "STRATEGY_HALTED" } },
      {
        input: input({ lifecycleState: "EDGE_AT_RISK" }),
        decision: { action: "STOP", reasonCode: "STRATEGY_HALTED" },
      },
    ];

    for (const s of scenarios) {
      const result = assertHeartbeatConsistency(s.input, s.decision);
      if (result.reasonCode === "CONTROL_INCONSISTENCY_DETECTED") {
        expect(result.action).not.toBe("STOP");
      }
    }
  });

  // ── Suppression boundary ────────────────────────────────

  it("expired suppression does not trigger guard (RUN is valid)", () => {
    const decision: HeartbeatDecision = { action: "RUN", reasonCode: "OK" };
    const result = assertHeartbeatConsistency(
      input({ monitoringSuppressedUntil: new Date("2026-03-03T11:00:00Z") }),
      decision
    );
    expect(result).toEqual(decision);
  });
});
