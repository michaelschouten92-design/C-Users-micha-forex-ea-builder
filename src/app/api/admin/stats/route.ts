import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { TIER_MRR_PRICES } from "@/lib/plans";

// GET /api/admin/stats - Aggregated dashboard statistics
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 86_400_000);
    const oneDayAgo = new Date(now - 86_400_000);

    const [
      tierCounts,
      paidSubscriptions,
      signupsRaw,
      webhookCount,
      cancelledCount,
      totalSubCount,
      liveStrategyCount,
    ] = await Promise.all([
      // 1. Users grouped by tier
      prisma.subscription.groupBy({
        by: ["tier"],
        _count: true,
      }),
      // 2. Active paid subscriptions for MRR (exclude manual grants without Stripe)
      prisma.subscription.findMany({
        where: {
          status: { in: ["active", "trialing"] },
          tier: { not: "FREE" },
          stripeSubId: { not: null },
        },
        select: { tier: true },
      }),
      // 3. Signups per day (last 30 days)
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT DATE("createdAt") as date, CAST(COUNT(*) AS INTEGER) as count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      // 4. Webhook health (last 24h)
      prisma.webhookEvent.count({
        where: { processedAt: { gte: oneDayAgo } },
      }),
      // 5. Cancelled subscriptions
      prisma.subscription.count({
        where: { status: "cancelled" },
      }),
      // 6. Total subscriptions
      prisma.subscription.count(),
      // 7. Live strategies (instances with symbol, actively monitored)
      prisma.liveEAInstance.count({
        where: { deletedAt: null, symbol: { not: null } },
      }),
    ]);

    // Calculate MRR
    const mrr = paidSubscriptions.reduce((sum, sub) => {
      return sum + (TIER_MRR_PRICES[sub.tier] || 0);
    }, 0);

    // Format tier counts
    const usersByTier: Record<string, number> = {};
    for (const tc of tierCounts) {
      usersByTier[tc.tier] = tc._count;
    }

    // Format signups
    const signups = (signupsRaw || []).map((row) => ({
      date:
        typeof row.date === "object"
          ? (row.date as Date).toISOString().split("T")[0]
          : String(row.date),
      count: Number(row.count),
    }));

    // Count churn risk users: paid users with period ending within 7d OR no login in 30d
    const sevenDaysFromNow = new Date(now + 7 * 86_400_000);
    const churnRiskCount = await prisma.user.count({
      where: {
        subscription: { tier: { not: "FREE" }, status: "active" },
        OR: [
          { subscription: { currentPeriodEnd: { lte: sevenDaysFromNow, not: null } } },
          { lastLoginAt: null },
          { lastLoginAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    return NextResponse.json(
      {
        mrr,
        arr: mrr * 12,
        paidSubscribers: paidSubscriptions.length,
        usersByTier,
        liveStrategyCount,
        signups,
        webhookEventsLast24h: webhookCount,
        churn: totalSubCount > 0 ? cancelledCount / totalSubCount : 0,
        cancelledCount,
        totalSubCount,
        churnRiskCount,
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin stats");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
