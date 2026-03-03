import { describe, it, expect } from "vitest";
import {
  verifyHeartbeatProofEvent,
  HEARTBEAT_EVENT_TYPES,
  type HeartbeatProofFailureCode,
} from "./verify-heartbeat-proof";
import { serializeGovernanceSnapshot } from "@/domain/heartbeat/build-governance-snapshot";
import type { HeartbeatGovernanceSnapshot } from "@/domain/heartbeat/build-governance-snapshot";
import { buildConfigSnapshot } from "@/domain/verification/config-snapshot";

const config = buildConfigSnapshot();

/** Build a canonical governance snapshot string for testing. */
function snapshot(overrides: Partial<HeartbeatGovernanceSnapshot> = {}): string {
  return serializeGovernanceSnapshot({
    configVersion: config.configVersion,
    lifecycleState: "LIVE_MONITORING",
    operatorHold: "NONE",
    suppressionActive: false,
    thresholdsHash: config.thresholdsHash,
    ...overrides,
  });
}

/** Build a valid HEARTBEAT_DECISION_MADE payload. */
function decisionPayload(
  overrides: Record<string, unknown> = {},
  snapshotOverrides: Partial<HeartbeatGovernanceSnapshot> = {}
): Record<string, unknown> {
  return {
    eventType: "HEARTBEAT_DECISION_MADE",
    recordId: "rec_1",
    strategyId: "strat_1",
    action: "RUN",
    reasonCode: "OK",
    governanceSnapshot: snapshot(snapshotOverrides),
    timestamp: "2026-03-03T12:00:00.000Z",
    ...overrides,
  };
}

/** Build a valid HEARTBEAT_CONTROL_INCONSISTENCY payload. */
function inconsistencyPayload(
  overrides: Record<string, unknown> = {},
  snapshotOverrides: Partial<HeartbeatGovernanceSnapshot> = {}
): Record<string, unknown> {
  return {
    eventType: "HEARTBEAT_CONTROL_INCONSISTENCY",
    recordId: "rec_1",
    strategyId: "strat_1",
    originalAction: "RUN",
    originalReasonCode: "OK",
    guardedAction: "PAUSE",
    guardedReasonCode: "CONTROL_INCONSISTENCY_DETECTED",
    governanceSnapshot: snapshot(snapshotOverrides),
    timestamp: "2026-03-03T12:00:00.000Z",
    ...overrides,
  };
}

// ── HEARTBEAT_EVENT_TYPES ───────────────────────────────

describe("HEARTBEAT_EVENT_TYPES", () => {
  it("contains exactly 2 event types", () => {
    expect(HEARTBEAT_EVENT_TYPES.size).toBe(2);
    expect(HEARTBEAT_EVENT_TYPES.has("HEARTBEAT_DECISION_MADE")).toBe(true);
    expect(HEARTBEAT_EVENT_TYPES.has("HEARTBEAT_CONTROL_INCONSISTENCY")).toBe(true);
  });
});

// ── HEARTBEAT_DECISION_MADE ─────────────────────────────

