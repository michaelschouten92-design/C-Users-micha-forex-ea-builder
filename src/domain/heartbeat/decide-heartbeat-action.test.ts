import { describe, it, expect } from "vitest";
import { decideHeartbeatAction, type HeartbeatInput } from "./decide-heartbeat-action";

const NOW = new Date("2026-03-03T12:00:00Z");

function makeInput(overrides: Partial<HeartbeatInput> = {}): HeartbeatInput {
  return {
    lifecycleState: "LIVE_MONITORING",
    operatorHold: "NONE",
    monitoringSuppressedUntil: null,
    now: NOW,
    authorityReady: true,
    ...overrides,
  };
}

describe("decideHeartbeatAction", () => {
  // ── NO_INSTANCE (priority 1) ──────────────────────────

  it("returns PAUSE + NO_INSTANCE when input is null", () => {
    const result = decideHeartbeatAction(null);
    expect(result).toEqual({ action: "PAUSE", reasonCode: "NO_INSTANCE" });
  });

  it("returns PAUSE + NO_INSTANCE when lifecycleState is null", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: null }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "NO_INSTANCE" });
  });

  it("NO_INSTANCE is fail-closed PAUSE (not STOP)", () => {
    const result = decideHeartbeatAction(null);
    expect(result.action).toBe("PAUSE");
  });

  // ── AUTHORITY_UNINITIALIZED (priority 2) ─────────────────

  it("returns PAUSE + AUTHORITY_UNINITIALIZED when authorityReady is false", () => {
    const result = decideHeartbeatAction(makeInput({ authorityReady: false }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "AUTHORITY_UNINITIALIZED" });
  });

  it("AUTHORITY_UNINITIALIZED overrides HALTED", () => {
    const result = decideHeartbeatAction(
      makeInput({ authorityReady: false, operatorHold: "HALTED" })
    );
    expect(result).toEqual({ action: "PAUSE", reasonCode: "AUTHORITY_UNINITIALIZED" });
  });

  it("AUTHORITY_UNINITIALIZED overrides INVALIDATED", () => {
    const result = decideHeartbeatAction(
      makeInput({ authorityReady: false, lifecycleState: "INVALIDATED" })
    );
    expect(result).toEqual({ action: "PAUSE", reasonCode: "AUTHORITY_UNINITIALIZED" });
  });

  it("AUTHORITY_UNINITIALIZED overrides EDGE_AT_RISK", () => {
    const result = decideHeartbeatAction(
      makeInput({ authorityReady: false, lifecycleState: "EDGE_AT_RISK" })
    );
    expect(result).toEqual({ action: "PAUSE", reasonCode: "AUTHORITY_UNINITIALIZED" });
  });

  it("authority ready proceeds to normal decision", () => {
    const result = decideHeartbeatAction(makeInput({ authorityReady: true }));
    expect(result).toEqual({ action: "RUN", reasonCode: "OK" });
  });

  // ── HALTED (priority 3 — orthogonal operator authority) ─

  it("returns STOP + STRATEGY_HALTED when operatorHold is HALTED", () => {
    const result = decideHeartbeatAction(makeInput({ operatorHold: "HALTED" }));
    expect(result).toEqual({ action: "STOP", reasonCode: "STRATEGY_HALTED" });
  });

  it("HALTED overrides INVALIDATED (operator authority is supreme)", () => {
    const result = decideHeartbeatAction(
      makeInput({ lifecycleState: "INVALIDATED", operatorHold: "HALTED" })
    );
    expect(result).toEqual({ action: "STOP", reasonCode: "STRATEGY_HALTED" });
  });

  it("HALTED overrides EDGE_AT_RISK", () => {
    const result = decideHeartbeatAction(
      makeInput({ operatorHold: "HALTED", lifecycleState: "EDGE_AT_RISK" })
    );
    expect(result).toEqual({ action: "STOP", reasonCode: "STRATEGY_HALTED" });
  });

  it("HALTED overrides active suppression", () => {
    const future = new Date("2026-03-03T13:00:00Z");
    const result = decideHeartbeatAction(
      makeInput({ operatorHold: "HALTED", monitoringSuppressedUntil: future })
    );
    expect(result).toEqual({ action: "STOP", reasonCode: "STRATEGY_HALTED" });
  });

  it("HALTED + EDGE_AT_RISK + active suppression => STOP + STRATEGY_HALTED", () => {
    const future = new Date("2026-03-03T13:00:00Z");
    const result = decideHeartbeatAction(
      makeInput({
        operatorHold: "HALTED",
        lifecycleState: "EDGE_AT_RISK",
        monitoringSuppressedUntil: future,
      })
    );
    expect(result).toEqual({ action: "STOP", reasonCode: "STRATEGY_HALTED" });
  });

  // ── INVALIDATED (priority 4 — terminal) ────────────────

  it("returns STOP + STRATEGY_INVALIDATED when lifecycle is INVALIDATED", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "INVALIDATED" }));
    expect(result).toEqual({ action: "STOP", reasonCode: "STRATEGY_INVALIDATED" });
  });

  // ── NOT_LIVE (priority 5 — pre-live states) ────────────

  it("returns PAUSE + NOT_LIVE for DRAFT lifecycle state", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "DRAFT" }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "NOT_LIVE" });
  });

  it("returns PAUSE + NOT_LIVE for BACKTESTED lifecycle state", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "BACKTESTED" }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "NOT_LIVE" });
  });

  it("returns PAUSE + NOT_LIVE for VERIFIED lifecycle state", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "VERIFIED" }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "NOT_LIVE" });
  });

  // ── UNKNOWN_LIFECYCLE_STATE (fail-closed) ──────────────

  it("returns PAUSE + NOT_LIVE for unknown lifecycle state (fail-closed)", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "SOME_FUTURE_STATE" }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "NOT_LIVE" });
  });

  it("unknown state never resolves to RUN", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "BANANA" }));
    expect(result.action).not.toBe("RUN");
  });

  it("empty string lifecycle state is fail-closed PAUSE", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "" }));
    expect(result.action).toBe("PAUSE");
  });

  // ── EDGE_AT_RISK (priority 6) ─────────────────────────

  it("returns PAUSE + MONITORING_AT_RISK when lifecycle is EDGE_AT_RISK", () => {
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "EDGE_AT_RISK" }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "MONITORING_AT_RISK" });
  });

  // ── SUPPRESSED (priority 7) ───────────────────────────

  it("returns PAUSE + MONITORING_SUPPRESSED when suppression is active", () => {
    const future = new Date("2026-03-03T13:00:00Z");
    const result = decideHeartbeatAction(makeInput({ monitoringSuppressedUntil: future }));
    expect(result).toEqual({ action: "PAUSE", reasonCode: "MONITORING_SUPPRESSED" });
  });

  it("returns RUN when suppression has expired", () => {
    const past = new Date("2026-03-03T11:00:00Z");
    const result = decideHeartbeatAction(makeInput({ monitoringSuppressedUntil: past }));
    expect(result).toEqual({ action: "RUN", reasonCode: "OK" });
  });

  it("returns RUN when suppression is exactly now (boundary: now >= suppressedUntil)", () => {
    const result = decideHeartbeatAction(makeInput({ monitoringSuppressedUntil: NOW }));
    expect(result).toEqual({ action: "RUN", reasonCode: "OK" });
  });

  // ── RUN (priority 8 — LIVE_MONITORING only) ────────────

  it("returns RUN + OK for LIVE_MONITORING with no holds", () => {
    const result = decideHeartbeatAction(makeInput());
    expect(result).toEqual({ action: "RUN", reasonCode: "OK" });
  });

  it("returns RUN for OVERRIDE_PENDING (not halted)", () => {
    const result = decideHeartbeatAction(makeInput({ operatorHold: "OVERRIDE_PENDING" }));
    expect(result).toEqual({ action: "RUN", reasonCode: "OK" });
  });

  it("returns RUN for null operatorHold (legacy/unset)", () => {
    const result = decideHeartbeatAction(makeInput({ operatorHold: null }));
    expect(result).toEqual({ action: "RUN", reasonCode: "OK" });
  });

  // ── Precedence tests ──────────────────────────────────

  it("HALTED beats NOT_LIVE (operator authority overrides lifecycle)", () => {
    const result = decideHeartbeatAction(
      makeInput({ operatorHold: "HALTED", lifecycleState: "DRAFT" })
    );
    expect(result).toEqual({ action: "STOP", reasonCode: "STRATEGY_HALTED" });
  });

  it("INVALIDATED beats EDGE_AT_RISK", () => {
    // INVALIDATED is terminal, EDGE_AT_RISK is just risk — terminal wins
    // (in practice these are mutually exclusive, but the priority is explicit)
    const result = decideHeartbeatAction(makeInput({ lifecycleState: "INVALIDATED" }));
    expect(result.action).toBe("STOP");
  });

  it("STOP conditions always beat RUN conditions", () => {
    // Even with a live lifecycle state, HALTED produces STOP
    const result = decideHeartbeatAction(
      makeInput({ lifecycleState: "LIVE_MONITORING", operatorHold: "HALTED" })
    );
    expect(result.action).toBe("STOP");
  });
});
