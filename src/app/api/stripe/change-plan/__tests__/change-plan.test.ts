import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockUserFindUnique = vi.fn();
const mockSubscriptionFindUnique = vi.fn();
const mockSubscriptionUpdate = vi.fn();
const mockAccountTrackRecordShareCount = vi.fn();
const mockTerminalConnectionCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    subscription: {
      findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args),
      update: (...args: unknown[]) => mockSubscriptionUpdate(...args),
    },
    accountTrackRecordShare: {
      count: (...args: unknown[]) => mockAccountTrackRecordShareCount(...args),
    },
    terminalConnection: {
      count: (...args: unknown[]) => mockTerminalConnectionCount(...args),
    },
  },
}));

const mockSubscriptionsRetrieve = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockSchedulesCreate = vi.fn();
const mockSchedulesUpdate = vi.fn();
const mockSchedulesRelease = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: {
      retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args),
      update: (...args: unknown[]) => mockSubscriptionsUpdate(...args),
    },
    subscriptionSchedules: {
      create: (...args: unknown[]) => mockSchedulesCreate(...args),
      update: (...args: unknown[]) => mockSchedulesUpdate(...args),
      release: (...args: unknown[]) => mockSchedulesRelease(...args),
    },
  }),
}));

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro",
    STRIPE_ELITE_MONTHLY_PRICE_ID: "price_elite",
    STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID: "price_inst",
    AUTH_URL: "https://test.example.com",
  },
  features: {
    stripe: true,
    googleAuth: false,
    githubAuth: false,
    discordAuth: false,
    email: false,
    captcha: false,
    webPush: false,
  },
}));

// Mock plans because the real plans.ts returns empty price IDs in test environments
// (where `typeof window !== "undefined"` is true under jsdom).
vi.mock("@/lib/plans", async () => {
  const actual = await vi.importActual<typeof import("@/lib/plans")>("@/lib/plans");
  const makePlan = (tier: "PRO" | "ELITE" | "INSTITUTIONAL", priceId: string) => ({
    ...actual.PLANS[tier],
    prices: {
      monthly: {
        amount: 3900,
        currency: "eur",
        interval: "month" as const,
        priceId,
      },
    },
  });
  return {
    ...actual,
    PLANS: {
      ...actual.PLANS,
      PRO: makePlan("PRO", "price_pro"),
      ELITE: makePlan("ELITE", "price_elite"),
      INSTITUTIONAL: makePlan("INSTITUTIONAL", "price_inst"),
    },
  };
});

const mockInvalidateCache = vi.fn();
vi.mock("@/lib/plan-limits", async () => {
  const actual = await vi.importActual<typeof import("@/lib/plan-limits")>("@/lib/plan-limits");
  return {
    ...actual,
    invalidateSubscriptionCache: (...args: unknown[]) => mockInvalidateCache(...args),
    getMonitoredTradingAccountUsage: async (_userId: string) => 0,
    checkDowngradeImpact: async () => [],
  };
});

vi.mock("@/lib/logger", () => ({
  createApiLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  extractErrorDetails: (err: unknown) => err,
}));

