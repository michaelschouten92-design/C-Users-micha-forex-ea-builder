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
  const { partnerId, status, adminNotes } = body;

  if (!partnerId || !status) {
    return NextResponse.json({ error: "partnerId and status required" }, { status: 400 });
  }

  const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const partner = await prisma.referralPartner.update({
    where: { id: partnerId },
    data: {
      status,
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    },
    select: { id: true, status: true, userId: true },
  });

  return NextResponse.json({ partner });
}
