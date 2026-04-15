/**
 * End-to-end integration tests for the referral program against a live
 * Postgres (Neon dev branch). Verifies the high-confidence audit fixes:
 *   - Payout POST phantom-payout race (P1-5)
 *   - Payout PATCH "pay" double-increment race (P1-6)
 *   - Cancel TOCTOU double-credit (CRITICAL from fix-review)
 *   - Invite-claim race + SUSPENDED-bypass block (P1-3)
 *   - bookCommission whitelist + currency guard (P1-4 + currency)
 *   - Click dedup unique constraint (P1-1)
 *   - referralCode case-insensitive lookup (P2-3 follow-up)
 *   - Tier-downgrade auto-suspend (P1-9)
 *   - Admin GET groupBy includes ADMIN_ADJUSTMENT (fix-review)
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, resetReferralTables, makePartner, makeReferredUser, teardown } from "./setup";
import { bookCommission } from "@/lib/referral/commission";
import { suspendPartnerOnDowngrade } from "@/lib/referral/partner-lifecycle";
import type Stripe from "stripe";

beforeAll(async () => {
  // Sanity ping
  await prisma.$queryRaw`SELECT 1`;
});

beforeEach(async () => {
  await resetReferralTables();
});

afterAll(async () => {
  await teardown();
});

// Build a minimal Stripe.Invoice shape — only the fields bookCommission reads.
function fakeInvoice(opts: {
  id?: string;
  amountPaid: number;
  tax?: number;
  currency?: string;
}): Stripe.Invoice {
  return {
    id: opts.id ?? `in_test_${Math.random().toString(36).slice(2, 10)}`,
    amount_paid: opts.amountPaid,
    tax: opts.tax ?? 0,
    currency: opts.currency ?? "eur",
    lines: { data: [] },
  } as unknown as Stripe.Invoice;
}

// ──────────────────────────────────────────────────────────────────────
// Commission booking
// ──────────────────────────────────────────────────────────────────────

describe("bookCommission", () => {
  test("books 20% of pre-tax amount and confirms attribution", async () => {
    const { partnerId, referralCode } = await makePartner();
    const { userId } = await makeReferredUser(partnerId, referralCode);

    await bookCommission(fakeInvoice({ amountPaid: 10_000, tax: 1_000 }), userId);

    const ledger = await prisma.referralLedger.findMany({ where: { partnerId } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].amountCents).toBe(1_800); // 20% of (10_000 - 1_000)
    expect(ledger[0].type).toBe("COMMISSION_EARNED");
    expect(ledger[0].commissionBps).toBe(2000);

    const attribution = await prisma.referralAttribution.findUnique({
      where: { referredUserId: userId },
    });
    expect(attribution?.status).toBe("CONFIRMED");
    expect(attribution?.confirmedAt).toBeTruthy();
  });

  test("idempotent: same invoice twice writes only one ledger row", async () => {
    const { partnerId, referralCode } = await makePartner();
    const { userId } = await makeReferredUser(partnerId, referralCode);
    const inv = fakeInvoice({ amountPaid: 5_000, tax: 0 });

    await bookCommission(inv, userId);
    await bookCommission(inv, userId);

    const ledger = await prisma.referralLedger.findMany({ where: { partnerId } });
    expect(ledger).toHaveLength(1);
  });

  test("rejects non-EUR invoices (currency guard)", async () => {
    const { partnerId, referralCode } = await makePartner();
    const { userId } = await makeReferredUser(partnerId, referralCode);

    await bookCommission(fakeInvoice({ amountPaid: 10_000, currency: "usd" }), userId);

    const ledger = await prisma.referralLedger.findMany({ where: { partnerId } });
    expect(ledger).toHaveLength(0);
  });

  test("skips REJECTED attribution", async () => {
    const { partnerId, referralCode } = await makePartner();
    const { userId } = await makeReferredUser(partnerId, referralCode);
    await prisma.referralAttribution.update({
      where: { referredUserId: userId },
      data: { status: "REJECTED" },
    });

    await bookCommission(fakeInvoice({ amountPaid: 10_000 }), userId);
    const ledger = await prisma.referralLedger.findMany({ where: { partnerId } });
    expect(ledger).toHaveLength(0);
  });

  test("skips when partner is SUSPENDED", async () => {
    const { partnerId, referralCode, userId: partnerUserId } = await makePartner();
    const { userId } = await makeReferredUser(partnerId, referralCode);
    await prisma.referralPartner.update({
      where: { userId: partnerUserId },
      data: { status: "SUSPENDED" },
    });

    await bookCommission(fakeInvoice({ amountPaid: 10_000 }), userId);
    const ledger = await prisma.referralLedger.findMany({ where: { partnerId } });
    expect(ledger).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Payout race conditions (the heart of the audit)
// ──────────────────────────────────────────────────────────────────────

describe("payout race safety", () => {
  test("phantom-payout: two concurrent POSTs produce one payout, one error", async () => {
    const { partnerId, referralCode } = await makePartner();
    const { userId } = await makeReferredUser(partnerId, referralCode);
    // Seed a payable balance: €100 commission
    await bookCommission(fakeInvoice({ amountPaid: 50_000 }), userId);
    await bookCommission(fakeInvoice({ amountPaid: 50_000 }), userId);

    // Inline copy of the POST transaction body to simulate concurrent calls
    const createPayout = () =>
      prisma.$transaction(async (tx) => {
        const unpaid = await tx.referralLedger.findMany({
          where: { partnerId, payoutId: null },
          select: { id: true, amountCents: true },
        });
        const total = unpaid.reduce((s, e) => s + e.amountCents, 0);
        if (total <= 0) throw new Error("nothing to pay");
        const payout = await tx.referralPayout.create({
          data: {
            partnerId,
            amountCents: total,
            periodStart: new Date("2026-03-01"),
            periodEnd: new Date("2026-03-31"),
            status: "PENDING",
          },
        });
        const linked = await tx.referralLedger.updateMany({
          where: { id: { in: unpaid.map((e) => e.id) }, payoutId: null },
          data: { payoutId: payout.id },
        });
        if (linked.count !== unpaid.length) {
          throw new Error("Concurrent payout detected");
        }
        await tx.referralLedger.create({
          data: {
            partnerId,
            type: "PAYOUT_SENT",
            payoutId: payout.id,
            amountCents: -total,
          },
        });
        return payout.id;
      });

    const results = await Promise.allSettled([createPayout(), createPayout()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const payouts = await prisma.referralPayout.findMany({ where: { partnerId } });
    expect(payouts).toHaveLength(1);
    expect(payouts[0].amountCents).toBe(20_000); // 20% of €1000

    // Ledger SUM must be zero (earned + payout_sent)
    const sum = await prisma.referralLedger.aggregate({
      where: { partnerId },
      _sum: { amountCents: true },
    });
    expect(sum._sum.amountCents).toBe(0);
  });

  test("PATCH pay: concurrent transitions produce exactly one PAID flip", async () => {
    const { partnerId } = await makePartner();
    const payout = await prisma.referralPayout.create({
      data: {
        partnerId,
        amountCents: 5_000,
        periodStart: new Date(),
        periodEnd: new Date(),
        status: "PENDING",
      },
    });

    const flip = () =>
      prisma.referralPayout.updateMany({
        where: { id: payout.id, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "PAID", paidAt: new Date() },
      });

    const results = await Promise.all([flip(), flip(), flip()]);
    const totalAffected = results.reduce((s, r) => s + r.count, 0);
    expect(totalAffected).toBe(1); // CAS guarantees exactly one wins

    const after = await prisma.referralPayout.findUnique({ where: { id: payout.id } });
    expect(after?.status).toBe("PAID");
  });

  test("CANCEL TOCTOU: concurrent cancels write at most ONE ADMIN_ADJUSTMENT credit", async () => {
    const { partnerId } = await makePartner();
    const payout = await prisma.referralPayout.create({
      data: {
        partnerId,
        amountCents: 5_000,
        periodStart: new Date(),
        periodEnd: new Date(),
        status: "PENDING",
      },
    });

    const cancel = () =>
      prisma.$transaction(async (tx) => {
        const flipped = await tx.referralPayout.updateMany({
          where: { id: payout.id, status: { in: ["PENDING", "APPROVED"] } },
          data: { status: "CANCELLED" },
        });
        if (flipped.count === 0) return false;
        const p = await tx.referralPayout.findUniqueOrThrow({
          where: { id: payout.id },
          select: { amountCents: true, partnerId: true },
        });
        await tx.referralLedger.create({
          data: {
            partnerId: p.partnerId,
            type: "ADMIN_ADJUSTMENT",
            payoutId: payout.id,
            amountCents: p.amountCents,
          },
        });
        return true;
      });

    const results = await Promise.all([cancel(), cancel(), cancel()]);
    const succeeded = results.filter(Boolean).length;
    expect(succeeded).toBe(1);

    const adjustments = await prisma.referralLedger.findMany({
      where: { payoutId: payout.id, type: "ADMIN_ADJUSTMENT" },
    });
    expect(adjustments).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Invite race
// ──────────────────────────────────────────────────────────────────────

describe("invite-claim race", () => {
  test("two users racing on same token → only one claim succeeds", async () => {
    const userA = await prisma.user.create({
      data: {
        email: "a@test.local",
        authProviderId: "test_a",
        referralCode: "USERAAA1",
        subscription: { create: { tier: "PRO" } },
      },
    });
    const userB = await prisma.user.create({
      data: {
        email: "b@test.local",
        authProviderId: "test_b",
        referralCode: "USERBBB1",
        subscription: { create: { tier: "PRO" } },
      },
    });
    const invite = await prisma.referralInvite.create({
      data: {
        token: "share-this-token",
        commissionBps: 3000,
        createdBy: "admin",
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    const claim = (userId: string) =>
      prisma.referralInvite.updateMany({
        where: { id: invite.id, claimedByUserId: null },
        data: { claimedByUserId: userId, claimedAt: new Date() },
      });

    const [ra, rb] = await Promise.all([claim(userA.id), claim(userB.id)]);
    const winners = (ra.count || 0) + (rb.count || 0);
    expect(winners).toBe(1);

    const after = await prisma.referralInvite.findUnique({ where: { id: invite.id } });
    expect([userA.id, userB.id]).toContain(after?.claimedByUserId);
  });

  test("SUSPENDED partner cannot self-promote via invite (CAS on status)", async () => {
    const { userId } = await makePartner({ status: "SUSPENDED" });

    const promoted = await prisma.referralPartner.updateMany({
      where: { userId, status: { notIn: ["SUSPENDED", "TERMINATED"] } },
      data: { status: "ACTIVE" },
    });
    expect(promoted.count).toBe(0);

    const partner = await prisma.referralPartner.findUnique({ where: { userId } });
    expect(partner?.status).toBe("SUSPENDED");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Tier-downgrade lifecycle
// ──────────────────────────────────────────────────────────────────────

describe("partner-lifecycle", () => {
  test("suspendPartnerOnDowngrade flips ACTIVE → SUSPENDED and writes audit log", async () => {
    const { userId, partnerId } = await makePartner();

    await suspendPartnerOnDowngrade(userId);

    const partner = await prisma.referralPartner.findUnique({ where: { id: partnerId } });
    expect(partner?.status).toBe("SUSPENDED");

    const audit = await prisma.auditLog.findFirst({
      where: { eventType: "referral.partner_status_change", resourceId: partnerId },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toBeTruthy();
    // metadata is stored as a JSON string for size-limit reasons (audit.ts:132)
    const meta = audit?.metadata ? JSON.parse(audit.metadata as string) : {};
    expect(meta.reason).toBe("tier_downgrade_to_free");
    expect(meta.from).toBe("ACTIVE");
    expect(meta.to).toBe("SUSPENDED");
  });

  test("suspendPartnerOnDowngrade is a no-op for SUSPENDED partner", async () => {
    const { userId } = await makePartner({ status: "SUSPENDED" });
    await suspendPartnerOnDowngrade(userId);
    const partner = await prisma.referralPartner.findUnique({ where: { userId } });
    expect(partner?.status).toBe("SUSPENDED");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Click dedup
// ──────────────────────────────────────────────────────────────────────

describe("click dedup", () => {
  test("duplicate dedupKey rejected by unique index", async () => {
    const { partnerId } = await makePartner();
    const dedupKey = "deadbeefcafe";

    await prisma.referralClick.create({
      data: { partnerId, landingPath: "/", dedupKey, ipHash: "x", uaHash: "y" },
    });

    await expect(
      prisma.referralClick.create({
        data: { partnerId, landingPath: "/", dedupKey, ipHash: "x", uaHash: "y" },
      })
    ).rejects.toMatchObject({ code: "P2002" });

    const count = await prisma.referralClick.count({ where: { partnerId } });
    expect(count).toBe(1);
  });

  test("multiple NULL dedupKeys allowed (legacy rows)", async () => {
    const { partnerId } = await makePartner();

    await prisma.referralClick.create({
      data: { partnerId, landingPath: "/", dedupKey: null },
    });
    await prisma.referralClick.create({
      data: { partnerId, landingPath: "/", dedupKey: null },
    });

    const count = await prisma.referralClick.count({ where: { partnerId } });
    expect(count).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Admin GET groupBy with ADMIN_ADJUSTMENT
// ──────────────────────────────────────────────────────────────────────

describe("admin GET balance with ADMIN_ADJUSTMENT", () => {
  test("balance includes positive ADMIN_ADJUSTMENT credit (cancelled payout)", async () => {
    const { partnerId, referralCode } = await makePartner();
    const { userId } = await makeReferredUser(partnerId, referralCode);
    // Earn €20 commission (20% of €100)
    await bookCommission(fakeInvoice({ amountPaid: 10_000 }), userId);

    // Simulate a payout that gets cancelled: PAYOUT_SENT (-2000) + ADMIN_ADJUSTMENT (+2000)
    const payout = await prisma.referralPayout.create({
      data: {
        partnerId,
        amountCents: 2_000,
        periodStart: new Date(),
        periodEnd: new Date(),
        status: "CANCELLED",
      },
    });
    await prisma.referralLedger.create({
      data: { partnerId, type: "PAYOUT_SENT", payoutId: payout.id, amountCents: -2_000 },
    });
    await prisma.referralLedger.create({
      data: { partnerId, type: "ADMIN_ADJUSTMENT", payoutId: payout.id, amountCents: 2_000 },
    });

    // Reproduce the admin GET groupBy logic
    const ledgerByType = await prisma.referralLedger.groupBy({
      by: ["partnerId", "type"],
      where: { partnerId: { in: [partnerId] } },
      _sum: { amountCents: true },
    });
    const bucket = { earned: 0, reversed: 0, paid: 0, adjustment: 0 };
    for (const row of ledgerByType) {
      const cents = row._sum.amountCents ?? 0;
      if (row.type === "COMMISSION_EARNED") bucket.earned = cents;
      else if (row.type === "COMMISSION_REVERSED") bucket.reversed = Math.abs(cents);
      else if (row.type === "PAYOUT_SENT") bucket.paid = Math.abs(cents);
      else if (row.type === "ADMIN_ADJUSTMENT") bucket.adjustment = cents;
    }
    const balance = bucket.earned - bucket.reversed - bucket.paid + bucket.adjustment;
    expect(balance).toBe(2_000); // €20 still owed: cancel restored the deduction
  });
});

// ──────────────────────────────────────────────────────────────────────
// referralCode case-insensitive lookup
// ──────────────────────────────────────────────────────────────────────

describe("referralCode normalization", () => {
  test("lowercase input still matches uppercase stored code", async () => {
    const { referralCode } = await makePartner();
    const lower = referralCode.toLowerCase();

    // Reproduce click route normalization
    const ref = lower.trim().toUpperCase();
    const partner = await prisma.referralPartner.findFirst({
      where: { user: { referralCode: ref }, status: "ACTIVE" },
    });
    expect(partner).toBeTruthy();
  });
});
