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
  const strategyId = "strat_test";
  const recordId = "rec_run_001";
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
    const result = verifyProofChain([]);
    expect(result).toEqual({ valid: true, chainLength: 0 });
  });

  it("validates a single-event chain", () => {
    const events = buildChain(1);
    const result = verifyProofChain(events);
    expect(result).toEqual({ valid: true, chainLength: 1 });
  });

  it("validates a multi-event chain", () => {
    const events = buildChain(5);
    const result = verifyProofChain(events);
    expect(result).toEqual({ valid: true, chainLength: 5 });
  });

  it("validates chain with mixed recordIds (different operations)", () => {
    const events: StoredProofEvent[] = [];
    let prevHash = PROOF_GENESIS_HASH;

    // Event 1: from recordId "run_A"
    const hash1 = computeProofEventHash({
      sequence: 1,
      strategyId,
      type: "MONITORING_RUN_COMPLETED",
      recordId: "run_A",
      prevEventHash: prevHash,
      payload: { recordId: "run_A", verdict: "HEALTHY" },
    });
    events.push({
      sequence: 1,
      strategyId,
      type: "MONITORING_RUN_COMPLETED",
      sessionId: "run_A",
      eventHash: hash1,
      prevEventHash: prevHash,
      meta: { recordId: "run_A", verdict: "HEALTHY" },
      createdAt: new Date(),
    });
    prevHash = hash1;

    // Event 2: from recordId "run_B" (different operation, same chain)
    const hash2 = computeProofEventHash({
      sequence: 2,
      strategyId,
      type: "VERIFICATION_RUN_COMPLETED",
      recordId: "run_B",
      prevEventHash: prevHash,
      payload: { recordId: "run_B", verdict: "READY" },
    });
    events.push({
      sequence: 2,
      strategyId,
      type: "VERIFICATION_RUN_COMPLETED",
      sessionId: "run_B",
      eventHash: hash2,
      prevEventHash: prevHash,
      meta: { recordId: "run_B", verdict: "READY" },
      createdAt: new Date(),
    });

    const result = verifyProofChain(events);
    expect(result).toEqual({ valid: true, chainLength: 2 });
  });

  it("detects tampered eventHash", () => {
    const events = buildChain(3);
    events[1].eventHash = "deadbeef".repeat(8);
    const result = verifyProofChain(events);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(2);
    expect(result.error).toContain("eventHash mismatch");
  });

  it("detects tampered prevEventHash", () => {
    const events = buildChain(3);
    events[2].prevEventHash = "cafebabe".repeat(8);
    const result = verifyProofChain(events);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(3);
    expect(result.error).toContain("prevEventHash mismatch");
  });

  it("detects missing sequence (gap)", () => {
    const events = buildChain(3);
    // Remove event at sequence 2
    events.splice(1, 1);
    const result = verifyProofChain(events);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(2);
    expect(result.error).toContain("Missing or unexpected sequence");
  });

  it("validates windowed chain with startSequence", () => {
    const events = buildChain(10);
    // Take a window of events 6–10
    const window = events.slice(5);
    const result = verifyProofChain(window, 6);
    expect(result).toEqual({ valid: true, chainLength: 5 });
  });

  it("detects break in windowed chain", () => {
    const events = buildChain(10);
    const window = events.slice(5);
    // Tamper with event at sequence 8 (index 2 in window)
    window[2].prevEventHash = "deadbeef".repeat(8);
    const result = verifyProofChain(window, 6);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(8);
  });

  it("detects tampered payload", () => {
    const events = buildChain(2);
    // Tamper with meta (payload) — hash will no longer match
    events[0].meta = { verdict: "TAMPERED" };
    const result = verifyProofChain(events);
    expect(result.valid).toBe(false);
    expect(result.breakAtSequence).toBe(1);
    expect(result.error).toContain("eventHash mismatch");
  });
});
