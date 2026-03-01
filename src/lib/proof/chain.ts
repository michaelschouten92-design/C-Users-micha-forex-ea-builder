/**
 * Tamper-evident hash chaining for proof events.
 *
 * Chain scope: per verification-run recordId (stored in ProofEventLog.sessionId).
 * Each verification run produces a short chain (1-2 events) with monotonic
 * sequence numbers and SHA-256 hashes that include the previous event's hash,
 * making any tampering detectable.
 *
 * Mirrors the track-record canonical.ts + chain-verifier.ts pattern.
 */

import { createHash } from "crypto";

/** Sentinel hash for the first event in a chain (sequence = 1). */
export const PROOF_GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Input fields for computing a proof event hash.
 *
 * Note: timestamp is intentionally excluded from the preimage.
 * Only fields with guaranteed round-trip stability participate in hashing.
 */
export interface ProofEventHashInput {
  sequence: number;
  strategyId: string;
  type: string;
  recordId: string;
  prevEventHash: string;
  payload: Record<string, unknown>;
}

/** Result of verifying a proof event chain. */
export interface ProofChainVerificationResult {
  valid: boolean;
  chainLength: number;
  breakAtSequence?: number;
  error?: string;
}

/**
 * Deterministic JSON serialization — keys sorted alphabetically, compact.
 * Null/undefined values are omitted.
 */
export function stableJSON(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Compute the SHA-256 hash for a proof event.
 *
 * Preimage format (pipe-delimited):
 *   sequence|strategyId|type|recordId|prevEventHash|stableJSON(payload)
 *
 * Timestamp is excluded — it cannot be guaranteed stable across
 * DB round-trips and serialization formats.
 */
export function computeProofEventHash(input: ProofEventHashInput): string {
  const preimage = [
    input.sequence,
    input.strategyId,
    input.type,
    input.recordId,
    input.prevEventHash,
    stableJSON(input.payload),
  ].join("|");

  return createHash("sha256").update(preimage, "utf8").digest("hex");
}

/** Stored proof event shape used for chain verification. */
export interface StoredProofEvent {
  sequence: number;
  strategyId: string;
  type: string;
  sessionId: string; // recordId stored in sessionId column
  eventHash: string;
  prevEventHash: string;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Verify an entire proof event chain for a given recordId.
 *
 * Chain scope is per verification-run recordId (stored in sessionId).
 * Events must be sorted by sequence ascending. Walks the chain checking:
 * 1. Sequence continuity (no gaps, no duplicates)
 * 2. prevEventHash linkage (each event points to the previous hash)
 * 3. Recomputed hash matches stored eventHash
 */
export function verifyProofChain(
  events: StoredProofEvent[],
  recordId: string
): ProofChainVerificationResult {
  if (events.length === 0) {
    return { valid: true, chainLength: 0 };
  }

  let expectedSequence = 1;
  let expectedPrevHash = PROOF_GENESIS_HASH;

  for (const event of events) {
    if (event.sequence !== expectedSequence) {
      return {
        valid: false,
        chainLength: expectedSequence - 1,
        breakAtSequence: expectedSequence,
        error: `Missing or unexpected sequence: expected ${expectedSequence}, found ${event.sequence}`,
      };
    }

    if (event.prevEventHash !== expectedPrevHash) {
      return {
        valid: false,
        chainLength: expectedSequence - 1,
        breakAtSequence: event.sequence,
        error: `prevEventHash mismatch at sequence ${event.sequence}`,
      };
    }

    const computedHash = computeProofEventHash({
      sequence: event.sequence,
      strategyId: event.strategyId,
      type: event.type,
      recordId,
      prevEventHash: event.prevEventHash,
      payload: (event.meta as Record<string, unknown>) ?? {},
    });

    if (computedHash !== event.eventHash) {
      return {
        valid: false,
        chainLength: expectedSequence - 1,
        breakAtSequence: event.sequence,
        error: `eventHash mismatch at sequence ${event.sequence}: computed ${computedHash}, stored ${event.eventHash}`,
      };
    }

    expectedPrevHash = event.eventHash;
    expectedSequence++;
  }

  return {
    valid: true,
    chainLength: events.length,
  };
}
