import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { logAuditEvent, getAuditContext } from "@/lib/audit";
import { MIN_PAYOUT_CENTS } from "@/lib/referral/constants";

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

  // Resolve session + audit context up-front so a post-commit failure here
  // cannot turn a successfully-created payout into an HTTP 400 (which would
  // tempt the caller to retry and double-create).
  const session = await auth();
  const auditCtxPost = getAuditContext(request);

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
      if (totalCents < MIN_PAYOUT_CENTS) {
        throw new Error(
          `Below minimum payout threshold (€${(MIN_PAYOUT_CENTS / 100).toFixed(2)}). Current balance: €${(totalCents / 100).toFixed(2)}. Wait until the partner accumulates at least the minimum before issuing a SEPA payout.`
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

      // Link unpaid entries (makes composition immutable). The `payoutId:
      // null` filter is the compare-and-swap that prevents a phantom payout
      // when two POSTs race: the second tx will update 0 rows (entries are
      // already claimed by the first tx) and we abort instead of creating an
      // empty payout with a hanging PAYOUT_SENT entry.
      const linked = await tx.referralLedger.updateMany({
        where: { id: { in: unpaidEntries.map((e) => e.id) }, payoutId: null },
        data: { payoutId: payout.id },
      });
      if (linked.count !== unpaidEntries.length) {
        throw new Error(
          `Concurrent payout detected: claimed ${linked.count}/${unpaidEntries.length} entries`
        );
      }

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

    // Audit is best-effort: the payout commit already happened, so we do
    // NOT let an audit write turn the response into a 400.
    void logAuditEvent({
      userId: session?.user?.id ?? null,
      eventType: "referral.payout_create",
      resourceType: "referral_payout",
      resourceId: payoutId,
      metadata: {
        partnerId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
      ...auditCtxPost,
    }).catch(() => {
      // logAuditEvent already logs internally on failure
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

  const auditCtx = getAuditContext(request);

  if (action === "approve") {
    await prisma.referralPayout.update({
      where: { id: payoutId },
      data: {
        status: "APPROVED",
        approvedBy: session?.user?.id ?? null,
        approvedAt: new Date(),
      },
    });
    await logAuditEvent({
      userId: session?.user?.id ?? null,
      eventType: "referral.payout_approve",
      resourceType: "referral_payout",
      resourceId: payoutId,
      ...auditCtx,
    });
  } else if (action === "pay") {
    // Compare-and-swap on prior status so concurrent PATCH "pay" calls don't
    // both transition (and otherwise both increment counters). The
    // `totalPaidCents` cached aggregate is intentionally NOT incremented
    // here — every reader (admin GET, partner stats) recomputes from the
    // ledger SUM, so the cache was unused and a source of drift.
    const result = await prisma.referralPayout.updateMany({
      where: { id: payoutId, status: { in: ["PENDING", "APPROVED"] } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidReference: paidReference ?? null,
      },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: "Payout is not in a payable state (must be PENDING or APPROVED)" },
        { status: 409 }
      );
    }
    await logAuditEvent({
      userId: session?.user?.id ?? null,
      eventType: "referral.payout_pay",
      resourceType: "referral_payout",
      resourceId: payoutId,
      metadata: { paidReference: paidReference ?? null },
      ...auditCtx,
    });
  } else if (action === "cancel") {
    // Append-only: reverse via ADMIN_ADJUSTMENT instead of deleting. The
    // status flip is the compare-and-swap that prevents two concurrent
    // cancels both writing reversing entries (which would credit the
    // partner twice). We only know amountCents/partnerId after the CAS
    // succeeds, so the read happens inside the transaction post-flip.
    let cancelled = true;
    try {
      await prisma.$transaction(async (tx) => {
        const flip = await tx.referralPayout.updateMany({
          where: { id: payoutId, status: { in: ["PENDING", "APPROVED"] } },
          data: { status: "CANCELLED" },
        });
        if (flip.count === 0) {
          cancelled = false;
          return;
        }
        const payout = await tx.referralPayout.findUniqueOrThrow({
          where: { id: payoutId },
          select: { amountCents: true, partnerId: true },
        });
        // Unlink ledger entries so they re-enter the unpaid pool
        await tx.referralLedger.updateMany({
          where: { payoutId, type: { not: "PAYOUT_SENT" } },
          data: { payoutId: null },
        });
        // Add reversing entry (restores balance, preserves audit trail)
        await tx.referralLedger.create({
          data: {
            partnerId: payout.partnerId,
            type: "ADMIN_ADJUSTMENT",
            payoutId,
            amountCents: payout.amountCents,
            description: `Payout ${payoutId} cancelled`,
          },
        });
      });
    } catch (err) {
      throw err;
    }
    if (!cancelled) {
      return NextResponse.json(
        { error: "Payout is not in a cancellable state (must be PENDING or APPROVED)" },
        { status: 409 }
      );
    }
    await logAuditEvent({
      userId: session?.user?.id ?? null,
      eventType: "referral.payout_cancel",
      resourceType: "referral_payout",
      resourceId: payoutId,
      ...auditCtx,
    });
  }

  return NextResponse.json({ success: true });
}
