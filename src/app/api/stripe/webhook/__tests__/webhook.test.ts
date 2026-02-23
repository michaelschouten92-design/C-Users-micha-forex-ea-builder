import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    charges: { retrieve: vi.fn() },
  }),
}));

const mockWebhookEventCreate = vi.fn();
const mockWebhookEventDelete = vi.fn();
const mockQueryRaw = vi.fn();
const mockSubscriptionUpdate = vi.fn();
const mockSubscriptionFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: {
      create: (...args: unknown[]) => mockWebhookEventCreate(...args),
      delete: (...args: unknown[]) => mockWebhookEventDelete(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $queryRaw: mockQueryRaw,
        subscription: { update: mockSubscriptionUpdate },
      }),
    subscription: {
      findFirst: mockSubscriptionFindFirst,
      update: mockSubscriptionUpdate,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    AUTH_URL: "https://test.example.com",
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_monthly",
    STRIPE_PRO_YEARLY_PRICE_ID: "price_pro_yearly",
    STRIPE_ELITE_MONTHLY_PRICE_ID: "price_elite_monthly",
    STRIPE_ELITE_YEARLY_PRICE_ID: "price_elite_yearly",
  },
}));

const mockSendPaymentFailedEmail = vi.fn().mockResolvedValue(undefined);
const mockSendPaymentActionRequiredEmail = vi.fn().mockResolvedValue(undefined);
const mockSendPlanChangeEmail = vi.fn().mockResolvedValue(undefined);
const mockSendTrialEndingEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/email", () => ({
  sendPaymentFailedEmail: (...args: unknown[]) => mockSendPaymentFailedEmail(...args),
  sendPaymentActionRequiredEmail: (...args: unknown[]) =>
    mockSendPaymentActionRequiredEmail(...args),
  sendPlanChangeEmail: (...args: unknown[]) => mockSendPlanChangeEmail(...args),
  sendTrialEndingEmail: (...args: unknown[]) => mockSendTrialEndingEmail(...args),
}));

const mockInvalidateCache = vi.fn();
vi.mock("@/lib/plan-limits", () => ({
  invalidateSubscriptionCache: (...args: unknown[]) => mockInvalidateCache(...args),
}));

const mockSyncDiscordRoleForUser = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/discord", () => ({
  syncDiscordRoleForUser: (...args: unknown[]) => mockSyncDiscordRoleForUser(...args),
}));