describe("verifyHeartbeatProofEvent — HEARTBEAT_DECISION_MADE", () => {
  it("passes for valid RUN + OK with all-clear snapshot", () => {
    const result = verifyHeartbeatProofEvent("HEARTBEAT_DECISION_MADE", decisionPayload());
    expect(result).toEqual({ ok: true });
  });

  it("passes for valid STOP + STRATEGY_HALTED with HALTED snapshot", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "STOP", reasonCode: "STRATEGY_HALTED" }, { operatorHold: "HALTED" })
    );
    expect(result).toEqual({ ok: true });
  });

  it("passes for valid STOP + STRATEGY_INVALIDATED with INVALIDATED snapshot", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload(
        { action: "STOP", reasonCode: "STRATEGY_INVALIDATED" },
        { lifecycleState: "INVALIDATED" }
      )
    );
    expect(result).toEqual({ ok: true });
  });

  it("passes for valid PAUSE + MONITORING_AT_RISK with EDGE_AT_RISK snapshot", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload(
        { action: "PAUSE", reasonCode: "MONITORING_AT_RISK" },
        { lifecycleState: "EDGE_AT_RISK" }
      )
    );
    expect(result).toEqual({ ok: true });
  });

  it("passes for valid PAUSE + MONITORING_SUPPRESSED with suppression active", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload(
        { action: "PAUSE", reasonCode: "MONITORING_SUPPRESSED" },
        { suppressionActive: true }
      )
    );
    expect(result).toEqual({ ok: true });
  });

  it("passes for valid PAUSE + NO_INSTANCE with null lifecycleState", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload(
        { action: "PAUSE", reasonCode: "NO_INSTANCE" },
        { lifecycleState: null, operatorHold: null }
      )
    );
    expect(result).toEqual({ ok: true });
  });

  it("passes for PAUSE + CONTROL_INCONSISTENCY_DETECTED (guard triggered)", () => {
    // Guard can trigger in any state — the guard corrected a mismatch
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "PAUSE", reasonCode: "CONTROL_INCONSISTENCY_DETECTED" })
    );
    expect(result).toEqual({ ok: true });
  });

  // ── Snapshot structural failures ────────────────────────

  it("fails with HEARTBEAT_SNAPSHOT_MISSING when governanceSnapshot is absent", () => {
    const payload = decisionPayload();
    delete payload.governanceSnapshot;
    expectFailure("HEARTBEAT_DECISION_MADE", payload, "HEARTBEAT_SNAPSHOT_MISSING");
  });

  it("fails with HEARTBEAT_SNAPSHOT_NOT_STRING when governanceSnapshot is not a string", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: { configVersion: "2.3.2" } }),
      "HEARTBEAT_SNAPSHOT_NOT_STRING"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_INVALID_JSON when snapshot is not valid JSON", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: "not-json{" }),
      "HEARTBEAT_SNAPSHOT_INVALID_JSON"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_INVALID_JSON when snapshot is a JSON array", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: "[1,2,3]" }),
      "HEARTBEAT_SNAPSHOT_INVALID_JSON"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_KEY_COUNT when snapshot has extra keys", () => {
    const parsed = JSON.parse(snapshot());
    parsed.extraKey = "bad";
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: JSON.stringify(parsed) }),
      "HEARTBEAT_SNAPSHOT_KEY_COUNT"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_KEY_COUNT when snapshot has too few keys", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({
        governanceSnapshot: JSON.stringify({ configVersion: "2.3.2", thresholdsHash: "abc" }),
      }),
      "HEARTBEAT_SNAPSHOT_KEY_COUNT"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_KEY_MISMATCH when required key is missing", () => {
    // 5 keys but one is wrong
    const parsed = JSON.parse(snapshot());
    delete parsed.suppressionActive;
    parsed.wrongKey = false;
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: JSON.stringify(parsed) }),
      "HEARTBEAT_SNAPSHOT_KEY_MISMATCH"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_TYPE_ERROR when configVersion is empty", () => {
    // Build a non-canonical snapshot with empty configVersion (bypasses serializeGovernanceSnapshot)
    const obj = {
      configVersion: "",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      suppressionActive: false,
      thresholdsHash: config.thresholdsHash,
    };
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: JSON.stringify(obj) }),
      "HEARTBEAT_SNAPSHOT_TYPE_ERROR"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_TYPE_ERROR when suppressionActive is not boolean", () => {
    const obj = {
      configVersion: config.configVersion,
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      suppressionActive: "yes",
      thresholdsHash: config.thresholdsHash,
    };
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: JSON.stringify(obj) }),
      "HEARTBEAT_SNAPSHOT_TYPE_ERROR"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_TYPE_ERROR when thresholdsHash is empty", () => {
    const obj = {
      configVersion: config.configVersion,
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      suppressionActive: false,
      thresholdsHash: "",
    };
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: JSON.stringify(obj) }),
      "HEARTBEAT_SNAPSHOT_TYPE_ERROR"
    );
  });

  it("fails with HEARTBEAT_SNAPSHOT_TYPE_ERROR when lifecycleState is a number", () => {
    const obj = {
      configVersion: config.configVersion,
      lifecycleState: 42,
      operatorHold: "NONE",
      suppressionActive: false,
      thresholdsHash: config.thresholdsHash,
    };
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: JSON.stringify(obj) }),
      "HEARTBEAT_SNAPSHOT_TYPE_ERROR"
    );
  });

  // ── Canonicalization failure ────────────────────────────

  it("fails with HEARTBEAT_SNAPSHOT_NON_CANONICAL when keys are in wrong order", () => {
    // Build JSON with unsorted keys (thresholdsHash before configVersion)
    const nonCanonical = JSON.stringify({
      thresholdsHash: config.thresholdsHash,
      configVersion: config.configVersion,
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      suppressionActive: false,
    });
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: nonCanonical }),
      "HEARTBEAT_SNAPSHOT_NON_CANONICAL"
    );
  });

  // ── Action/reasonCode consistency failures ─────────────

  it("fails with HEARTBEAT_ACTION_INCONSISTENT when action is not a valid enum", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "RESUME" }),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });

  it("fails with HEARTBEAT_ACTION_INCONSISTENT when reasonCode is not a valid enum", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ reasonCode: "CUSTOM_ERROR_MESSAGE" }),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });

  it("fails when HALTED snapshot produces RUN action", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "RUN", reasonCode: "OK" }, { operatorHold: "HALTED" }),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });

  it("fails when INVALIDATED snapshot produces RUN action", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "RUN", reasonCode: "OK" }, { lifecycleState: "INVALIDATED" }),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });

  it("fails when suppressionActive=true produces RUN action", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "RUN", reasonCode: "OK" }, { suppressionActive: true }),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });

  it("fails when EDGE_AT_RISK snapshot produces RUN action", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "RUN", reasonCode: "OK" }, { lifecycleState: "EDGE_AT_RISK" }),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });

  it("fails when all-clear snapshot produces STOP action", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ action: "STOP", reasonCode: "STRATEGY_HALTED" }),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });

  // ── Guard invariant in DECISION_MADE ───────────────────

  it("fails HEARTBEAT_GUARD_INVARIANT_VIOLATED when CID has action=STOP", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload(
        { action: "STOP", reasonCode: "CONTROL_INCONSISTENCY_DETECTED" },
        { operatorHold: "HALTED" }
      ),
      "HEARTBEAT_GUARD_INVARIANT_VIOLATED"
    );
  });

  // ── Priority order: HALTED overrides EDGE_AT_RISK ──────

  it("HALTED + EDGE_AT_RISK → expected STOP (HALTED has higher priority)", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload(
        { action: "STOP", reasonCode: "STRATEGY_HALTED" },
        { operatorHold: "HALTED", lifecycleState: "EDGE_AT_RISK" }
      )
    );
    expect(result).toEqual({ ok: true });
  });

  it("HALTED + EDGE_AT_RISK → PAUSE is inconsistent (expected STOP)", () => {
    expectFailure(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload(
        { action: "PAUSE", reasonCode: "MONITORING_AT_RISK" },
        { operatorHold: "HALTED", lifecycleState: "EDGE_AT_RISK" }
      ),
      "HEARTBEAT_ACTION_INCONSISTENT"
    );
  });
});

