import { describe, it, expect } from "vitest";
import {
  PROOF_GENESIS_HASH,
  stableJSON,
  computeProofEventHash,
  verifyProofChain,
  type StoredProofEvent,
  type ProofEventHashInput,
} from "./chain";

describe("stableJSON", () => {
  it("sorts keys alphabetically", () => {
    const result = stableJSON({ z: 1, a: 2, m: 3 });
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });

  it("handles nested objects (without deep sorting)", () => {
    const result = stableJSON({ b: { y: 1, x: 2 }, a: "hello" });
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
    // top-level keys sorted
    expect(result.indexOf('"a"')).toBeLessThan(result.indexOf('"b"'));
  });

  it("handles empty object", () => {
    expect(stableJSON({})).toBe("{}");
  });
});

describe("computeProofEventHash", () => {
  const baseInput: ProofEventHashInput = {
    sequence: 1,
    strategyId: "strat_abc",
    type: "VERIFICATION_RUN_COMPLETED",
    recordId: "rec_001",
    prevEventHash: PROOF_GENESIS_HASH,
    payload: { verdict: "READY", reasonCodes: ["ALL_CHECKS_PASSED"] },
  };

  it("returns a 64-char hex string (SHA-256)", () => {
    const hash = computeProofEventHash(baseInput);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    const h1 = computeProofEventHash(baseInput);
    const h2 = computeProofEventHash(baseInput);
    expect(h1).toBe(h2);
  });

  it("changes when sequence changes", () => {
    const h1 = computeProofEventHash(baseInput);
    const h2 = computeProofEventHash({ ...baseInput, sequence: 2 });
    expect(h1).not.toBe(h2);
  });

  it("changes when strategyId changes", () => {
    const h1 = computeProofEventHash(baseInput);
    const h2 = computeProofEventHash({ ...baseInput, strategyId: "strat_xyz" });
    expect(h1).not.toBe(h2);
  });

  it("changes when prevEventHash changes", () => {
    const h1 = computeProofEventHash(baseInput);
    const h2 = computeProofEventHash({
      ...baseInput,
      prevEventHash: "aaaa" + PROOF_GENESIS_HASH.slice(4),
    });
    expect(h1).not.toBe(h2);
  });

  it("changes when payload changes", () => {
    const h1 = computeProofEventHash(baseInput);
    const h2 = computeProofEventHash({
      ...baseInput,
      payload: { verdict: "NOT_READY" },
    });
    expect(h1).not.toBe(h2);
  });
});

describe("verifyProofChain", () => {
  const recordId = "rec_run_001";
  const strategyId = "strat_test";
  const ts = new Date("2026-01-15T10:00:00.000Z");

  function buildChain(count: number): StoredProofEvent[] {
    const events: StoredProofEvent[] = [];
    let prevHash = PROOF_GENESIS_HASH;

    for (let i = 1; i <= count; i++) {
      const createdAt = new Date(ts.getTime() + i * 60_000);
      const payload = { verdict: "READY", index: i };
      const hash = computeProofEventHash({
        sequence: i,
        strategyId,
        type: "VERIFICATION_RUN_COMPLETED",
        recordId,
        prevEventHash: prevHash,
        payload,
      });

      events.push({
        sequence: i,
        strategyId,
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: recordId,
        eventHash: hash,
        prevEventHash: prevHash,
        meta: payload,
        createdAt,
      });

      prevHash = hash;
    }
    return events;
  }

  it("returns valid for empty chain", () => {
    const result = verifyProofChain([], recordId);
    expect(result).toEqual({ valid: true, chainLength: 0 });
  });

  it("validates a single-event chain", () => {
    const events = buildChain(1);
    const result = verifyProofChain(events, recordId);
    expect(result).toEqual({ valid: true, chainLength: 1 });
  });

  it("validates a multi-event chain", () => {
    const events = buildChain(5);
    const result = verifyProofChain(events, recordId);
    expect(result).toEqual({ valid: true, chainLength: 5 });
  });

  it("detects tampered eventHash", () => {
    const events = buildChain(3);
    events[1].eventHash = "deadbeef".repeat(8);
    const result = verifyProofChain(events, recordId);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(2);
    expect(result.error).toContain("eventHash mismatch");
  });

  it("detects tampered prevEventHash", () => {
    const events = buildChain(3);
    events[2].prevEventHash = "cafebabe".repeat(8);
    const result = verifyProofChain(events, recordId);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(3);
    expect(result.error).toContain("prevEventHash mismatch");
  });

  it("detects missing sequence (gap)", () => {
    const events = buildChain(3);
    // Remove event at sequence 2
    events.splice(1, 1);
    const result = verifyProofChain(events, recordId);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(2);
    expect(result.error).toContain("Missing or unexpected sequence");
  });

  it("detects tampered payload", () => {
    const events = buildChain(2);
    // Tamper with meta (payload) — hash will no longer match
    events[0].meta = { verdict: "TAMPERED" };
    const result = verifyProofChain(events, recordId);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(1);
    expect(result.error).toContain("eventHash mismatch");
  });
});
