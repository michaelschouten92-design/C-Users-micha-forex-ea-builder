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

  it("drops nested object keys not present at top level (array replacer behavior)", () => {
    // This documents the known limitation: nested keys not in the top-level
    // key set are silently excluded. Callers must pre-serialize nested objects.
    const result = stableJSON({
      topKey: "value",
      nested: { innerOnly: 42 },
    });
    const parsed = JSON.parse(result);
    // "nested" key exists but its content is empty — "innerOnly" was filtered out
    expect(parsed.nested).toEqual({});
  });

  it("preserves nested key that also exists at top level", () => {
    const result = stableJSON({
      type: "outer",
      nested: { type: "inner", unique: 99 },
    });
    const parsed = JSON.parse(result);
    // "type" survives because it's a top-level key; "unique" is dropped
    expect(parsed.nested).toEqual({ type: "inner" });
  });

  it("pre-serialized nested objects are fully included in hash", () => {
    // This is the established workaround: JSON.stringify nested before passing
    const withNested = stableJSON({
      data: { a: 1, b: 2 },
      id: "x",
    });
    const preSerialized = stableJSON({
      data: JSON.stringify({ a: 1, b: 2 }),
      id: "x",
    });
    // The nested version loses content; the pre-serialized version preserves it
    const parsedNested = JSON.parse(withNested);
    expect(parsedNested.data).toEqual({}); // content lost
    // Pre-serialized string includes the nested content (escaped)
    expect(preSerialized).toContain('\\"a\\"'); // "a" preserved inside escaped JSON string
    // And critically, the two stableJSON outputs differ
    expect(withNested).not.toBe(preSerialized);
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

  it("pre-serialized nested field changes hash vs raw nested object", () => {
    // Regression: stableJSON drops nested object keys. Pre-serializing
    // to a string ensures nested content is included in the hash.
    const withRawNested = computeProofEventHash({
      ...baseInput,
      payload: {
        recordId: "rec_001",
        ruleResults: [{ ruleId: "drawdown-breach", status: "PASS" }],
        snapshotRange: { earliest: "2025-01-01", latest: "2025-12-01" },
      },
    });
    const withPreSerialized = computeProofEventHash({
      ...baseInput,
      payload: {
        recordId: "rec_001",
        ruleResults: JSON.stringify([{ ruleId: "drawdown-breach", status: "PASS" }]),
        snapshotRange: JSON.stringify({ earliest: "2025-01-01", latest: "2025-12-01" }),
      },
    });
    // Hashes MUST differ: the pre-serialized version covers nested content
    expect(withRawNested).not.toBe(withPreSerialized);
  });

  it("different nested content produces different hash when pre-serialized", () => {
    // Without pre-serialization, these would hash identically because
    // nested keys are dropped. With pre-serialization, they differ.
    const hashA = computeProofEventHash({
      ...baseInput,
      payload: {
        recordId: "rec_001",
        ruleResults: JSON.stringify([{ ruleId: "drawdown-breach", status: "PASS" }]),
      },
    });
    const hashB = computeProofEventHash({
      ...baseInput,
      payload: {
        recordId: "rec_001",
        ruleResults: JSON.stringify([{ ruleId: "drawdown-breach", status: "INVALIDATED" }]),
      },
    });
    expect(hashA).not.toBe(hashB);
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
