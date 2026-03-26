import { describe, it, expect, vi } from "vitest";
import { verifyChain, type StoredEvent } from "./chain-verifier";
import { buildCanonicalEvent, computeEventHash } from "./canonical";
import { GENESIS_HASH } from "./types";

const INSTANCE_ID = "inst_test_verify";

/** Build a valid chain of N events with correct hashes and prevHash linkage. */
function buildValidChain(n: number): StoredEvent[] {
  const events: StoredEvent[] = [];
  let prevHash = GENESIS_HASH;

  for (let i = 1; i <= n; i++) {
    const timestamp = new Date(1700000000000 + i * 1000);
    const payload = { ticket: `${i}`, profit: 10 * i };
    const canonical = buildCanonicalEvent(
      INSTANCE_ID, "TRADE_CLOSE", i, prevHash,
      Math.floor(timestamp.getTime() / 1000), payload
    );
    const eventHash = computeEventHash(canonical);

    events.push({
      instanceId: INSTANCE_ID,
      seqNo: i,
      eventType: "TRADE_CLOSE",
      eventHash,
      prevHash,
      payload,
      timestamp,
    });
    prevHash = eventHash;
  }
  return events;
}

describe("verifyChain", () => {
  it("valid chain of 3 events returns valid=true", () => {
    const events = buildValidChain(3);
    const result = verifyChain(events, INSTANCE_ID);

    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(3);
    expect(result.firstEventHash).toBe(events[0].eventHash);
    expect(result.lastEventHash).toBe(events[2].eventHash);
  });

  it("empty chain returns valid=true with length 0", () => {
    const result = verifyChain([], INSTANCE_ID);
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(0);
  });

  it("single event chain returns valid=true", () => {
    const events = buildValidChain(1);
    const result = verifyChain(events, INSTANCE_ID);
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(1);
  });

  it("tampered prevHash detected as invalid (PV2)", () => {
    const events = buildValidChain(3);
    // Tamper: break prevHash linkage on event 2
    events[1] = { ...events[1], prevHash: "f".repeat(64) };

    const result = verifyChain(events, INSTANCE_ID);
    expect(result.valid).toBe(false);
    expect(result.breakAtSeqNo).toBe(2);
    expect(result.error).toContain("prevHash mismatch");
  });

  it("tampered eventHash detected as invalid (PV2)", () => {
    const events = buildValidChain(3);
    // Tamper: modify eventHash without changing content
    events[1] = { ...events[1], eventHash: "a".repeat(64) };

    const result = verifyChain(events, INSTANCE_ID);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Hash mismatch");
  });

  it("gap in seqNo detected as invalid (PV2)", () => {
    const events = buildValidChain(3);
    // Create gap: change seqNo 2 to 3 (skip 2)
    events[1] = { ...events[1], seqNo: 3 };

    const result = verifyChain(events, INSTANCE_ID);
    expect(result.valid).toBe(false);
    expect(result.breakAtSeqNo).toBe(2);
    expect(result.error).toContain("seqNo");
  });

  it("tampered payload detected via eventHash mismatch (PV2)", () => {
    const events = buildValidChain(3);
    // Tamper: change payload without updating hash
    events[1] = { ...events[1], payload: { ticket: "999", profit: 999999 } };

    const result = verifyChain(events, INSTANCE_ID);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Hash mismatch");
  });

  // PV1: embed verified must use verifyChain, not count-only
  it("count matches but corrupted chain returns valid=false (PV1 regression)", () => {
    const events = buildValidChain(3);
    // Count = 3, lastSeqNo would be 3 — count check would pass
    // But tamper prevHash on event 3 — only verifyChain catches this
    events[2] = { ...events[2], prevHash: "0".repeat(64) };

    const result = verifyChain(events, INSTANCE_ID);
    expect(result.valid).toBe(false);
    // A count-only check would incorrectly return true here
    expect(result.chainLength).toBeLessThan(3);
  });

  it("valid chain with matching count returns valid=true (PV1 positive)", () => {
    const events = buildValidChain(5);
    const result = verifyChain(events, INSTANCE_ID);

    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(5);
    // This is what embed's verified flag should be based on
  });
});
