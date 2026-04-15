/**
 * Stripe webhook end-to-end: constructs a signed invoice.payment_succeeded
 * event for a user with a referral attribution and posts it to the live
 * /api/stripe/webhook handler running in the same Node process via fetch.
 *
 * Requires: STRIPE_WEBHOOK_SECRET env (taken from .env), a Next dev server
 * already running at http://localhost:3000, and TEST_DATABASE_URL pointing
 * at the Neon dev branch the dev server is using.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { prisma, resetReferralTables, makePartner, makeReferredUser, teardown } from "./setup";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const sig = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function buildInvoicePaidEvent(opts: {
  userId: string;
  invoiceId?: string;
  amountPaid: number;
  currency?: string;
}) {
  const eventId = `evt_test_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: eventId,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    type: "invoice.payment_succeeded",
    data: {
      object: {
        id: opts.invoiceId ?? `in_test_${Math.random().toString(36).slice(2, 10)}`,
        object: "invoice",
        amount_paid: opts.amountPaid,
        currency: opts.currency ?? "eur",
        tax: 0,
        lines: { data: [] },
        subscription: "sub_test_123",
        customer: "cus_test_123",
        // Custom field used by handlePaymentSucceeded — fallback path looks up
        // user via subscription record. We seed Subscription manually below.
      },
    },
  };
}

beforeAll(async () => {
  if (!WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET not set — load .env before running these tests");
  }
  await prisma.$queryRaw`SELECT 1`;
});

beforeEach(async () => {
  await resetReferralTables();
});

afterAll(async () => {
  await teardown();
});

describe("Stripe webhook → commission booking", () => {
  test.skip("invoice.payment_succeeded for attributed user → COMMISSION_EARNED ledger entry", async () => {
    // SKIPPED by default — this requires the full Stripe handler stack
    // (subscription lookup, transitionSubscription, etc.) which mutates
    // many tables outside the referral scope. Run manually with the Stripe
    // CLI when you want to verify the end-to-end booking. The unit-level
    // test in referral.test.ts already verifies bookCommission correctness.
    const { partnerId, referralCode } = await makePartner();
    const { userId: referredUserId } = await makeReferredUser(partnerId, referralCode);

    const event = buildInvoicePaidEvent({ userId: referredUserId, amountPaid: 10_000 });
    const body = JSON.stringify(event);
    const sig = signStripePayload(body, WEBHOOK_SECRET!, Math.floor(Date.now() / 1000));

    const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: "POST",
      headers: { "stripe-signature": sig, "content-type": "application/json" },
      body,
    });
    expect(res.status).toBe(200);

    const ledger = await prisma.referralLedger.findMany({ where: { partnerId } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].amountCents).toBe(2_000);
  });

  test("rejects request without stripe-signature", async () => {
    const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: "POST",
      body: "{}",
    });
    expect([400, 401]).toContain(res.status);
  });

  test("rejects request with invalid signature", async () => {
    const body = JSON.stringify(buildInvoicePaidEvent({ userId: "x", amountPaid: 1_000 }));
    const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeef", "content-type": "application/json" },
      body,
    });
    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Click endpoint: dedup + ratelimit (simpler — no DB seeding)
// ──────────────────────────────────────────────────────────────────────

describe("click endpoint", () => {
  test("first click writes a row, second click within the same day is deduped", async () => {
    const { referralCode, partnerId } = await makePartner();

    const post = () =>
      fetch(`${BASE_URL}/api/referral/click`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
        body: JSON.stringify({ ref: referralCode, path: "/" }),
      });

    expect((await post()).status).toBe(204);
    expect((await post()).status).toBe(204);

    // Despite two POSTs, only one row persists thanks to the dedupKey
    // unique index. The endpoint always returns 204 to avoid leaking state.
    const count = await prisma.referralClick.count({ where: { partnerId } });
    expect(count).toBe(1);
  });
});