// ── HEARTBEAT_CONTROL_INCONSISTENCY ─────────────────────

describe("verifyHeartbeatProofEvent — HEARTBEAT_CONTROL_INCONSISTENCY", () => {
  it("passes for valid inconsistency event", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_CONTROL_INCONSISTENCY",
      inconsistencyPayload()
    );
    expect(result).toEqual({ ok: true });
  });

  it("passes with HALTED snapshot (guard may detect mismatch in any state)", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_CONTROL_INCONSISTENCY",
      inconsistencyPayload(
        { originalAction: "PAUSE", originalReasonCode: "MONITORING_AT_RISK" },
        { operatorHold: "HALTED" }
      )
    );
    expect(result).toEqual({ ok: true });
  });

  it("fails with HEARTBEAT_SNAPSHOT_MISSING when governanceSnapshot is absent", () => {
    const payload = inconsistencyPayload();
    delete payload.governanceSnapshot;
    expectFailure("HEARTBEAT_CONTROL_INCONSISTENCY", payload, "HEARTBEAT_SNAPSHOT_MISSING");
  });

  it("fails with HEARTBEAT_SNAPSHOT_INVALID_JSON for bad JSON", () => {
    expectFailure(
      "HEARTBEAT_CONTROL_INCONSISTENCY",
      inconsistencyPayload({ governanceSnapshot: "{bad" }),
      "HEARTBEAT_SNAPSHOT_INVALID_JSON"
    );
  });

  it("fails with HEARTBEAT_GUARD_INVARIANT_VIOLATED when guardedAction is not PAUSE", () => {
    expectFailure(
      "HEARTBEAT_CONTROL_INCONSISTENCY",
      inconsistencyPayload({ guardedAction: "STOP" }),
      "HEARTBEAT_GUARD_INVARIANT_VIOLATED"
    );
  });

  it("fails with HEARTBEAT_GUARD_INVARIANT_VIOLATED when guardedReasonCode is wrong", () => {
    expectFailure(
      "HEARTBEAT_CONTROL_INCONSISTENCY",
      inconsistencyPayload({ guardedReasonCode: "STRATEGY_HALTED" }),
      "HEARTBEAT_GUARD_INVARIANT_VIOLATED"
    );
  });

  it("fails with HEARTBEAT_GUARD_FIELDS_MISSING when originalAction is missing", () => {
    const payload = inconsistencyPayload();
    delete payload.originalAction;
    expectFailure("HEARTBEAT_CONTROL_INCONSISTENCY", payload, "HEARTBEAT_GUARD_FIELDS_MISSING");
  });

  it("fails with HEARTBEAT_GUARD_FIELDS_MISSING when originalReasonCode is missing", () => {
    const payload = inconsistencyPayload();
    delete payload.originalReasonCode;
    expectFailure("HEARTBEAT_CONTROL_INCONSISTENCY", payload, "HEARTBEAT_GUARD_FIELDS_MISSING");
  });

  it("fails with HEARTBEAT_GUARD_FIELD_NOT_ENUM when originalAction is not a valid enum", () => {
    expectFailure(
      "HEARTBEAT_CONTROL_INCONSISTENCY",
      inconsistencyPayload({ originalAction: "RESUME" }),
      "HEARTBEAT_GUARD_FIELD_NOT_ENUM"
    );
  });

  it("fails with HEARTBEAT_GUARD_FIELD_NOT_ENUM when originalReasonCode is raw string", () => {
    expectFailure(
      "HEARTBEAT_CONTROL_INCONSISTENCY",
      inconsistencyPayload({ originalReasonCode: "Something went wrong" }),
      "HEARTBEAT_GUARD_FIELD_NOT_ENUM"
    );
  });
});

