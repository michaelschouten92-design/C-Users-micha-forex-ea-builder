import { describe, it, expect } from "vitest";

/**
 * EA Queue Behavior Specification Tests
 *
 * These tests model the Monitoring EA's FlushOfflineQueue logic as a
 * pure-function specification. The actual EA is MQL5 and can't be tested
 * in vitest — these tests serve as the executable spec that the EA code
 * must conform to.
 *
 * The function signatures mirror the EA's queue globals and FlushOfflineQueue.
 */

const POISON_DROP_THRESHOLD = 3;

interface FlushResult {
  /** Events remaining in queue after flush */
  queue: string[];
  /** Retry counts remaining after flush */
  retryCounts: number[];
  /** How many events were consumed (sent + skipped + dropped) */
  consumed: number;
  /** Whether flush was stopped by a retryable error */
  stopped: boolean;
  /** Events that were dropped as poison */
  droppedPoison: number[];
}

/**
 * Pure-function model of FlushOfflineQueue from AlgoStudio_Monitor.mq5.
 * `statusFn(i)` simulates HttpPostEx for the i-th queue slot.
 */
function flushOfflineQueue(
  queue: string[],
  retryCounts: number[],
  statusFn: (index: number) => number
): FlushResult {
  const queueCount = queue.length;
  let consumed = 0;
  let stopped = false;
  const droppedPoison: number[] = [];
  // Work on copies
  const retryCountsCopy = [...retryCounts];

  for (let i = 0; i < queueCount && !stopped; i++) {
    const status = statusFn(i);

    if (status >= 200 && status < 300) {
      consumed++;
    } else if (status === 409) {
      consumed++;
    } else if (status === -1 || status === 429 || status >= 500) {
      stopped = true;
    } else {
      // Permanent client error (400, 422, etc.)
      retryCountsCopy[i]++;
      if (retryCountsCopy[i] >= POISON_DROP_THRESHOLD) {
        droppedPoison.push(i);
        consumed++;
      } else {
        stopped = true;
      }
    }
  }

  // Remove consumed events from front
  const remainingQueue = queue.slice(consumed);
  const remainingRetry = retryCountsCopy.slice(consumed);

  return {
    queue: remainingQueue,
    retryCounts: remainingRetry,
    consumed,
    stopped,
    droppedPoison,
  };
}

// ─── Persistence model ───────────────────────────────────────────────

function serializeQueue(queue: string[], retryCounts: number[]): string {
  let out = String(queue.length) + "\n";
  for (let i = 0; i < queue.length; i++) {
    out += String(retryCounts[i]) + "|" + queue[i] + "\n";
  }
  return out;
}

