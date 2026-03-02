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

const mockBuildTradeSnapshot = vi.fn();

vi.mock("@/domain/trade-ingest/build-snapshot", () => ({
  buildTradeSnapshot: (...args: unknown[]) => mockBuildTradeSnapshot(...args),
}));

const mockAppendProofEvent = vi.fn();

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: (...args: unknown[]) => mockAppendProofEvent(...args),
}));

function makeRequest(apiKey?: string, recordId?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  const url = recordId
    ? `http://localhost/api/internal/audit/replay?recordId=${recordId}`
    : "http://localhost/api/internal/audit/replay";
  return new NextRequest(url, { method: "GET", headers });
}

describe("GET /api/internal/audit/replay", () => {
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

  it("returns correct shape with valid chain", async () => {
    const now = new Date();
    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_STARTED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: { strategyId: "strat_1" },
        createdAt: now,
      },
      {
        sequence: 2,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "hash_2",
        prevEventHash: "hash_1",
        meta: {
          strategyId: "strat_1",
          verdict: "READY",
          reasonCodes: ["HIGH_SHARPE"],
          configVersion: "2.3.2",
          thresholdsHash: "th_hash",
          secretField: "should_not_appear",
        },
        createdAt: now,
      },
    ]);

    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 2 });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.recordId).toBe("rec_1");
    expect(json.chain).toEqual({ ok: true, chainLength: 2 });
    expect(json.runType).toBe("verification");

    // Extracted payload is whitelisted
    expect(json.extracted.strategyId).toBe("strat_1");
    expect(json.extracted.verdict).toBe("READY");
    expect(json.extracted.configVersion).toBe("2.3.2");
    expect(json.extracted.thresholdsHash).toBe("th_hash");
    expect(json.extracted.secretField).toBeUndefined();

    // Events have whitelisted payloads
    expect(json.events).toHaveLength(2);
    expect(json.events[0].type).toBe("VERIFICATION_RUN_STARTED");
    expect(json.events[1].payload.verdict).toBe("READY");
    expect(json.events[1].payload.secretField).toBeUndefined();
  });

  it("reports chain failure with breakAtSequence", async () => {
    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_STARTED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: {},
        createdAt: new Date(),
      },
      {
        sequence: 2,
        strategyId: "strat_1",
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "tampered_hash",
        prevEventHash: "wrong_prev",
        meta: {},
        createdAt: new Date(),
      },
    ]);

    mockVerifyProofChain.mockReturnValue({
      valid: false,
      chainLength: 1,
      breakAtSequence: 2,
      error: "prevEventHash mismatch at sequence 2",
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.chain.ok).toBe(false);
    expect(json.chain.breakAtSequence).toBe(2);
    expect(json.chain.error).toContain("prevEventHash mismatch");
  });

  it("returns config verification OK when hashes match", async () => {
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
          configVersion: "2.3.2",
          thresholdsHash: "matching_hash",
        },
        createdAt: new Date(),
      },
    ]);

    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });

    mockVerificationConfigFindUnique.mockResolvedValue({
      snapshot: {
        thresholds: { minTradeCount: 20 },
        monitoringThresholds: { drawdownBreachMultiplier: 1.5 },
      },
      thresholdsHash: "matching_hash",
    });

    mockComputeThresholdsHash.mockReturnValue("matching_hash");

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const json = await res.json();

    expect(json.configVerification.status).toBe("OK");
    expect(json.configVerification.expectedHash).toBe("matching_hash");
    expect(json.configVerification.actualHash).toBe("matching_hash");
  });

  it("returns config verification FAILED when recomputed hash differs", async () => {
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
          configVersion: "2.3.2",
          thresholdsHash: "reported_hash",
        },
        createdAt: new Date(),
      },
    ]);

    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });

    mockVerificationConfigFindUnique.mockResolvedValue({
      snapshot: {
        thresholds: { minTradeCount: 20 },
        monitoringThresholds: { drawdownBreachMultiplier: 1.5 },
      },
      thresholdsHash: "reported_hash",
    });

    // Recomputed hash differs — config was tampered with
    mockComputeThresholdsHash.mockReturnValue("different_hash");

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const json = await res.json();

    expect(json.configVerification.status).toBe("FAILED");
    expect(json.configVerification.details).toContain("Recomputed thresholdsHash");
  });

  it("returns snapshot verification NOT_VERIFIABLE for verification runs", async () => {
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
          tradeSnapshotHash: "some_hash",
        },
        createdAt: new Date(),
      },
    ]);

    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const json = await res.json();

    expect(json.snapshotVerification.status).toBe("NOT_VERIFIABLE");
    expect(json.snapshotVerification.details).toContain("monitoring runs");
  });

  it("detects monitoring run type correctly", async () => {
    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "MONITORING_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: {
          strategyId: "strat_1",
          monitoringVerdict: "HEALTHY",
        },
        createdAt: new Date(),
      },
    ]);

    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));
    const json = await res.json();

    expect(json.runType).toBe("monitoring");
  });

  it("returns 500 on DB error", async () => {
    mockProofEventLogFindMany.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "rec_1"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });

  it("logs AUDIT_REPLAY_PERFORMED proof event on success", async () => {
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

    // Wait for async fire-and-forget
    await new Promise((r) => setTimeout(r, 10));

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "AUDIT_REPLAY_PERFORMED",
      expect.objectContaining({
        eventType: "AUDIT_REPLAY_PERFORMED",
        recordId: "rec_1",
        mode: "replay",
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
});
