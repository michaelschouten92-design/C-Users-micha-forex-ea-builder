import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockBindIdentityToVersion = vi.fn();
vi.mock("@/lib/strategy-identity/identity", () => ({
  bindIdentityToVersion: (...args: unknown[]) => mockBindIdentityToVersion(...args),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user_1", suspended: false },
  }),
}));

const mockWarn = vi.fn();
vi.mock("@/lib/logger", () => ({
  createApiLogger: () => ({
    info: vi.fn(),
    warn: mockWarn,
    error: vi.fn(),
  }),
  extractErrorDetails: (e: unknown) => ({
    message: e instanceof Error ? e.message : String(e),
  }),
}));

// Prisma mock — needs every model accessed by the route
const mockTransaction = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ emailVerified: new Date() }),
    },
    project: {
      findFirst: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "TestEA",
        description: null,
        versions: [
          {
            id: "ver_1",
            versionNo: 1,
            buildJson: {
              nodes: [{ data: { tradingType: "place-buy" } }],
              edges: [],
              settings: {},
            },
          },
        ],
      }),
    },
    backtestRun: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  exportRateLimiter: {},
  apiRateLimiter: {},
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9, limit: 10, reset: 0 }),
  createRateLimitHeaders: () => new Headers(),
  formatRateLimitError: () => "rate limited",
}));

vi.mock("@/lib/plan-limits", () => ({
  getCachedTier: vi.fn().mockResolvedValue("FREE"),
  checkExportLimit: vi.fn().mockResolvedValue({ allowed: true, current: 0, max: 5 }),
}));

vi.mock("@/lib/plans", () => ({
  PLANS: { FREE: { limits: { maxExportsPerMonth: 5 } } },
}));

vi.mock("@/lib/validations", () => ({
  exportRequestSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  buildJsonSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  formatZodErrors: () => [],
  safeReadJson: async (req: Request) => ({ data: await req.json() }),
  checkContentType: () => null,
}));

vi.mock("@/lib/error-codes", async () => {
  const actual = await vi.importActual("@/lib/error-codes");
  return actual;
});

vi.mock("@/lib/migrations", () => ({
  migrateProjectData: (d: unknown) => d,
}));

vi.mock("@/lib/mql5-generator", () => ({
  generateMQL5Code: () => "// generated MQL5 code",
}));

vi.mock("@/lib/strategy-identity", () => ({
  computeStrategyFingerprint: () => ({
    fingerprint: "fp_1",
    logicHash: "lh_1",
    parameterHash: "ph_1",
  }),
  ensureStrategyIdentity: vi
    .fn()
    .mockResolvedValue({ id: "si_1", strategyId: "AS-abc", isNew: false }),
  recordStrategyVersion: vi.fn().mockResolvedValue({ id: "sv_1", versionNo: 1, isNew: true }),
  createBaselineFromBacktest: vi.fn().mockResolvedValue({ id: "bl_1", isNew: true }),
}));

vi.mock("@/lib/proof", () => ({
  computePreLiveVerdict: () => ({ verdict: "DEPLOYABLE", reasons: [] }),
  extractPreLiveInput: () => ({}),
}));

