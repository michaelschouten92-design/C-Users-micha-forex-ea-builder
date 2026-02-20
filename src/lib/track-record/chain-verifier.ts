/**
 * Hash chain verification for the track record system.
 *
 * Verifies that:
 * 1. seqNo is monotonically increasing (no gaps, no duplicates)
 * 2. prevHash matches the hash of the previous event
 * 3. eventHash matches the computed hash of the canonical event
 */

import { buildCanonicalEvent, computeEventHash } from "./canonical";
import { GENESIS_HASH } from "./types";

export interface ChainVerificationResult {
  valid: boolean;
  chainLength: number;
  firstEventHash: string | null;
  lastEventHash: string | null;
  /** If invalid, the seqNo where the break was detected */
  breakAtSeqNo?: number;
  /** Human-readable error description */
  error?: string;
}

export interface StoredEvent {
  instanceId: string;
  seqNo: number;
  eventType: string;
  eventHash: string;
  prevHash: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Verify a single incoming event against the current chain state.
 *
 * Returns { valid: true } or { valid: false, error: "..." }.
 */
export function verifySingleEvent(
  event: {
    eventType: string;
    seqNo: number;
    prevHash: string;
    eventHash: string;
    timestamp: number;
    payload: Record<string, unknown>;
  },
  instanceId: string,
  lastSeqNo: number,
  lastEventHash: string
): { valid: true } | { valid: false; error: string } {
  // Check sequence number
  if (event.seqNo !== lastSeqNo + 1) {
    // Allow idempotent retry: same seqNo is checked by caller via eventHash match
    return {
      valid: false,
      error: `Expected seqNo ${lastSeqNo + 1}, got ${event.seqNo}`,
    };
  }

  // Check prevHash links to the previous event
  if (event.prevHash !== lastEventHash) {
    return {
      valid: false,
      error: `prevHash mismatch: expected ${lastEventHash}, got ${event.prevHash}`,
    };
  }

  // Compute canonical hash and verify
  const canonical = buildCanonicalEvent(
    instanceId,
    event.eventType,
    event.seqNo,
    event.prevHash,
    event.timestamp,
    event.payload
  );
  const computedHash = computeEventHash(canonical);

  if (computedHash !== event.eventHash) {
    return {
      valid: false,
      error: `eventHash mismatch: computed ${computedHash}, received ${event.eventHash}`,
    };
  }

  return { valid: true };
}

/**
 * Verify an entire chain of stored events. Used for auditing / public verification.
 *
 * Events must be sorted by seqNo ascending.
 */
export function verifyChain(events: StoredEvent[], instanceId: string): ChainVerificationResult {
  if (events.length === 0) {
    return { valid: true, chainLength: 0, firstEventHash: null, lastEventHash: null };
  }

  let expectedSeqNo = 1;
  let expectedPrevHash = GENESIS_HASH;

  for (const event of events) {
    // Check sequence
    if (event.seqNo !== expectedSeqNo) {
      return {
        valid: false,
        chainLength: expectedSeqNo - 1,
        firstEventHash: events[0].eventHash,
        lastEventHash: events[expectedSeqNo - 2]?.eventHash ?? null,
        breakAtSeqNo: expectedSeqNo,
        error: `Missing or unexpected seqNo: expected ${expectedSeqNo}, found ${event.seqNo}`,
      };
    }

    // Check prevHash
    if (event.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        chainLength: expectedSeqNo - 1,
        firstEventHash: events[0].eventHash,
        lastEventHash: events[expectedSeqNo - 2]?.eventHash ?? null,
        breakAtSeqNo: event.seqNo,
        error: `prevHash mismatch at seqNo ${event.seqNo}`,
      };
    }

    // Recompute event hash
    const timestamp = Math.floor(event.timestamp.getTime() / 1000);
    const canonical = buildCanonicalEvent(
      instanceId,
      event.eventType,
      event.seqNo,
      event.prevHash,
      timestamp,
      event.payload as Record<string, unknown>
    );
    const computedHash = computeEventHash(canonical);

    if (computedHash !== event.eventHash) {
      return {
        valid: false,
        chainLength: expectedSeqNo - 1,
        firstEventHash: events[0].eventHash,
        lastEventHash: events[expectedSeqNo - 2]?.eventHash ?? null,
        breakAtSeqNo: event.seqNo,
        error: `eventHash mismatch at seqNo ${event.seqNo}: computed ${computedHash}, stored ${event.eventHash}`,
      };
    }

    expectedPrevHash = event.eventHash;
    expectedSeqNo++;
  }

  return {
    valid: true,
    chainLength: events.length,
    firstEventHash: events[0].eventHash,
    lastEventHash: events[events.length - 1].eventHash,
  };
}
