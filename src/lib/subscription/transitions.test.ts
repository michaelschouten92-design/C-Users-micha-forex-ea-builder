import { describe, it, expect, vi, beforeEach } from "vitest";

// Must use vi.hoisted so mocks are available before vi.mock factory runs
const { mockInfo, mockWarn } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: mockInfo, warn: mockWarn }),
  },
}));

import {
  transitionSubscription,
  logSubscriptionTransition,
  mapStripeStatus,
  type TransactionClient,
} from "./transitions";

function makeDb(updateFn = vi.fn().mockResolvedValue({})): TransactionClient {
  return { subscription: { update: updateFn } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// transitionSubscription
// ---------------------------------------------------------------------------
describe("transitionSubscription", () => {
  it("updates DB and emits structured log with all fields", async () => {
    const db = makeDb();
    await transitionSubscription(
      db,
      "user_1",
      { status: "active", tier: "PRO" },
      { status: "past_due" },
      "stripe_payment_failed"
    );

    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { status: "past_due" },
    });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        fromStatus: "active",
        toStatus: "past_due",
        fromTier: "PRO",
        toTier: undefined,
        reason: "stripe_payment_failed",
      }),
      "Subscription state transition"
    );
  });

  it("merges extraData into the DB update", async () => {
    const db = makeDb();
    await transitionSubscription(
      db,
      "user_2",
      { status: "active", tier: "PRO" },
      { status: "cancelled", tier: "FREE" },
      "stripe_subscription_cancelled",
      { stripeSubId: null, currentPeriodStart: null, currentPeriodEnd: null }
    );

    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { userId: "user_2" },
      data: {
        status: "cancelled",
        tier: "FREE",
        stripeSubId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    });
  });

  it("warns on unexpected transition (e.g. active → expired)", async () => {
    const db = makeDb();
    await transitionSubscription(
      db,
      "user_3",
      { status: "active", tier: "PRO" },
      { status: "expired" },
      "test_unexpected"
    );

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_3",
        fromStatus: "active",
        toStatus: "expired",
      }),
      "Unexpected subscription status transition"
    );
  });

  it("does NOT warn on valid transition (active → past_due)", async () => {
    const db = makeDb();
    await transitionSubscription(
      db,
      "user_4",
      { status: "active", tier: "PRO" },
      { status: "past_due" },
      "stripe_payment_failed"
    );

    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("does NOT warn on force-downgrade to FREE/cancelled", async () => {
    const db = makeDb();
    // incomplete_expired → cancelled is not in the valid table,
    // but it's a force-downgrade to FREE so it should be allowed silently
    await transitionSubscription(
      db,
      "user_5",
      { status: "incomplete_expired", tier: "PRO" },
      { status: "cancelled", tier: "FREE" },
      "stripe_dispute_lost"
    );

    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("does not emit log when DB update fails", async () => {
    const failingUpdate = vi.fn().mockRejectedValue(new Error("DB down"));
    const db = makeDb(failingUpdate);

    await expect(
      transitionSubscription(
        db,
        "user_6",
        { status: "active", tier: "PRO" },
        { status: "past_due" },
        "test_fail"
      )
    ).rejects.toThrow("DB down");

    expect(mockInfo).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// mapStripeStatus
// ---------------------------------------------------------------------------
describe("mapStripeStatus", () => {
  it.each([
    ["active", "active"],
    ["canceled", "cancelled"],
    ["incomplete", "incomplete"],
    ["incomplete_expired", "expired"],
    ["past_due", "past_due"],
    ["paused", "paused"],
    ["trialing", "trialing"],
    ["unpaid", "unpaid"],
  ] as const)("maps Stripe '%s' to '%s'", (stripeStatus, expected) => {
    expect(mapStripeStatus(stripeStatus)).toBe(expected);
  });

  it("defaults to 'active' for unknown Stripe status", () => {
    expect(mapStripeStatus("unknown_future_status")).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// logSubscriptionTransition
// ---------------------------------------------------------------------------
describe("logSubscriptionTransition", () => {
  it("emits structured log without DB interaction", () => {
    logSubscriptionTransition(
      "user_7",
      { status: "active", tier: "FREE" },
      { status: "active", tier: "PRO" },
      "admin_upgrade"
    );

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_7",
        fromStatus: "active",
        toStatus: "active",
        fromTier: "FREE",
        toTier: "PRO",
        reason: "admin_upgrade",
      }),
      "Subscription state transition"
    );
  });
});
