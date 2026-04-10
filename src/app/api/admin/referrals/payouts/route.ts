import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";

/**
 * Minimum payout threshold — matches Terms §10.3 (€50 minimum per SEPA
 * transfer). Prevents accidental micro-payouts that would cost more in
 * SEPA transfer fees than the amount itself.
 */
const MINIMUM_PAYOUT_CENTS = 5000;

/**
 * GET: List payouts (optionally filtered by status).
 * POST: Create a payout batch for a partner.
 * PATCH: Approve or mark a payout as paid.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const partnerId = request.nextUrl.searchParams.get("partnerId") ?? undefined;

  const payouts = await prisma.referralPayout.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(partnerId ? { partnerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      partner: {
        include: { user: { select: { email: true } } },
      },
    },
    take: 100,
  });

  return NextResponse.json({
    data: payouts.map((p) => ({
      id: p.id,
      partnerId: p.partnerId,
      partnerEmail: p.partner.user.email,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      approvedBy: p.approvedBy,
      approvedAt: p.approvedAt?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      paidReference: p.paidReference,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const body = await request.json();
  const { partnerId } = body;

  if (!partnerId) {
    return NextResponse.json({ error: "partnerId required" }, { status: 400 });
  }

  // Period is the previous calendar month, computed in UTC so the audit
  // trail stays stable regardless of the host timezone (Vercel defaults to
  // UTC today, but the previous implementation used server-local time which
  // would silently shift period boundaries if the process TZ ever changed).
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));

  try {
    const payoutId = await prisma.$transaction(async (tx) => {
      // Find all unpaid ledger entries
      const unpaidEntries = await tx.referralLedger.findMany({
        where: { partnerId, payoutId: null },
        select: { id: true, amountCents: true },
      });

      const totalCents = unpaidEntries.reduce((sum, e) => sum + e.amountCents, 0);
      if (totalCents <= 0) {
        throw new Error("No positive balance to pay out");
      }
      if (totalCents < MINIMUM_PAYOUT_CENTS) {
        throw new Error(
          `Below minimum payout threshold (€${(MINIMUM_PAYOUT_CENTS / 100).toFixed(2)}). Current balance: €${(totalCents / 100).toFixed(2)}. Wait until the partner accumulates at least the minimum before issuing a SEPA payout.`
        );
      }

      // Create payout
      const payout = await tx.referralPayout.create({
        data: {
          partnerId,
          amountCents: totalCents,
          periodStart,
          periodEnd,
          status: "PENDING",
        },
      });

      // Link unpaid entries (makes composition immutable)
      await tx.referralLedger.updateMany({
        where: { id: { in: unpaidEntries.map((e) => e.id) } },
        data: { payoutId: payout.id },
      });

      // Create PAYOUT_SENT ledger entry
      await tx.referralLedger.create({
        data: {
          partnerId,
          type: "PAYOUT_SENT",
          payoutId: payout.id,
          amountCents: -totalCents,
          description: `Payout batch ${payout.id}`,
        },
      });

      return payout.id;
    });

    return NextResponse.json({ payoutId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const session = await auth();
  const body = await request.json();
  const { payoutId, action, paidReference } = body;

  if (!payoutId || !action) {
    return NextResponse.json({ error: "payoutId and action required" }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.referralPayout.update({
      where: { id: payoutId },
      data: {
        status: "APPROVED",
        approvedBy: session?.user?.id ?? null,
        approvedAt: new Date(),
      },
    });
  } else if (action === "pay") {
    await prisma.referralPayout.update({
      where: { id: payoutId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidReference: paidReference ?? null,
      },
    });

    // Update cached aggregate on partner
    const payout = await prisma.referralPayout.findUnique({
      where: { id: payoutId },
      select: { partnerId: true, amountCents: true },
    });
    if (payout) {
      await prisma.referralPartner.update({
        where: { id: payout.partnerId },
        data: { totalPaidCents: { increment: payout.amountCents } },
      });
    }
  } else if (action === "cancel") {
    // Guard: only PENDING or APPROVED payouts can be cancelled
    const existing = await prisma.referralPayout.findUnique({
      where: { id: payoutId },
      select: { status: true, amountCents: true, partnerId: true },
    });
    if (!existing || existing.status === "PAID" || existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot cancel a ${existing?.status ?? "unknown"} payout` },
        { status: 400 }
      );
    }

    // Append-only: create a reversing PAYOUT_CANCELLED entry instead of deleting
    await prisma.$transaction(async (tx) => {
      // Unlink ledger entries so they re-enter the unpaid pool
      await tx.referralLedger.updateMany({
        where: { payoutId, type: { not: "PAYOUT_SENT" } },
        data: { payoutId: null },
      });
      // Add reversing entry (restores balance, preserves audit trail)
      await tx.referralLedger.create({
        data: {
          partnerId: existing.partnerId,
          type: "ADMIN_ADJUSTMENT",
          payoutId,
          amountCents: existing.amountCents, // positive: restores the deducted amount
          description: `Payout ${payoutId} cancelled`,
        },
      });
      await tx.referralPayout.update({
        where: { id: payoutId },
        data: { status: "CANCELLED" },
      });
    });
  }

  return NextResponse.json({ success: true });
}
