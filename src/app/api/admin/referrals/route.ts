import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";

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

  // Compute real balances from ledger for each partner
  const data = await Promise.all(
    partners.map(async (p) => {
      const earned = await prisma.referralLedger.aggregate({
        where: { partnerId: p.id, type: "COMMISSION_EARNED" },
        _sum: { amountCents: true },
      });
      const reversed = await prisma.referralLedger.aggregate({
        where: { partnerId: p.id, type: "COMMISSION_REVERSED" },
        _sum: { amountCents: true },
      });
      const paid = await prisma.referralLedger.aggregate({
        where: { partnerId: p.id, type: "PAYOUT_SENT" },
        _sum: { amountCents: true },
      });

      const totalEarnedCents = earned._sum.amountCents ?? 0;
      const totalReversedCents = Math.abs(reversed._sum.amountCents ?? 0);
      const totalPaidCents = Math.abs(paid._sum.amountCents ?? 0);
      const unpaidBalanceCents = totalEarnedCents - totalReversedCents - totalPaidCents;

      return {
        id: p.id,
        email: p.user.email,
        referralCode: p.user.referralCode,
        status: p.status,
        commissionBps: p.commissionBps,
        payoutEmail: p.payoutEmail,
        clicks: p._count.clicks,
        attributions: p._count.attributions,
        totalEarnedCents,
        totalReversedCents,
        totalPaidCents,
        unpaidBalanceCents,
        createdAt: p.createdAt.toISOString(),
      };
    })
  );

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

  const partner = await prisma.referralPartner.update({
    where: { id: partnerId },
    data: {
      ...(status ? { status } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {}),
      ...(newCommissionBps !== undefined ? { commissionBps: newCommissionBps } : {}),
    },
    select: { id: true, status: true, commissionBps: true, userId: true },
  });

  return NextResponse.json({
    partner: {
      ...partner,
      commissionPct: partner.commissionBps / 100,
    },
  });
}
