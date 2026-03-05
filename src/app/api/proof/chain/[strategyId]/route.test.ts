import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PROOF_GENESIS_HASH, computeProofEventHash } from "@/lib/proof/chain";

const mockFindUniqueHead = vi.fn();
const mockFindManyEvents = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    proofChainHead: {
      findUnique: (...args: unknown[]) => mockFindUniqueHead(...args),
    },
    proofEventLog: {
      findMany: (...args: unknown[]) => mockFindManyEvents(...args),
    },
  },
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  publicApiRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

function makeRequest(strategyId = "AS-10F10DCA") {
  return new NextRequest(`http://localhost/api/proof/chain/${strategyId}`, { method: "GET" });
}

function makeParams(strategyId = "AS-10F10DCA") {
  return { params: Promise.resolve({ strategyId }) };
}

const STRATEGY_ID = "AS-10F10DCA";
const RECORD_ID = "rec_test_001";
const TS = new Date("2026-01-15T10:00:00.000Z");

/** Build a valid chain of N events starting at sequence 1. */
function buildChain(count: number) {
  const events: Array<{
    sequence: number;
    strategyId: string;
    type: string;
    sessionId: string;
    eventHash: string;
    prevEventHash: string;
    meta: Record<string, unknown>;
    createdAt: Date;
  }> = [];
  let prevHash = PROOF_GENESIS_HASH;

  for (let i = 1; i <= count; i++) {
    const payload = { verdict: "READY", index: i, recordId: RECORD_ID };
    const hash = computeProofEventHash({
      sequence: i,
      strategyId: STRATEGY_ID,
      type: "VERIFICATION_RUN_COMPLETED",
      recordId: RECORD_ID,
      prevEventHash: prevHash,
      payload,
    });

    events.push({
      sequence: i,
      strategyId: STRATEGY_ID,
      type: "VERIFICATION_RUN_COMPLETED",
      sessionId: RECORD_ID,
      eventHash: hash,
      prevEventHash: prevHash,
      meta: payload,
      createdAt: new Date(TS.getTime() + i * 60_000),
    });

    prevHash = hash;
  }
  return events;
}

describe("GET /api/proof/chain/[strategyId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
  });

  it("returns PASS with 2 chained events", async () => {
    const events = buildChain(2);
    const lastEvent = events[events.length - 1];

    mockFindUniqueHead.mockResolvedValue({
      strategyId: STRATEGY_ID,
      lastSequence: 2,
      lastEventHash: lastEvent.eventHash,
    });
    mockFindManyEvents.mockResolvedValue(events);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("PASS");
    expect(json.strategyId).toBe(STRATEGY_ID);
    expect(json.head.lastSequence).toBe(2);
    expect(json.head.lastEventHashPrefix).toBe(lastEvent.eventHash.slice(0, 8));
    expect(json.summary.scannedFrom).toBe(1);
    expect(json.summary.scannedTo).toBe(2);
    expect(json.summary.breaks).toBe(0);
    expect(json.firstBreak).toBeNull();
  });

  it("returns FAIL with broken link and includes firstBreak", async () => {
    const events = buildChain(3);
    // Tamper with event 3's prevEventHash to break the chain
    events[2].prevEventHash = "deadbeef" + events[2].prevEventHash.slice(8);

    mockFindUniqueHead.mockResolvedValue({
      strategyId: STRATEGY_ID,
      lastSequence: 3,
      lastEventHash: events[2].eventHash,
    });
    mockFindManyEvents.mockResolvedValue(events);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("FAIL");
    expect(json.firstBreak).not.toBeNull();
    expect(json.firstBreak.sequence).toBe(3);
    // expectedPrevHashPrefix = prefix of event 2's eventHash
    expect(json.firstBreak.expectedPrevHashPrefix).toBe(events[1].eventHash.slice(0, 8));
    // actualPrevHashPrefix = prefix of tampered prevEventHash
    expect(json.firstBreak.actualPrevHashPrefix).toBe(events[2].prevEventHash.slice(0, 8));
    expect(json.summary.breaks).toBe(1);
  });

  it("returns UNKNOWN when no head row exists", async () => {
    mockFindUniqueHead.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    const json = await res.json();
    expect(json.status).toBe("UNKNOWN");
    expect(json.errorCode).toBe("NO_CHAIN");
    expect(json.head).toBeNull();
    expect(json.summary).toBeNull();
    expect(json.firstBreak).toBeNull();
  });

  it("returns UNKNOWN when head exists but no events found", async () => {
    mockFindUniqueHead.mockResolvedValue({
      strategyId: STRATEGY_ID,
      lastSequence: 5,
      lastEventHash: "abcdef1234567890".repeat(4),
    });
    mockFindManyEvents.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    const json = await res.json();
    expect(json.status).toBe("UNKNOWN");
    expect(json.errorCode).toBe("NO_EVENTS");
    expect(json.head).not.toBeNull();
    expect(json.head.lastSequence).toBe(5);
  });

  it("returns 400 for invalid strategyId format", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("INVALID"), makeParams("INVALID"));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid strategyId format");
  });

  it("returns 429 when rate-limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(429);
  });

  it("normalizes strategyId to uppercase", async () => {
    mockFindUniqueHead.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest("as-10f10dca"), makeParams("as-10f10dca"));

    const json = await res.json();
    expect(json.strategyId).toBe("AS-10F10DCA");
  });

  it("has Cache-Control header for CDN caching", async () => {
    mockFindUniqueHead.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.headers.get("cache-control")).toBe("public, s-maxage=10, stale-while-revalidate=60");
  });

  it("returns 500 with UNKNOWN on internal error", async () => {
    mockFindUniqueHead.mockRejectedValue(new Error("DB connection lost"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.status).toBe("UNKNOWN");
    expect(json.errorCode).toBe("INTERNAL_ERROR");
  });

  it("only exposes 8-char hash prefixes, never full hashes", async () => {
    const events = buildChain(2);
    const lastEvent = events[events.length - 1];

    mockFindUniqueHead.mockResolvedValue({
      strategyId: STRATEGY_ID,
      lastSequence: 2,
      lastEventHash: lastEvent.eventHash,
    });
    mockFindManyEvents.mockResolvedValue(events);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());
    const raw = JSON.stringify(await res.json());

    // No full 64-char hashes in response
    expect(raw).not.toMatch(/[a-f0-9]{64}/);
    // But 8-char prefix is present
    expect(raw).toContain(lastEvent.eventHash.slice(0, 8));
  });

  it("exports force-dynamic", async () => {
    const mod = await import("./route");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});
