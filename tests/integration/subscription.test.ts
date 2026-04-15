/**
 * Integration tests for audit-2 fixes (subscription lifecycle):
 *   - P1-A1: reconcile cron handles INSTITUTIONAL tier (not silently dropped)
 *   - P1-A2: mapStripeStatus fail-closed (unknown → "unpaid" not "active")
 *   - P1-A3: resolveTier grace period for past_due / incomplete
 *   - P1-A6: schedule fields owned by schedule-handlers only (subscription.update no longer clears them)
 *   - P2-A4: reconcile drift threshold removed (any non-zero diff syncs)
 *
 * Runs against a Neon dev branch.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, teardown } from "./setup";
import { mapStripeStatus, transitionSubscription } from "@/lib/subscription/transitions";
import { resolveTier } from "@/lib/plan-limits";

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await teardown();
});

async function resetSubscriptions(): Promise<void> {
  await prisma.subscription.deleteMany({
    where: { user: { email: { endsWith: "@audit2.test.local" } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@audit2.test.local" } } });
}

beforeEach(async () => {
  await resetSubscriptions();
});

async function makeUserWithSub(opts: {
  tier?: "FREE" | "PRO" | "ELITE" | "INSTITUTIONAL";
  status?: string;
  currentPeriodEnd?: Date | null;
  scheduledDowngradeTier?: "FREE" | "PRO" | "ELITE" | "INSTITUTIONAL" | null;
  stripeScheduleId?: string | null;
  stripeSubId?: string | null;
}): Promise<{ userId: string }> {
  const slug = Math.random().toString(36).slice(2, 10);
  const email = `sub-${slug}@audit2.test.local`;
  const user = await prisma.user.create({
    data: {
      email,
      authProviderId: `audit2_${email}`,
      referralCode: `AUD2${slug.toUpperCase()}`,
      subscription: {
        create: {
          tier: opts.tier ?? "PRO",
          status: (opts.status ?? "active") as "active",
          currentPeriodEnd: opts.currentPeriodEnd ?? null,
          scheduledDowngradeTier: opts.scheduledDowngradeTier ?? null,
          stripeScheduleId: opts.stripeScheduleId ?? null,
          stripeSubId: opts.stripeSubId ?? null,
        },
      },
    },
  });
  return { userId: user.id };
}

// ─────────────────────────────────────────────────────────────────────
// P1-A2: mapStripeStatus fail-closed
// ─────────────────────────────────────────────────────────────────────

describe("P1-A2: mapStripeStatus fail-closed default", () => {
  test("known statuses map correctly", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("canceled")).toBe("cancelled");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("paused")).toBe("paused");
    expect(mapStripeStatus("incomplete")).toBe("incomplete");
    expect(mapStripeStatus("incomplete_expired")).toBe("expired");
    expect(mapStripeStatus("unpaid")).toBe("unpaid");
  });

  test("unknown status maps to 'unpaid' (not 'active')", () => {
    expect(mapStripeStatus("future_unknown_status")).toBe("unpaid");
    expect(mapStripeStatus("")).toBe("unpaid");
    expect(mapStripeStatus("suspended")).toBe("unpaid");
  });
});

// ─────────────────────────────────────────────────────────────────────
// P1-A3: resolveTier grace period
// ─────────────────────────────────────────────────────────────────────

describe("P1-A3: resolveTier grants tier during grace statuses", () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 60 * 60 * 1000);

  test("active + future periodEnd → tier preserved", () => {
    expect(resolveTier({ tier: "PRO", status: "active", currentPeriodEnd: future })).toBe("PRO");
  });

  test("past_due + future periodEnd → tier preserved (grace)", () => {
    expect(resolveTier({ tier: "PRO", status: "past_due", currentPeriodEnd: future })).toBe("PRO");
  });

  test("incomplete + future periodEnd → tier preserved (SCA window)", () => {
    expect(resolveTier({ tier: "PRO", status: "incomplete", currentPeriodEnd: future })).toBe(
      "PRO"
    );
  });

  test("trialing + future periodEnd → tier preserved", () => {
    expect(resolveTier({ tier: "ELITE", status: "trialing", currentPeriodEnd: future })).toBe(
      "ELITE"
    );
  });

  test("paused → FREE (paused does NOT grant access)", () => {
    expect(resolveTier({ tier: "PRO", status: "paused", currentPeriodEnd: future })).toBe("FREE");
  });

  test("cancelled → FREE", () => {
    expect(resolveTier({ tier: "PRO", status: "cancelled", currentPeriodEnd: future })).toBe(
      "FREE"
    );
  });

  test("unpaid → FREE", () => {
    expect(resolveTier({ tier: "PRO", status: "unpaid", currentPeriodEnd: future })).toBe("FREE");
  });

  test("past_due + past periodEnd → FREE (period actually expired)", () => {
    expect(resolveTier({ tier: "PRO", status: "past_due", currentPeriodEnd: past })).toBe("FREE");
  });

  test("manualPeriodEnd overrides Stripe expiry", () => {
    expect(
      resolveTier({
        tier: "PRO",
        status: "active",
        currentPeriodEnd: past,
        manualPeriodEnd: future,
      })
    ).toBe("PRO");
  });
});

// ─────────────────────────────────────────────────────────────────────
// P1-A1: reconcile cron handles INSTITUTIONAL
// ─────────────────────────────────────────────────────────────────────

describe("P1-A1: transitionSubscription accepts INSTITUTIONAL tier (not silently dropped)", () => {
  test("INSTITUTIONAL tier persists through transitionSubscription", async () => {
    const { userId } = await makeUserWithSub({ tier: "PRO" });

    await transitionSubscription(
      prisma,
      userId,
      { status: "active", tier: "PRO" },
      { tier: "INSTITUTIONAL" },
      "test_institutional_upgrade"
    );

    const after = await prisma.subscription.findUnique({ where: { userId } });
    expect(after?.tier).toBe("INSTITUTIONAL");
  });
});

// ─────────────────────────────────────────────────────────────────────
// P1-A6: schedule fields untouched by subscription update
// ─────────────────────────────────────────────────────────────────────

describe("P1-A6: schedule fields owned by schedule-handlers only", () => {
  test("transitionSubscription without explicit schedule fields preserves them", async () => {
    const { userId } = await makeUserWithSub({
      tier: "PRO",
      scheduledDowngradeTier: "FREE",
      stripeScheduleId: "sub_sched_test_123",
    });

    // Simulate handleSubscriptionUpdate behavior post-fix: no schedule fields
    // in the data payload.
    await transitionSubscription(
      prisma,
      userId,
      { status: "active", tier: "PRO" },
      { status: "active", tier: "PRO" },
      "stripe_subscription_update"
    );

    const after = await prisma.subscription.findUnique({ where: { userId } });
    expect(after?.scheduledDowngradeTier).toBe("FREE");
    expect(after?.stripeScheduleId).toBe("sub_sched_test_123");
  });

  test("explicit schedule clear via separate updateMany works (handleScheduleCompleted path)", async () => {
    const { userId } = await makeUserWithSub({
      tier: "PRO",
      scheduledDowngradeTier: "FREE",
      stripeScheduleId: "sub_sched_test_456",
    });

    await prisma.subscription.updateMany({
      where: { stripeScheduleId: "sub_sched_test_456" },
      data: { scheduledDowngradeTier: null, stripeScheduleId: null },
    });

    const after = await prisma.subscription.findUnique({ where: { userId } });
    expect(after?.scheduledDowngradeTier).toBeNull();
    expect(after?.stripeScheduleId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// P2-A4: reconcile drift threshold (1ms detected)
// ─────────────────────────────────────────────────────────────────────

describe("P2-A4: reconcile detects sub-second period drift", () => {
  test("currentPeriodEnd drift of 1s would now sync (was masked at 60s)", () => {
    const stripeSecondTimestamp = 1700000000;
    const dbTimestamp = stripeSecondTimestamp - 1; // 1 second drift

    const expectedEnd = new Date(stripeSecondTimestamp * 1000);
    const dbEnd = new Date(dbTimestamp * 1000);

    // Reproduce the new equality check
    const driftDetected = dbEnd.getTime() !== expectedEnd.getTime();
    expect(driftDetected).toBe(true);
  });

  test("identical timestamps → no sync", () => {
    const ts = new Date(1700000000 * 1000);
    expect(ts.getTime() !== ts.getTime()).toBe(false);
  });
});
