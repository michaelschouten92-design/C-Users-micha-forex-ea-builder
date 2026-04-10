import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockSubscriptionFindUnique = vi.fn();
const mockSubscriptionUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args),
      update: (...args: unknown[]) => mockSubscriptionUpdate(...args),
    },
  },
}));

const mockSubscriptionsUpdate = vi.fn();
const mockSchedulesRelease = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: {
      update: (...args: unknown[]) => mockSubscriptionsUpdate(...args),
    },
    subscriptionSchedules: {
      release: (...args: unknown[]) => mockSchedulesRelease(...args),
    },
  }),
}));

const mockInvalidateCache = vi.fn();
vi.mock("@/lib/plan-limits", () => ({
  invalidateSubscriptionCache: (...args: unknown[]) => mockInvalidateCache(...args),
}));

vi.mock("@/lib/logger", () => ({
  createApiLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  extractErrorDetails: (err: unknown) => err,
}));

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimiter: {},
  checkRateLimit: async () => ({ success: true }),
  createRateLimitHeaders: () => ({}),
  formatRateLimitError: () => "rate limit",
}));

// ─── Tests ───────────────────────────────────────────────────────────

const USER_ID = "user_test";

describe("POST /api/stripe/cancel", () => {
  let POST: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: USER_ID, suspended: false } });
    const mod = await import("../route");
    POST = mod.POST as () => Promise<Response>;
  });

  it("sets cancel_at_period_end and persists cancelAtPeriodEnd in DB", async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "PRO",
      status: "active",
      stripeScheduleId: null,
    });
    mockSubscriptionsUpdate.mockResolvedValue({
      current_period_end: periodEnd,
      cancel_at: null,
    });
    mockSubscriptionUpdate.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.periodEnd).toBeTruthy();

    // Stripe call
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_stripe_1", {
      cancel_at_period_end: true,
    });

    // DB persistence
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub_db_1" },
        data: expect.objectContaining({
          cancelAtPeriodEnd: expect.any(Date),
        }),
      })
    );

    expect(mockInvalidateCache).toHaveBeenCalledWith(USER_ID);
  });

  it("releases pending downgrade schedule before cancelling", async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "ELITE",
      status: "active",
      stripeScheduleId: "sub_sched_1",
    });
    mockSchedulesRelease.mockResolvedValue({});
    mockSubscriptionsUpdate.mockResolvedValue({
      current_period_end: periodEnd,
    });
    mockSubscriptionUpdate.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);

    // Schedule released first
    expect(mockSchedulesRelease).toHaveBeenCalledWith("sub_sched_1");

    // Then subscription cancelled
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_stripe_1", {
      cancel_at_period_end: true,
    });
  });

  it("allows cancel while trialing", async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "PRO",
      status: "trialing",
      stripeScheduleId: null,
    });
    mockSubscriptionsUpdate.mockResolvedValue({ current_period_end: periodEnd });
    mockSubscriptionUpdate.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);
  });

  it("returns 400 when no stripeSubId", async () => {
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: null,
      tier: "FREE",
      status: "active",
    });

    const res = await POST();
    expect(res.status).toBe(400);
    expect(mockSubscriptionsUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when subscription is not active/trialing", async () => {
    mockSubscriptionFindUnique.mockResolvedValue({
      id: "sub_db_1",
      stripeSubId: "sub_stripe_1",
      tier: "PRO",
      status: "cancelled",
    });

    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 403 when account is suspended", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID, suspended: true } });
    const res = await POST();
    expect(res.status).toBe(403);
  });
});
