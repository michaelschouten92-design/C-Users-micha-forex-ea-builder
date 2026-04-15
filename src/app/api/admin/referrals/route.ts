import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { logAuditEvent, getAuditContext } from "@/lib/audit";

/**
 * GET: List all referral partners with stats.
 * PATCH: Update partner status (approve, suspend, terminate).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  const partners = await prisma.referralPartner.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, referralCode: true } },
      _count: {
        select: {
          clicks: true,
          attributions: true,
          ledger: true,
        },
      },
    },
  });

  // Single groupBy across all partners replaces the old per-partner triple
  // aggregate (was 3×N round-trips for an admin list view).
  const partnerIds = partners.map((p) => p.id);
  const ledgerByType =
    partnerIds.length === 0
      ? []
      : await prisma.referralLedger.groupBy({
          by: ["partnerId", "type"],
          where: { partnerId: { in: partnerIds } },
          _sum: { amountCents: true },
        });

  // Per-partner buckets. `adjustment` carries any ADMIN_ADJUSTMENT entries —
  // most importantly the positive credit written when a payout is cancelled,
  // which would otherwise silently disappear from the displayed balance.
  const sums = new Map<
    string,
    { earned: number; reversed: number; paid: number; adjustment: number }
  >();
  for (const id of partnerIds) sums.set(id, { earned: 0, reversed: 0, paid: 0, adjustment: 0 });
  for (const row of ledgerByType) {
    const cents = row._sum.amountCents ?? 0;
    const bucket = sums.get(row.partnerId);
    if (!bucket) continue;
    if (row.type === "COMMISSION_EARNED") bucket.earned = cents;
    else if (row.type === "COMMISSION_REVERSED") bucket.reversed = Math.abs(cents);
    else if (row.type === "PAYOUT_SENT") bucket.paid = Math.abs(cents);
    else if (row.type === "ADMIN_ADJUSTMENT") bucket.adjustment = cents; // signed
  }

  const data = partners.map((p) => {
    const s = sums.get(p.id) ?? { earned: 0, reversed: 0, paid: 0, adjustment: 0 };
    return {
      id: p.id,
      email: p.user.email,
      referralCode: p.user.referralCode,
      status: p.status,
      commissionBps: p.commissionBps,
      payoutEmail: p.payoutEmail,
      clicks: p._count.clicks,
      attributions: p._count.attributions,
      totalEarnedCents: s.earned,
      totalReversedCents: s.reversed,
      totalPaidCents: s.paid,
      unpaidBalanceCents: s.earned - s.reversed - s.paid + s.adjustment,
      createdAt: p.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const body = await request.json();
  const { partnerId, status, adminNotes, commissionBps } = body;

  if (!partnerId) {
    return NextResponse.json({ error: "partnerId required" }, { status: 400 });
  }

  if (status) {
    const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // commissionPct: percentage (e.g. 20 = 20%), stored as basis points internally
  const commissionPct = body.commissionPct;
  let newCommissionBps: number | undefined;
  if (commissionPct !== undefined) {
    if (typeof commissionPct !== "number" || commissionPct < 0 || commissionPct > 100) {
      return NextResponse.json(
        { error: "commissionPct must be between 0 and 100" },
        { status: 400 }
      );
    }
    newCommissionBps = Math.round(commissionPct * 100);
  }

  // Snapshot prior values so the audit metadata captures the actual change.
  const prior = await prisma.referralPartner.findUnique({
    where: { id: partnerId },
    select: { status: true, commissionBps: true },
  });

  const partner = await prisma.referralPartner.update({
    where: { id: partnerId },
    data: {
      ...(status ? { status } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {}),
      ...(newCommissionBps !== undefined ? { commissionBps: newCommissionBps } : {}),
    },
    select: { id: true, status: true, commissionBps: true, userId: true },
  });

  const session = await auth();
  const auditCtx = getAuditContext(request);
  if (status && prior?.status !== status) {
    await logAuditEvent({
      userId: session?.user?.id ?? null,
      eventType: "referral.partner_status_change",
      resourceType: "referral_partner",
      resourceId: partnerId,
      metadata: { from: prior?.status ?? null, to: status, adminNotes: adminNotes ?? null },
      ...auditCtx,
    });
  }
  if (newCommissionBps !== undefined && prior?.commissionBps !== newCommissionBps) {
    await logAuditEvent({
      userId: session?.user?.id ?? null,
      eventType: "referral.partner_commission_change",
      resourceType: "referral_partner",
      resourceId: partnerId,
      metadata: { fromBps: prior?.commissionBps ?? null, toBps: newCommissionBps },
      ...auditCtx,
    });
  }

  return NextResponse.json({
    partner: {
      ...partner,
      commissionPct: partner.commissionBps / 100,
    },
  });
}
