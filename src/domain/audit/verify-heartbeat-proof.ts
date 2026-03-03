/**
 * Pure verifier for heartbeat proof event payloads.
 *
 * Validates governance snapshot structure, canonicalization, and
 * action/reasonCode consistency with the snapshot state.
 *
 * Design rules:
 * - Pure function: no I/O, no side effects, deterministic.
 * - Failure codes are stable enums — never raw error messages.
 * - Follows the same priority order as decideHeartbeatAction.
 * - Used by audit replay as an additional semantic verification layer.
 */

import { serializeGovernanceSnapshot } from "@/domain/heartbeat/build-governance-snapshot";
import type { HeartbeatGovernanceSnapshot } from "@/domain/heartbeat/build-governance-snapshot";

// ── Stable failure codes ─────────────────────────────────

export type HeartbeatProofFailureCode =
  | "HEARTBEAT_SNAPSHOT_MISSING"
  | "HEARTBEAT_SNAPSHOT_NOT_STRING"
  | "HEARTBEAT_SNAPSHOT_INVALID_JSON"
  | "HEARTBEAT_SNAPSHOT_KEY_COUNT"
  | "HEARTBEAT_SNAPSHOT_KEY_MISMATCH"
  | "HEARTBEAT_SNAPSHOT_TYPE_ERROR"
  | "HEARTBEAT_SNAPSHOT_NON_CANONICAL"
  | "HEARTBEAT_ACTION_INCONSISTENT"
  | "HEARTBEAT_GUARD_INVARIANT_VIOLATED"
  | "HEARTBEAT_GUARD_FIELDS_MISSING"
  | "HEARTBEAT_GUARD_FIELD_NOT_ENUM";

export interface HeartbeatProofVerification {
  ok: boolean;
  failureCode?: HeartbeatProofFailureCode;
}

// ── Constants ────────────────────────────────────────────

const REQUIRED_SNAPSHOT_KEYS: ReadonlyArray<keyof HeartbeatGovernanceSnapshot> = [
  "configVersion",
  "lifecycleState",
  "operatorHold",
  "suppressionActive",
  "thresholdsHash",
];

/** Event types this verifier handles. */
export const HEARTBEAT_EVENT_TYPES = new Set([
  "HEARTBEAT_DECISION_MADE",
  "HEARTBEAT_CONTROL_INCONSISTENCY",
]);

const VALID_ACTIONS = new Set(["RUN", "PAUSE", "STOP"]);

const VALID_REASON_CODES = new Set([
  "OK",
  "STRATEGY_HALTED",
  "MONITORING_AT_RISK",
  "MONITORING_SUPPRESSED",
  "STRATEGY_INVALIDATED",
  "NO_INSTANCE",
  "CONFIG_UNAVAILABLE",
  "COMPUTATION_FAILED",
  "NO_HEARTBEAT_PROOF",
  "CONTROL_INCONSISTENCY_DETECTED",
]);

// ── Helpers ──────────────────────────────────────────────

function fail(code: HeartbeatProofFailureCode): HeartbeatProofVerification {
  return { ok: false, failureCode: code };
}

const PASS: HeartbeatProofVerification = { ok: true };

/**
 * Validate governance snapshot structure and canonicalization.
 * Returns the parsed snapshot on success, or a failure result.
 */
function validateSnapshot(
  payload: Record<string, unknown>
): { snapshot: HeartbeatGovernanceSnapshot } | HeartbeatProofVerification {
  const raw = payload.governanceSnapshot;

  if (raw === undefined || raw === null) {
    return fail("HEARTBEAT_SNAPSHOT_MISSING");
  }

  if (typeof raw !== "string") {
    return fail("HEARTBEAT_SNAPSHOT_NOT_STRING");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("HEARTBEAT_SNAPSHOT_INVALID_JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("HEARTBEAT_SNAPSHOT_INVALID_JSON");
  }

  const obj = parsed as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.length !== 5) {
    return fail("HEARTBEAT_SNAPSHOT_KEY_COUNT");
  }

  for (const key of REQUIRED_SNAPSHOT_KEYS) {
    if (!(key in obj)) {
      return fail("HEARTBEAT_SNAPSHOT_KEY_MISMATCH");
    }
  }

  // Value type checks
  if (typeof obj.configVersion !== "string" || obj.configVersion === "") {
    return fail("HEARTBEAT_SNAPSHOT_TYPE_ERROR");
  }
  if (obj.lifecycleState !== null && typeof obj.lifecycleState !== "string") {
    return fail("HEARTBEAT_SNAPSHOT_TYPE_ERROR");
  }
  if (obj.operatorHold !== null && typeof obj.operatorHold !== "string") {
    return fail("HEARTBEAT_SNAPSHOT_TYPE_ERROR");
  }
  if (typeof obj.suppressionActive !== "boolean") {
    return fail("HEARTBEAT_SNAPSHOT_TYPE_ERROR");
  }
  if (typeof obj.thresholdsHash !== "string" || obj.thresholdsHash === "") {
    return fail("HEARTBEAT_SNAPSHOT_TYPE_ERROR");
  }

  // Canonicalization check: re-serialize and compare
  const snapshot = obj as unknown as HeartbeatGovernanceSnapshot;
  const canonical = serializeGovernanceSnapshot(snapshot);
  if (canonical !== raw) {
    return fail("HEARTBEAT_SNAPSHOT_NON_CANONICAL");
  }

  return { snapshot };
}