vi.mock("@/lib/audit", () => ({
  audit: {
    exportRequest: vi.fn().mockResolvedValue(undefined),
    exportComplete: vi.fn().mockResolvedValue(undefined),
    exportFailed: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000", AUTH_URL: "" },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

const PROJECT_ID = "proj_1";
const STRATEGY_VERSION_ID = "sv_1";

function makeExportRequest() {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

function setupTransaction() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      exportJob: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: "exp_1",
          outputName: "TestEA.mq5",
        }),
      },
      liveEAInstance: {
        create: vi.fn().mockResolvedValue({ id: "lea_1" }),
      },
      trackRecordState: {
        create: vi.fn().mockResolvedValue({}),
      },
      strategyIdentity: {
        findUnique: vi.fn().mockResolvedValue({ id: "si_1", strategyId: "AS-abc" }),
      },
      backtestBaseline: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "bl_1" }),
      },
    };
    return fn(tx);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/projects/[id]/export — identity binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTransaction();
  });

  it("returns bindingFailed: false when binding succeeds", async () => {
    mockBindIdentityToVersion.mockResolvedValue({
      ok: true,
      bindingId: "bind_1",
      snapshotHash: "snap_1",
      baselineHash: "base_1",
      isNew: true,
    });

    const { POST } = await import("./route");
    const res = await POST(makeExportRequest(), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bindingFailed).toBe(false);
    expect(mockBindIdentityToVersion).toHaveBeenCalledWith(STRATEGY_VERSION_ID);
  });

  it("returns bindingFailed: true when binding returns error code", async () => {
    mockBindIdentityToVersion.mockResolvedValue({
      ok: false,
      code: "MUTATION_FAILED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeExportRequest(), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bindingFailed).toBe(true);

    // Logged at warn level with structured fields
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyVersionId: STRATEGY_VERSION_ID,
        projectId: PROJECT_ID,
        errCode: "MUTATION_FAILED",
      }),
      expect.any(String)
    );
  });

  it("returns bindingFailed: true when binding throws non-retryable error", async () => {
    mockBindIdentityToVersion.mockRejectedValue(new Error("Connection refused"));

    const { POST } = await import("./route");
    const res = await POST(makeExportRequest(), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bindingFailed).toBe(true);

    // Non-retryable: only called once
    expect(mockBindIdentityToVersion).toHaveBeenCalledTimes(1);

    // Logged at warn with error message (not the full error object — no secret leakage)
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyVersionId: STRATEGY_VERSION_ID,
        projectId: PROJECT_ID,
        errMessage: "Connection refused",
      }),
      expect.any(String)
    );
  });

  it("does not leak error stack traces in response body", async () => {
    mockBindIdentityToVersion.mockRejectedValue(new Error("DB password in stack"));

    const { POST } = await import("./route");
    const res = await POST(makeExportRequest(), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    const body = await res.json();
    // Response only contains bindingFailed flag, not the error details
    expect(body.bindingFailed).toBe(true);
    expect(JSON.stringify(body)).not.toContain("DB password");
  });

  // ── Serialization conflict retry ─────────────────────────

  it("retries once on P2034 serialization conflict and succeeds", async () => {
    const p2034Error = Object.assign(new Error("Transaction failed"), { code: "P2034" });
    mockBindIdentityToVersion.mockRejectedValueOnce(p2034Error).mockResolvedValueOnce({
      ok: true,
      bindingId: "bind_1",
      snapshotHash: "snap_1",
      baselineHash: "base_1",
      isNew: true,
    });

    const { POST } = await import("./route");
    const res = await POST(makeExportRequest(), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bindingFailed).toBe(false);

    // Called twice: first attempt failed, retry succeeded
    expect(mockBindIdentityToVersion).toHaveBeenCalledTimes(2);

    // Conflict logged before retry
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyVersionId: STRATEGY_VERSION_ID,
        projectId: PROJECT_ID,
        attempt: 1,
      }),
      "Binding serialization conflict, retrying"
    );
  });

  it("retries once on P2034 and fails on second attempt", async () => {
    const p2034Error = Object.assign(new Error("Transaction failed"), { code: "P2034" });
    mockBindIdentityToVersion
      .mockRejectedValueOnce(p2034Error)
      .mockRejectedValueOnce(new Error("Still failing"));

    const { POST } = await import("./route");
    const res = await POST(makeExportRequest(), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bindingFailed).toBe(true);

    // Called twice: first attempt retryable, second attempt final failure
    expect(mockBindIdentityToVersion).toHaveBeenCalledTimes(2);
  });

  it("retries on Postgres serialization message", async () => {
    const pgError = new Error("could not serialize access due to concurrent update");
    mockBindIdentityToVersion.mockRejectedValueOnce(pgError).mockResolvedValueOnce({
      ok: true,
      bindingId: "bind_2",
      snapshotHash: "snap_2",
      baselineHash: null,
      isNew: true,
    });

    const { POST } = await import("./route");
    const res = await POST(makeExportRequest(), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    const body = await res.json();
    expect(body.bindingFailed).toBe(false);
    expect(mockBindIdentityToVersion).toHaveBeenCalledTimes(2);
  });
});
