import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockProofEventLogFindMany = vi.fn();
const mockVerificationConfigFindUnique = vi.fn();
const mockTradeFactFindMany = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalAuditReplayRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    proofEventLog: {
      findMany: (...args: unknown[]) => mockProofEventLogFindMany(...args),
    },
    verificationConfig: {
      findUnique: (...args: unknown[]) => mockVerificationConfigFindUnique(...args),
    },
    tradeFact: {
      findMany: (...args: unknown[]) => mockTradeFactFindMany(...args),
    },
  },
}));

const mockVerifyProofChain = vi.fn();

vi.mock("@/lib/proof/chain", () => ({
  verifyProofChain: (...args: unknown[]) => mockVerifyProofChain(...args),
}));

const mockComputeThresholdsHash = vi.fn();

vi.mock("@/domain/verification/config-snapshot", () => ({
  computeThresholdsHash: (...args: unknown[]) => mockComputeThresholdsHash(...args),
}));

vi.mock("@/domain/trade-ingest/build-snapshot", () => ({
  buildTradeSnapshot: vi.fn(),
}));

const mockAppendProofEvent = vi.fn();

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: (...args: unknown[]) => mockAppendProofEvent(...args),
}));

function makeRequest(apiKey?: string, recordId?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  const url = recordId
    ? `http://localhost/api/internal/audit/bundle?recordId=${recordId}`
    : "http://localhost/api/internal/audit/bundle";
  return new NextRequest(url, { method: "GET", headers });
}

describe("GET /api/internal/audit/bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
    mockProofEventLogFindMany.mockResolvedValue([]);
    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 0 });
    mockAppendProofEvent.mockResolvedValue({ sequence: 1, eventHash: "h" });
  });

  it("rejects without API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects with wrong API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("returns 400 when recordId is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns bundle with expected keys and excludes blocked fields", async () => {
    const now = new Date("2026-03-02T12:00:00Z");
    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: {
          strategyId: "strat_1",
          verdict: "READY",
          configVersion: "2.3.2",
          thresholdsHash: "th_hash",
          secretField: "should_not_appear",
          ipHash: "should_not_appear",
        },
        createdAt: now,
      },
    ]);

    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });
    mockVerificationConfigFindUnique.mockResolvedValue({
      snapshot: { thresholds: { minTradeCount: 20 } },
      thresholdsHash: "th_hash",
    });
    mockComputeThresholdsHash.mockReturnValue("th_hash");

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");

    const json = JSON.parse(await res.text());

    // Top-level bundle keys
    expect(json.bundleVersion).toBe("1");
    expect(json.generatedAt).toBeDefined();
    expect(json.recordId).toBe("rec_1");
    expect(json.replay).toBeDefined();
    expect(json.proofEvents).toHaveLength(1);
    expect(json.configSnapshot).toBeDefined();

    // Replay shape
    expect(json.replay.chain.ok).toBe(true);
    expect(json.replay.runType).toBe("verification");
    expect(json.replay.extracted.verdict).toBe("READY");

    // Whitelisted payload — no blocked fields
    expect(json.proofEvents[0].payload.verdict).toBe("READY");
    expect(json.proofEvents[0].payload.secretField).toBeUndefined();
    expect(json.proofEvents[0].payload.ipHash).toBeUndefined();

    // proofEvents include strategyId field
    expect(json.proofEvents[0].strategyId).toBe("strat_1");
  });

  it("produces deterministic JSON output (stable key ordering)", async () => {
    const fixedDate = new Date("2026-03-02T12:00:00Z");
    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: { strategyId: "strat_1", verdict: "READY", configVersion: "2.3.2" },
        createdAt: fixedDate,
      },
    ]);
    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });
    mockVerificationConfigFindUnique.mockResolvedValue(null);

    const { GET } = await import("./route");

    const res1 = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const text1 = await res1.text();

    const res2 = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const text2 = await res2.text();

    // Parse both to remove generatedAt (varies per call)
    const json1 = JSON.parse(text1);
    const json2 = JSON.parse(text2);
    delete json1.generatedAt;
    delete json2.generatedAt;

    // Re-stringify and compare — stable key ordering
    expect(JSON.stringify(json1)).toBe(JSON.stringify(json2));

    // Verify keys are sorted within nested objects
    const keys1 = Object.keys(json1);
    expect(keys1).toEqual([...keys1].sort());
  });

  it("logs AUDIT_REPLAY_PERFORMED with mode=bundle", async () => {
    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: { strategyId: "strat_1" },
        createdAt: new Date(),
      },
    ]);
    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 50));

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "AUDIT_REPLAY_PERFORMED",
      expect.objectContaining({
        eventType: "AUDIT_REPLAY_PERFORMED",
        recordId: "rec_1",
        mode: "bundle",
      })
    );
  });

  it("still returns 200 when proof event logging fails", async () => {
    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: { strategyId: "strat_1" },
        createdAt: new Date(),
      },
    ]);
    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });
    mockAppendProofEvent.mockRejectedValue(new Error("Proof event DB error"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    expect(res.status).toBe(200);
  });

  it("returns configSnapshot null when no configVersion in payload", async () => {
    mockProofEventLogFindMany.mockResolvedValue([]);
    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 0 });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const json = JSON.parse(await res.text());

    expect(json.configSnapshot).toBeNull();
  });

  it("returns 500 on DB error", async () => {
    mockProofEventLogFindMany.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
