import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verifiedStrategyPage: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    liveEAInstance: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
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

function makeRequest() {
  return new NextRequest("http://localhost/api/strategies/public", {
    method: "GET",
  });
}

function makePage(overrides: Record<string, unknown> = {}) {
  return {
    id: "page_1",
    slug: "demo",
    isPublic: true,
    pinnedInstanceId: null,
    ladderLevel: "SUBMITTED",
    updatedAt: new Date("2025-01-01"),
    strategyIdentity: {
      strategyId: "AS-10F10DCA",
      project: {
        id: "proj_1",
        name: "Demo Strategy",
        backtestUploads: [
          {
            runs: [
              {
                profitFactor: 1.85,
                maxDrawdownPct: 12.3,
                totalTrades: 450,
                winRate: 0.63,
                validationResult: { survivalRate: 0.82 },
              },
            ],
          },
        ],
      },
    },
    ...overrides,
  };
}

describe("GET /api/strategies/public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
  });

  it("returns 200 with valid items array", async () => {
    mockFindMany.mockResolvedValue([makePage()]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].strategyId).toBe("AS-10F10DCA");
    expect(json.items[0].profitFactor).toBe(1.85);
    expect(json.items[0].slug).toBe("demo");
  });

  it("filters out strategies with totalTrades < 200", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads[0].runs[0].totalTrades = 100;
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  it("filters out strategies with profitFactor < 1.2", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads[0].runs[0].profitFactor = 0.9;
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  it("filters out RETIRED (STOP) lifecycle strategies", async () => {
    const page = makePage({ pinnedInstanceId: "inst_1" });
    mockFindMany.mockResolvedValue([page]);
    mockFindUnique.mockResolvedValue({
      lifecyclePhase: "RETIRED",
      operatorHold: "NONE",
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  it("has Cache-Control: no-store header", async () => {
    mockFindMany.mockResolvedValue([makePage()]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("filters out strategies with monteCarloSurvival < 70%", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads[0].runs[0].validationResult = {
      survivalRate: 0.5,
    };
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  // A3 boundary — profitFactor exactly 1.19 excluded, 1.2 included
  it("excludes profitFactor at boundary 1.19", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads[0].runs[0].profitFactor = 1.19;
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  it("includes profitFactor at boundary 1.2", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads[0].runs[0].profitFactor = 1.2;
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(1);
  });

  // A3 boundary — totalTrades exactly 199 excluded, 200 included
  it("excludes totalTrades at boundary 199", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads[0].runs[0].totalTrades = 199;
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  // A3 boundary — MC survival exactly 69% excluded
  it("excludes monteCarloSurvival at boundary 69%", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads[0].runs[0].validationResult = {
      survivalRate: 0.69,
    };
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  // A5 — page with no backtest runs is excluded (null handling)
  it("excludes strategies with no backtest runs", async () => {
    const page = makePage();
    page.strategyIdentity.project.backtestUploads = [];
    mockFindMany.mockResolvedValue([page]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  // A2 — response items do not contain internal DB ids
  it("does not leak internal IDs in response items", async () => {
    mockFindMany.mockResolvedValue([makePage()]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    const json = await res.json();
    const raw = JSON.stringify(json);
    expect(raw).not.toContain("page_1");
    expect(raw).not.toContain("proj_1");
  });

  // A6 — exports force-dynamic and revalidate=0
  it("exports force-dynamic and revalidate=0", async () => {
    const mod = await import("./route");
    expect(mod.dynamic).toBe("force-dynamic");
    expect(mod.revalidate).toBe(0);
  });

  // A6 — 429 response includes rate-limit headers (via createRateLimitHeaders mock)
  it("returns 429 when rate-limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(429);
  });
});