// audit-2 P1-A7: change-plan writes a subscriptionDowngrade audit event on
// the immediate-downgrade fallback path (period already ended).
vi.mock("@/lib/audit", () => ({
  audit: {
    subscriptionUpgrade: vi.fn().mockResolvedValue(undefined),
    subscriptionDowngrade: vi.fn().mockResolvedValue(undefined),
    subscriptionCancel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimiter: {},
  checkRateLimit: async () => ({ success: true }),
  createRateLimitHeaders: () => ({}),
  formatRateLimitError: () => "rate limit",
}));

// ─── Helpers ─────────────────────────────────────────────────────────

const USER_ID = "user_test";

function makeRequest(body: object) {
  return new NextRequest("https://test.example.com/api/stripe/change-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/change-plan", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: USER_ID, suspended: false } });
    mockUserFindUnique.mockResolvedValue({ emailVerified: new Date() });
    mockTerminalConnectionCount.mockResolvedValue(0);
    mockAccountTrackRecordShareCount.mockResolvedValue(0);
    const mod = await import("../route");
    POST = mod.POST;
  });

  it("returns 403 when user email is not verified", async () => {
    mockUserFindUnique.mockResolvedValue({ emailVerified: null });

    const res = await POST(makeRequest({ plan: "ELITE", interval: "monthly" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 with PAYMENT_PAST_DUE when subscription is past_due", async () => {
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "PRO",
      status: "past_due",
    });

    const res = await POST(makeRequest({ plan: "ELITE", interval: "monthly" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("PAYMENT_PAST_DUE");
  });

  it("upgrades with idempotency key on Stripe API call", async () => {
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "PRO",
      status: "active",
      stripeScheduleId: null,
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      items: {
        data: [
          {
            id: "si_1",
            price: { id: "price_pro", recurring: { interval: "month", interval_count: 1 } },
          },
        ],
      },
    });
    mockSubscriptionsUpdate.mockResolvedValue({});

    const res = await POST(makeRequest({ plan: "ELITE", interval: "monthly" }));
    expect(res.status).toBe(200);

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_stripe_1",
      expect.objectContaining({
        items: [{ id: "si_1", price: "price_elite" }],
        proration_behavior: "create_prorations",
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^plan-change_/),
      })
    );
  });

  it("schedules downgrade with 2 phases and returns warnings", async () => {
    const periodStart = Math.floor(Date.now() / 1000);
    const periodEnd = periodStart + 30 * 24 * 3600;
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "ELITE",
      status: "active",
      stripeScheduleId: null,
      scheduledDowngradeTier: null,
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      current_period_start: periodStart,
      current_period_end: periodEnd,
      items: {
        data: [
          {
            id: "si_1",
            price: { id: "price_elite", recurring: { interval: "month", interval_count: 1 } },
          },
        ],
      },
    });
    mockSchedulesCreate.mockResolvedValue({ id: "sub_sched_1" });
    mockSchedulesUpdate.mockResolvedValue({});
    mockSubscriptionUpdate.mockResolvedValue({});

    const res = await POST(makeRequest({ plan: "PRO", interval: "monthly" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scheduled).toBe(true);
    expect(body.warnings).toEqual([]);

    // Schedule created with 2 phases
    expect(mockSchedulesUpdate).toHaveBeenCalledWith(
      "sub_sched_1",
      expect.objectContaining({
        end_behavior: "release",
        phases: expect.arrayContaining([
          expect.objectContaining({ items: [{ price: "price_elite", quantity: 1 }] }),
          expect.objectContaining({ items: [{ price: "price_pro", quantity: 1 }] }),
        ]),
      })
    );
  });

  it("applies immediate downgrade when current period has already ended", async () => {
    // audit-2 P1-A7: previously this returned 400 which gave users an
    // unrecoverable UX in the last minutes of their cycle. Now the route
    // applies the downgrade immediately via subscriptions.update (no
    // schedule needed, period is over) and returns success.
    const expiredPeriodEnd = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "ELITE",
      status: "active",
      stripeScheduleId: null,
      scheduledDowngradeTier: null,
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      current_period_start: expiredPeriodEnd - 30 * 24 * 3600,
      current_period_end: expiredPeriodEnd,
      items: {
        data: [
          {
            id: "si_1",
            price: { id: "price_elite", recurring: { interval: "month", interval_count: 1 } },
          },
        ],
      },
    });

    const res = await POST(makeRequest({ plan: "PRO", interval: "monthly" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.immediate).toBe(true);
    expect(mockSchedulesCreate).not.toHaveBeenCalled();
    expect(mockSubscriptionsUpdate).toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ plan: "ELITE", interval: "monthly" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when account is suspended", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID, suspended: true } });
    const res = await POST(makeRequest({ plan: "ELITE", interval: "monthly" }));
    expect(res.status).toBe(403);
  });
});
