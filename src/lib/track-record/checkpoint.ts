/**
 * HMAC checkpoint creation and verification for tamper detection.
 *
 * Checkpoints sign the running state with a per-instance derived key:
 *   derivedKey = HMAC-SHA256(TRACK_RECORD_SECRET, instanceId)
 *   hmac = HMAC-SHA256(derivedKey, canonicalStateJson)
 *
 * Created every TRADE_CLOSE event and every 100 events.
 *
 * Key rotation:
 *   New checkpoints are always signed with TRACK_RECORD_SECRET.
 *   Verification tries the current secret first, then falls back to
 *   TRACK_RECORD_SECRET_PREVIOUS for checkpoints created before rotation.
 */

import { createHmac } from "crypto";
import type { TrackRecordRunningState } from "./types";

/**
 * Round-half-away-from-zero, matching MQL5 DoubleToString() behavior.
 * JavaScript's toFixed() uses banker's rounding which can differ.
 */
function toFixedMQL(value: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
  return rounded.toFixed(decimals);
}

const CHECKPOINT_INTERVAL = 100;

/**
 * Derive a per-instance HMAC key from an explicit secret.
 */
function deriveKeyWithSecret(secret: string, instanceId: string): string {
  return createHmac("sha256", secret).update(instanceId).digest("hex");
}

/**
 * Derive a per-instance HMAC key from the current global secret.
 */
function deriveKey(instanceId: string): string {
  const secret = process.env.TRACK_RECORD_SECRET;
  if (!secret) {
    throw new Error("TRACK_RECORD_SECRET environment variable is required");
  }
  return deriveKeyWithSecret(secret, instanceId);
}

/**
 * Canonicalize the running state for HMAC signing.
 * Keys sorted alphabetically, numbers to 2 decimal places.
 */
function canonicalizeState(state: TrackRecordRunningState): string {
  const obj = {
    balance: toFixedMQL(state.balance, 2),
    equity: toFixedMQL(state.equity, 2),
    highWaterMark: toFixedMQL(state.highWaterMark, 2),
    lastEventHash: state.lastEventHash,
    lastSeqNo: state.lastSeqNo.toString(),
    lossCount: state.lossCount.toString(),
    maxDrawdown: toFixedMQL(state.maxDrawdown, 2),
    maxDrawdownPct: toFixedMQL(state.maxDrawdownPct, 2),
    totalCommission: toFixedMQL(state.totalCommission, 2),
    totalProfit: toFixedMQL(state.totalProfit, 2),
    totalSwap: toFixedMQL(state.totalSwap, 2),
    totalTrades: state.totalTrades.toString(),
    winCount: state.winCount.toString(),
  };

  const keys = Object.keys(obj).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${JSON.stringify(obj[k as keyof typeof obj])}`
  );
  return `{${pairs.join(",")}}`;
}

/**
 * Compute HMAC for a checkpoint.
 */
export function computeCheckpointHmac(instanceId: string, state: TrackRecordRunningState): string {
  const key = deriveKey(instanceId);
  const stateJson = canonicalizeState(state);
  return createHmac("sha256", key).update(stateJson).digest("hex");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Compute HMAC using an explicit secret (for verification with previous keys).
 */
function computeHmacWithSecret(
  secret: string,
  instanceId: string,
  state: TrackRecordRunningState
): string {
  const key = deriveKeyWithSecret(secret, instanceId);
  const stateJson = canonicalizeState(state);
  return createHmac("sha256", key).update(stateJson).digest("hex");
}

/**
 * Verify a checkpoint's HMAC against the running state.
 * Tries the current secret first, then falls back to TRACK_RECORD_SECRET_PREVIOUS.
 */
export function verifyCheckpointHmac(
  instanceId: string,
  state: TrackRecordRunningState,
  storedHmac: string
): boolean {
  // Try current secret
  const computed = computeCheckpointHmac(instanceId, state);
  if (constantTimeEqual(computed, storedHmac)) return true;

  // Try previous secret (for checkpoints created before rotation)
  const prevSecret = process.env.TRACK_RECORD_SECRET_PREVIOUS;
  if (prevSecret) {
    const prevComputed = computeHmacWithSecret(prevSecret, instanceId, state);
    if (constantTimeEqual(prevComputed, storedHmac)) return true;
  }

  return false;
}

/**
 * Determine whether a checkpoint should be created for this event.
 * - Every TRADE_CLOSE event
 * - Every 100 events
 */
export function shouldCreateCheckpoint(eventType: string, seqNo: number): boolean {
  if (eventType === "TRADE_CLOSE") return true;
  if (seqNo % CHECKPOINT_INTERVAL === 0) return true;
  return false;
}

/**
 * Build checkpoint data for database insertion.
 */
export function buildCheckpointData(instanceId: string, state: TrackRecordRunningState) {
  return {
    instanceId,
    seqNo: state.lastSeqNo,
    balance: state.balance,
    equity: state.equity,
    highWaterMark: state.highWaterMark,
    maxDrawdown: state.maxDrawdown,
    maxDrawdownPct: state.maxDrawdownPct,
    totalTrades: state.totalTrades,
    totalProfit: state.totalProfit,
    totalSwap: state.totalSwap,
    totalCommission: state.totalCommission,
    winCount: state.winCount,
    lossCount: state.lossCount,
    hmac: computeCheckpointHmac(instanceId, state),
  };
}
