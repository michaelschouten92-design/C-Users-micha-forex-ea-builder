import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: Partner dashboard stats (clicks, signups, earnings).
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partner = await prisma.referralPartner.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true, commissionBps: true },
  });

  if (!partner) {
    return NextResponse.json({ error: "Not a partner" }, { status: 404 });
  }

  // Clicks (last 30 days + total)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalClicks, recentClicks] = await Promise.all([
    prisma.referralClick.count({ where: { partnerId: partner.id } }),
    prisma.referralClick.count({
      where: { partnerId: partner.id, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  // Attributions
  const attributions = await prisma.referralAttribution.groupBy({
    by: ["status"],
    where: { partnerId: partner.id },
    _count: true,
  });
  const signups = attributions.reduce((sum, a) => sum + a._count, 0);
  const confirmed = attributions.find((a) => a.status === "CONFIRMED")?._count ?? 0;

  // Earnings from ledger (truth, not cached)
  const earnings = await prisma.referralLedger.aggregate({
    where: { partnerId: partner.id, type: "COMMISSION_EARNED" },
    _sum: { amountCents: true },
  });
  const reversals = await prisma.referralLedger.aggregate({
    where: { partnerId: partner.id, type: "COMMISSION_REVERSED" },
    _sum: { amountCents: true },
  });
  const payouts = await prisma.referralLedger.aggregate({
    where: { partnerId: partner.id, type: "PAYOUT_SENT" },
    _sum: { amountCents: true },
  });

  const totalEarnedCents = earnings._sum.amountCents ?? 0;
  const totalReversedCents = Math.abs(reversals._sum.amountCents ?? 0);
  const totalPaidCents = Math.abs(payouts._sum.amountCents ?? 0);
  const netEarnedCents = totalEarnedCents - totalReversedCents;
  const unpaidBalanceCents = netEarnedCents - totalPaidCents;

  return NextResponse.json({
    status: partner.status,
    commissionBps: partner.commissionBps,
    clicks: { total: totalClicks, last30Days: recentClicks },
    signups,
    confirmedCustomers: confirmed,
    totalEarnedCents,
    totalReversedCents,
    netEarnedCents,
    totalPaidCents,
    unpaidBalanceCents,
  });
}