function deserializeQueue(data: string): { queue: string[]; retryCounts: number[] } {
  const lines = data.split("\n").filter((l) => l.length > 0);
  const count = parseInt(lines[0], 10);
  const queue: string[] = [];
  const retryCounts: number[] = [];
  for (let i = 1; i <= count && i < lines.length; i++) {
    const pipePos = lines[i].indexOf("|");
    if (pipePos > 0) {
      retryCounts.push(parseInt(lines[i].substring(0, pipePos), 10));
      queue.push(lines[i].substring(pipePos + 1));
    } else {
      // Backward compat: old format without retry count
      retryCounts.push(0);
      queue.push(lines[i]);
    }
  }
  return { queue, retryCounts };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("EA FlushOfflineQueue — poison event handling spec", () => {
  it("permanent 400 increments retry count and stops flush below threshold", () => {
    const result = flushOfflineQueue(
      ["event1", "event2"],
      [0, 0],
      () => 400 // All return 400
    );

    // First event: retryCount 0→1, below threshold → stop flush
    expect(result.consumed).toBe(0);
    expect(result.stopped).toBe(true);
    expect(result.queue).toEqual(["event1", "event2"]);
    expect(result.retryCounts[0]).toBe(1);
    // Second event was never attempted
    expect(result.retryCounts[1]).toBe(0);
  });

  it("permanent 422 increments retry count same as 400", () => {
    const result = flushOfflineQueue(["event1"], [1], () => 422);

    expect(result.consumed).toBe(0);
    expect(result.stopped).toBe(true);
    expect(result.retryCounts[0]).toBe(2);
  });

  it("permanent failure at threshold drops event and continues to next", () => {
    // Event at retryCount=2 gets one more 400 → reaches threshold 3 → dropped
    const result = flushOfflineQueue(["poison", "healthy"], [2, 0], (i) => (i === 0 ? 400 : 200));

    expect(result.consumed).toBe(2); // poison dropped + healthy sent
    expect(result.droppedPoison).toEqual([0]);
    expect(result.queue).toEqual([]);
    expect(result.retryCounts).toEqual([]);
  });

  it("retryable 5xx does NOT increment retry count and blocks flush", () => {
    const result = flushOfflineQueue(["event1"], [0], () => 503);

    expect(result.consumed).toBe(0);
    expect(result.stopped).toBe(true);
    expect(result.retryCounts[0]).toBe(0); // NOT incremented
  });

  it("retryable 429 does NOT increment retry count and blocks flush", () => {
    const result = flushOfflineQueue(["event1"], [1], () => 429);

    expect(result.consumed).toBe(0);
    expect(result.stopped).toBe(true);
    expect(result.retryCounts[0]).toBe(1); // Unchanged
  });

  it("network failure (-1) does NOT increment retry count and blocks flush", () => {
    const result = flushOfflineQueue(["event1"], [2], () => -1);

    expect(result.consumed).toBe(0);
    expect(result.stopped).toBe(true);
    expect(result.retryCounts[0]).toBe(2); // Unchanged, NOT dropped
  });

  it("409 still skips immediately without affecting retry count", () => {
    const result = flushOfflineQueue(["dup1", "dup2"], [0, 0], () => 409);

    expect(result.consumed).toBe(2);
    expect(result.stopped).toBe(false);
    expect(result.queue).toEqual([]);
  });

  it("mixed scenario: 2xx, poison drop, then 5xx stops", () => {
    // Queue: [ok, poison(retryCount=2), retryable]
    const result = flushOfflineQueue(["ok", "poison", "retryable"], [0, 2, 0], (i) => {
      if (i === 0) return 200;
      if (i === 1) return 400; // 3rd permanent fail → drop
      return 503;
    });

    expect(result.consumed).toBe(2); // ok sent + poison dropped
    expect(result.droppedPoison).toEqual([1]);
    expect(result.stopped).toBe(true); // stopped on 503
    expect(result.queue).toEqual(["retryable"]);
    expect(result.retryCounts).toEqual([0]);
  });
});

describe("EA queue persistence — retry count survives save/load", () => {
  it("serializes and deserializes retry counts", () => {
    const queue = ['{"seqNo":1}', '{"seqNo":2}'];
    const retryCounts = [0, 2];

    const serialized = serializeQueue(queue, retryCounts);
    const { queue: loadedQueue, retryCounts: loadedRetry } = deserializeQueue(serialized);

    expect(loadedQueue).toEqual(queue);
    expect(loadedRetry).toEqual(retryCounts);
  });

  it("backward-compatible: loads old format without retry counts as 0", () => {
    // Old format: just count + raw JSON lines (no pipe prefix)
    const oldFormat = '2\n{"seqNo":1}\n{"seqNo":2}\n';
    const { queue, retryCounts } = deserializeQueue(oldFormat);

    expect(queue).toEqual(['{"seqNo":1}', '{"seqNo":2}']);
    expect(retryCounts).toEqual([0, 0]);
  });

  it("retry count persists across flush cycles", () => {
    // First flush: event gets 400, retryCount becomes 1, flush stops
    const r1 = flushOfflineQueue(["event1"], [0], () => 400);
    expect(r1.retryCounts[0]).toBe(1);

    // Persist and reload
    const serialized = serializeQueue(r1.queue, r1.retryCounts);
    const { queue, retryCounts } = deserializeQueue(serialized);

    // Second flush: event gets 400 again, retryCount becomes 2
    const r2 = flushOfflineQueue(queue, retryCounts, () => 400);
    expect(r2.retryCounts[0]).toBe(2);

    // Persist and reload again
    const s2 = serializeQueue(r2.queue, r2.retryCounts);
    const { queue: q3, retryCounts: rc3 } = deserializeQueue(s2);

    // Third flush: event gets 400, retryCount reaches 3 → dropped
    const r3 = flushOfflineQueue(q3, rc3, () => 400);
    expect(r3.consumed).toBe(1);
    expect(r3.droppedPoison).toEqual([0]);
    expect(r3.queue).toEqual([]);
  });
});
