import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      { error: "Live EA monitoring requires a Pro or Elite subscription" },
      { status: 403 }
    );
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Aggregate PnL by date in SQL instead of loading all trades into memory
  const dailyPnl = await prisma.$queryRaw<Array<{ date: string; pnl: number }>>`
    SELECT
      DATE("closeTime") AS date,
      ROUND(CAST(SUM(profit) AS numeric), 2) AS pnl
    FROM "EATrade"
    WHERE "instanceId" IN (
      SELECT id FROM "LiveEAInstance"
      WHERE "userId" = ${session.user.id} AND "deletedAt" IS NULL
    )
    AND "closeTime" IS NOT NULL
    AND "closeTime" >= ${ninetyDaysAgo}
    GROUP BY DATE("closeTime")
    ORDER BY date ASC
  `;

  // Format dates as ISO date strings
  const formatted = dailyPnl.map((row) => ({
    date: typeof row.date === "string" ? row.date : new Date(row.date).toISOString().split("T")[0],
    pnl: Number(row.pnl),
  }));

  return NextResponse.json({ dailyPnl: formatted });
}
