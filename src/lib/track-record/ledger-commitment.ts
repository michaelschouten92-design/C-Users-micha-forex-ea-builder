/**
 * Ledger Commitment — periodic cryptographic commitments for L3 notarization.
 *
 * A commitment is a SHA-256 hash that binds together:
 *   - instanceId
 *   - seqNo (the event sequence number at commitment time)
 *   - lastEventHash (the hash chain head)
 *   - stateHmac (HMAC of the financial state from the checkpoint)
 *
 * Commitments are created every COMMITMENT_INTERVAL events (default: 500).
 * They serve as anchor points that can be submitted to external timestamping
 * services (OpenTimestamps, OriginStamp, etc.) to prove the ledger state
 * existed at a specific real-world time.
 *
 * Even without external notarization, commitments provide additional integrity:
 * - They bind the hash chain to the financial state (via HMAC)
 * - They create periodic "save points" for faster partial verification
 * - They are stored server-side and can be cross-referenced with checkpoints
 */

import { sha256 } from "./canonical";

/** Create a commitment every N events. */
export const COMMITMENT_INTERVAL = 500;

/**
 * Check if a commitment should be created at the given seqNo.
 * Commitments are created every COMMITMENT_INTERVAL events.
 */
export function shouldCreateCommitment(seqNo: number): boolean {
  return seqNo > 0 && seqNo % COMMITMENT_INTERVAL === 0;
}

/**
 * Compute the commitment hash.
 * Deterministic: same inputs always produce the same hash.
 */
export function computeCommitmentHash(
  instanceId: string,
  seqNo: number,
  lastEventHash: string,
  stateHmac: string
): string {
  const input = `${instanceId}|${seqNo}|${lastEventHash}|${stateHmac}`;
  return sha256(input);
}

/**
 * Build the data object for storing a commitment in the database.
 */
export function buildCommitmentData(
  instanceId: string,
  seqNo: number,
  lastEventHash: string,
  stateHmac: string
): {
  instanceId: string;
  seqNo: number;
  commitmentHash: string;
  lastEventHash: string;
  stateHmac: string;
} {
  const commitmentHash = computeCommitmentHash(instanceId, seqNo, lastEventHash, stateHmac);

  return {
    instanceId,
    seqNo,
    commitmentHash,
    lastEventHash,
    stateHmac,
  };
}

/**
 * Verify a commitment: recompute the hash and compare.
 * Used during proof bundle verification (L3).
 */
export function verifyCommitment(
  instanceId: string,
  seqNo: number,
  lastEventHash: string,
  stateHmac: string,
  claimedCommitmentHash: string
): boolean {
  const computed = computeCommitmentHash(instanceId, seqNo, lastEventHash, stateHmac);
  return computed === claimedCommitmentHash;
}