// ── Non-heartbeat event types ───────────────────────────

describe("verifyHeartbeatProofEvent — non-heartbeat events", () => {
  it("returns ok for unknown event types (not applicable)", () => {
    const result = verifyHeartbeatProofEvent("VERIFICATION_RUN_COMPLETED", {});
    expect(result).toEqual({ ok: true });
  });
});

// ── Determinism ─────────────────────────────────────────

describe("verifyHeartbeatProofEvent — determinism", () => {
  it("produces identical results for identical inputs", () => {
    const payload = decisionPayload();
    const a = verifyHeartbeatProofEvent("HEARTBEAT_DECISION_MADE", payload);
    const b = verifyHeartbeatProofEvent("HEARTBEAT_DECISION_MADE", payload);
    expect(a).toEqual(b);
  });

  it("failure codes are stable enum strings, never raw error messages", () => {
    const result = verifyHeartbeatProofEvent(
      "HEARTBEAT_DECISION_MADE",
      decisionPayload({ governanceSnapshot: "not-json" })
    );
    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe("HEARTBEAT_SNAPSHOT_INVALID_JSON");
    expect(result.failureCode).toMatch(/^HEARTBEAT_/);
  });
});

// ── Test helper ─────────────────────────────────────────

function expectFailure(
  eventType: string,
  payload: Record<string, unknown>,
  expectedCode: HeartbeatProofFailureCode
): void {
  const result = verifyHeartbeatProofEvent(eventType, payload);
  expect(result.ok).toBe(false);
  expect(result.failureCode).toBe(expectedCode);
}
