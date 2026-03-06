/**
 * Tamper-evident hash chaining for proof events.
 *
 * Chain scope: per strategyId. Each strategy maintains a single chain of
 * proof events with monotonic sequence numbers and SHA-256 hashes that
 * include the previous event's hash, making any tampering detectable.
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
 * Deterministic JSON serialization — top-level keys sorted alphabetically, compact.
 *
 * IMPORTANT: Uses an array replacer which acts as a key allowlist at ALL
 * nesting levels. Nested object keys not also present at the top level are
 * silently excluded. Callers with nested objects must pre-serialize them
 * to strings (see build-governance-snapshot.ts for the established pattern).
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
 * Verify a proof event chain (or window thereof) for a given strategy.
 *
 * Chain scope is per strategyId. Events must be sorted by sequence ascending.
 * Each event's recordId (stored in sessionId) is used for hash computation.
 * Walks the chain checking:
 * 1. Sequence continuity (no gaps, no duplicates)
 * 2. prevEventHash linkage (each event points to the previous hash)
 * 3. Recomputed hash matches stored eventHash
 *
 * When `startSequence` is provided (windowed verification), the walk starts
 * at that sequence instead of 1. The first event's prevEventHash is trusted
 * as the anchor (it cannot be verified without the preceding event).
 */
export function verifyProofChain(
  events: StoredProofEvent[],
  startSequence?: number
): ProofChainVerificationResult {
  if (events.length === 0) {
    return { valid: true, chainLength: 0 };
  }

  const start = startSequence ?? 1;
  let expectedSequence = start;
  // For windowed verification (start > 1), trust the first event's prevEventHash
  // as anchor. For full verification (start === 1), use GENESIS.
  let expectedPrevHash = start > 1 ? events[0].prevEventHash : PROOF_GENESIS_HASH;

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
      recordId: event.sessionId,
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