/**
 * Derive the expected action from a governance snapshot.
 * Follows the same strict priority order as decideHeartbeatAction.
 */
function deriveExpectedAction(snapshot: HeartbeatGovernanceSnapshot): "RUN" | "PAUSE" | "STOP" {
  if (snapshot.lifecycleState === null) return "PAUSE";
  if (snapshot.operatorHold === "HALTED") return "STOP";
  if (snapshot.lifecycleState === "INVALIDATED") return "STOP";
  if (snapshot.lifecycleState === "EDGE_AT_RISK") return "PAUSE";
  if (snapshot.suppressionActive) return "PAUSE";
  return "RUN";
}

// ── Event-specific verifiers ─────────────────────────────

function verifyDecisionMade(payload: Record<string, unknown>): HeartbeatProofVerification {
  const snapshotResult = validateSnapshot(payload);
  if ("ok" in snapshotResult) return snapshotResult;
  const { snapshot } = snapshotResult;

  const { action, reasonCode } = payload;

  if (typeof action !== "string" || !VALID_ACTIONS.has(action)) {
    return fail("HEARTBEAT_ACTION_INCONSISTENT");
  }
  if (typeof reasonCode !== "string" || !VALID_REASON_CODES.has(reasonCode)) {
    return fail("HEARTBEAT_ACTION_INCONSISTENT");
  }

  // Guard intervention: PAUSE + CONTROL_INCONSISTENCY_DETECTED is always valid
  // (the guard detected and corrected a mismatch — we trust the guard's output)
  if (reasonCode === "CONTROL_INCONSISTENCY_DETECTED") {
    if (action !== "PAUSE") {
      return fail("HEARTBEAT_GUARD_INVARIANT_VIOLATED");
    }
    return PASS;
  }

  // Normal decision: action must match derived expectation from snapshot
  const expected = deriveExpectedAction(snapshot);
  if (action !== expected) {
    return fail("HEARTBEAT_ACTION_INCONSISTENT");
  }

  return PASS;
}

function verifyControlInconsistency(payload: Record<string, unknown>): HeartbeatProofVerification {
  const snapshotResult = validateSnapshot(payload);
  if ("ok" in snapshotResult) return snapshotResult;

  // Guard invariant: guardedAction must be PAUSE, never escalates to STOP
  if (payload.guardedAction !== "PAUSE") {
    return fail("HEARTBEAT_GUARD_INVARIANT_VIOLATED");
  }
  if (payload.guardedReasonCode !== "CONTROL_INCONSISTENCY_DETECTED") {
    return fail("HEARTBEAT_GUARD_INVARIANT_VIOLATED");
  }

  // Original fields must exist
  if (!payload.originalAction || !payload.originalReasonCode) {
    return fail("HEARTBEAT_GUARD_FIELDS_MISSING");
  }

  // Original fields must be valid enum values (no raw error strings)
  if (typeof payload.originalAction !== "string" || !VALID_ACTIONS.has(payload.originalAction)) {
    return fail("HEARTBEAT_GUARD_FIELD_NOT_ENUM");
  }
  if (
    typeof payload.originalReasonCode !== "string" ||
    !VALID_REASON_CODES.has(payload.originalReasonCode)
  ) {
    return fail("HEARTBEAT_GUARD_FIELD_NOT_ENUM");
  }

  return PASS;
}

// ── Public API ───────────────────────────────────────────

/**
 * Verify a single heartbeat proof event payload.
 *
 * Pure function — no I/O, deterministic output.
 * Returns { ok: true } for valid payloads, { ok: false, failureCode } otherwise.
 * failureCode is always a stable enum string — never a raw error message.
 */
export function verifyHeartbeatProofEvent(
  eventType: string,
  payload: Record<string, unknown>
): HeartbeatProofVerification {
  if (eventType === "HEARTBEAT_DECISION_MADE") {
    return verifyDecisionMade(payload);
  }
  if (eventType === "HEARTBEAT_CONTROL_INCONSISTENCY") {
    return verifyControlInconsistency(payload);
  }
  return PASS;
}
