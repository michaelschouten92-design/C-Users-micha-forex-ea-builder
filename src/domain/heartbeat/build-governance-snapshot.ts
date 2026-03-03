/**
 * Deterministic governance snapshot for heartbeat proof events.
 *
 * Captures the exact state used to derive a heartbeat decision so that
 * every proof event can be cryptographically audited against it.
 *
 * Design rules:
 * - Pure function: no I/O, no side effects, deterministic.
 * - Exactly 5 keys: configVersion, lifecycleState, operatorHold,
 *   suppressionActive, thresholdsHash.
 * - No secrets, no accountId, no instanceTag.
 * - No dynamic timestamps inside snapshot.
 * - Stable key order via explicit alphabetical sorting.
 *
 * The snapshot is serialized to a canonical JSON string before inclusion
 * in proof event payloads. This avoids nested-object key-loss in the
 * proof chain's stableJSON serializer (which only sorts top-level keys).
 */

import type { HeartbeatInput } from "./decide-heartbeat-action";
import { buildConfigSnapshot } from "@/domain/verification/config-snapshot";

export interface HeartbeatGovernanceSnapshot {
  configVersion: string;
  lifecycleState: string | null;
  operatorHold: string | null;
  suppressionActive: boolean;
  thresholdsHash: string;
}

/** Exactly the 5 allowed keys, alphabetically sorted. */
const SNAPSHOT_KEYS: ReadonlyArray<keyof HeartbeatGovernanceSnapshot> = [
  "configVersion",
  "lifecycleState",
  "operatorHold",
  "suppressionActive",
  "thresholdsHash",
] as const;

/**
 * Build a governance snapshot from the same state used for the heartbeat
 * decision. Does NOT perform additional DB reads.
 *
 * When input is null (no instance found), lifecycleState and operatorHold
 * are null, suppressionActive is false.
 */
export function buildHeartbeatGovernanceSnapshot(
  input: HeartbeatInput | null
): HeartbeatGovernanceSnapshot {
  const config = buildConfigSnapshot();

  return {
    configVersion: config.configVersion,
    lifecycleState: input?.lifecycleState ?? null,
    operatorHold: input?.operatorHold ?? null,
    suppressionActive:
      input != null &&
      input.monitoringSuppressedUntil != null &&
      input.now < input.monitoringSuppressedUntil,
    thresholdsHash: config.thresholdsHash,
  };
}

/**
 * Serialize a governance snapshot to canonical JSON with sorted keys.
 * Deterministic: same input always produces the same string.
 *
 * Stored as a string field in proof event payloads so that the proof
 * chain's stableJSON serializer (top-level-only key sorting) includes
 * the full snapshot data in hash computation.
 */
export function serializeGovernanceSnapshot(snapshot: HeartbeatGovernanceSnapshot): string {
  const ordered: Record<string, unknown> = {};
  for (const key of SNAPSHOT_KEYS) {
    ordered[key] = snapshot[key];
  }
  return JSON.stringify(ordered);
}
