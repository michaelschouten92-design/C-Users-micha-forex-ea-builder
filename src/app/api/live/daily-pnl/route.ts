import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const trades = await prisma.eATrade.findMany({
    where: {
      instance: { userId: session.user.id, deletedAt: null },
      closeTime: { not: null, gte: ninetyDaysAgo },
    },
    select: { profit: true, closeTime: true },
    orderBy: { closeTime: "asc" },
  });

  // Aggregate by date
  const dailyMap = new Map<string, number>();
  for (const trade of trades) {
    if (!trade.closeTime) continue;
    const dateKey = trade.closeTime.toISOString().split("T")[0];
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + trade.profit);
  }

  const dailyPnl = Array.from(dailyMap.entries())
    .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ dailyPnl });
}