vi.mock("@/lib/audit", () => ({
  audit: {
    subscriptionUpgrade: vi.fn().mockResolvedValue(undefined),
    subscriptionDowngrade: vi.fn().mockResolvedValue(undefined),
    subscriptionCancel: vi.fn().mockResolvedValue(undefined),
    paymentSuccess: vi.fn().mockResolvedValue(undefined),
    paymentFailed: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
  extractErrorDetails: (err: unknown) => err,
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function makeRequest(body = "test-body", headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://test.example.com/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": "test-signature",
      ...headers,
    },
  });
}

function makeStripeEvent(
  type: string,
  data: Record<string, unknown>,
  id = "evt_test_123"
): { id: string; type: string; data: { object: Record<string, unknown> } } {
  return { id, type, data: { object: data } };
}

function makeStripeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_test_123",
    status: "active",
    customer: "cus_test_123",
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    items: {
      data: [
        {
          price: { id: "price_pro_monthly" },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        },
      ],
    },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("Stripe Webhook Handler", () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: idempotency claim succeeds
    mockWebhookEventCreate.mockResolvedValue({ eventId: "evt_test_123" });
    mockWebhookEventDelete.mockResolvedValue(undefined);
    mockUserFindUnique.mockResolvedValue({ email: "test@example.com" });
    // Re-import to get fresh module
    const mod = await import("../route");
    POST = mod.POST;
  });

  // ─── Signature Verification ──────────────────────────────────────

  describe("Signature verification", () => {
    it("rejects requests with missing stripe-signature header", async () => {
      const request = new NextRequest("https://test.example.com/api/stripe/webhook", {
        method: "POST",
        body: "test",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Missing signature");
    });

    it("rejects requests with invalid signature", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = makeRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid signature");
    });

    it("accepts requests with valid signature", async () => {
      const event = makeStripeEvent("unknown.event", {});
      mockConstructEvent.mockReturnValue(event);

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);
    });
  });

  // ─── Idempotency ────────────────────────────────────────────────

  describe("Idempotency", () => {
    it("skips duplicate events (P2002)", async () => {
      const event = makeStripeEvent("checkout.session.completed", {});
      mockConstructEvent.mockReturnValue(event);

      const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      mockWebhookEventCreate.mockRejectedValue(p2002Error);

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    it("re-throws non-P2002 database errors", async () => {
      const event = makeStripeEvent("checkout.session.completed", {});
      mockConstructEvent.mockReturnValue(event);
      mockWebhookEventCreate.mockRejectedValue(new Error("DB connection lost"));

      await expect(POST(makeRequest())).rejects.toThrow("DB connection lost");
    });

    it("removes idempotency claim on handler error", async () => {
      const event = makeStripeEvent("invoice.payment_succeeded", {
        subscription: "sub_test",
        customer: "cus_test",
      });
      mockConstructEvent.mockReturnValue(event);

      // Make the handler throw
      mockSubscriptionsRetrieve.mockRejectedValue(new Error("Stripe API error"));

      const response = await POST(makeRequest());
      expect(response.status).toBe(500);

      // Verify idempotency claim was deleted
      expect(mockWebhookEventDelete).toHaveBeenCalledWith({
        where: { eventId: "evt_test_123" },
      });
    });
  });

  // ─── checkout.session.completed ──────────────────────────────────

  describe("checkout.session.completed", () => {
    it("creates subscription and updates tier", async () => {
      const stripeSub = makeStripeSubscription();
      mockSubscriptionsRetrieve.mockResolvedValue(stripeSub);

      const event = makeStripeEvent("checkout.session.completed", {
        id: "cs_test_123",
        subscription: "sub_test_123",
        customer: "cus_test_123",
        metadata: { userId: "cltest12345678901234567", plan: "PRO" },
      });
      mockConstructEvent.mockReturnValue(event);

      // User has existing subscription row
      mockQueryRaw.mockResolvedValue([
        { id: "sub_db_1", userId: "cltest12345678901234567", tier: "FREE" },
      ]);
      mockSubscriptionUpdate.mockResolvedValue({});

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);

      // Verify subscription was updated with correct data
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub_db_1" },
          data: expect.objectContaining({
            tier: "PRO",
            stripeSubId: "sub_test_123",
            stripeCustomerId: "cus_test_123",
            hadPaidPlan: true,
          }),
        })
      );

      expect(mockInvalidateCache).toHaveBeenCalledWith("cltest12345678901234567");
    });

    it("skips processing when metadata is missing", async () => {
      const event = makeStripeEvent("checkout.session.completed", {
        id: "cs_test_123",
        metadata: {},
      });
      mockConstructEvent.mockReturnValue(event);

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);
      // No subscription update should have been attempted
      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    });
  });

  // ─── invoice.payment_succeeded ───────────────────────────────────

  describe("invoice.payment_succeeded", () => {
    it("updates period dates on successful payment", async () => {
      const stripeSub = makeStripeSubscription();
      mockSubscriptionsRetrieve.mockResolvedValue(stripeSub);

      const event = makeStripeEvent("invoice.payment_succeeded", {
        subscription: "sub_test_123",
        customer: "cus_test_123",
      });
      mockConstructEvent.mockReturnValue(event);
      mockQueryRaw.mockResolvedValue([{ id: "sub_db_1", userId: "user_123" }]);
      mockSubscriptionUpdate.mockResolvedValue({});

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "active",
          }),
        })
      );
      expect(mockInvalidateCache).toHaveBeenCalledWith("user_123");
    });

    it("throws when no subscription found for customer (M1 fix)", async () => {
      const stripeSub = makeStripeSubscription();
      mockSubscriptionsRetrieve.mockResolvedValue(stripeSub);

      const event = makeStripeEvent("invoice.payment_succeeded", {
        subscription: "sub_test_123",
        customer: "cus_unknown",
      });
      mockConstructEvent.mockReturnValue(event);

      // No matching subscription in DB
      mockQueryRaw.mockResolvedValue([]);

      const response = await POST(makeRequest());
      // Should return 500 because the handler throws, which triggers error recovery
      expect(response.status).toBe(500);

      // Verify idempotency claim was cleaned up for retry
      expect(mockWebhookEventDelete).toHaveBeenCalledWith({
        where: { eventId: "evt_test_123" },
      });
    });
  });

  // ─── customer.subscription.deleted ───────────────────────────────

  describe("customer.subscription.deleted", () => {
    it("sets status to cancelled and tier to FREE", async () => {
      const event = makeStripeEvent("customer.subscription.deleted", {
        id: "sub_test_123",
        customer: "cus_test_123",
      });
      mockConstructEvent.mockReturnValue(event);
      mockQueryRaw.mockResolvedValue([{ id: "sub_db_1", userId: "user_123" }]);
      mockSubscriptionUpdate.mockResolvedValue({});

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: "FREE",
            status: "cancelled",
            stripeSubId: null,
          }),
        })
      );
      expect(mockInvalidateCache).toHaveBeenCalledWith("user_123");
    });
  });

  // ─── invoice.payment_failed ──────────────────────────────────────

  describe("invoice.payment_failed", () => {
    it("sets status to past_due and sends email", async () => {
      const event = makeStripeEvent("invoice.payment_failed", {
        customer: "cus_test_123",
      });
      mockConstructEvent.mockReturnValue(event);
      mockQueryRaw.mockResolvedValue([{ id: "sub_db_1", userId: "user_123" }]);
      mockSubscriptionUpdate.mockResolvedValue({});
      mockUserFindUnique.mockResolvedValue({ email: "test@example.com" });

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "past_due" },
        })
      );

      // Email should be sent
      expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.any(String)
      );
    });
  });

  // ─── charge.refunded ────────────────────────────────────────────

  describe("charge.refunded", () => {
    it("logs refund but does not downgrade subscription", async () => {
      const event = makeStripeEvent("charge.refunded", {
        id: "ch_test_123",
        customer: "cus_test_123",
        amount_refunded: 1000,
        refunded: false, // partial refund
      });
      mockConstructEvent.mockReturnValue(event);

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);

      // Should NOT update subscription
      expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
    });

    it("also does not downgrade on full refund (handled by subscription.deleted)", async () => {
      const event = makeStripeEvent("charge.refunded", {
        id: "ch_test_123",
        customer: "cus_test_123",
        amount_refunded: 2000,
        refunded: true, // full refund
      });
      mockConstructEvent.mockReturnValue(event);

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);

      // Should NOT update subscription — cancellation is handled by subscription.deleted event
      expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── IP allowlist (L1) ──────────────────────────────────────────

  describe("IP allowlist", () => {
    it("allows requests when STRIPE_WEBHOOK_IPS is not set", async () => {
      // Default env: no STRIPE_WEBHOOK_IPS
      const event = makeStripeEvent("unknown.event", {});
      mockConstructEvent.mockReturnValue(event);

      const response = await POST(makeRequest());
      expect(response.status).toBe(200);
    });
  });
});
