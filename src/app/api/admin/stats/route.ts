import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

const TIER_PRICES: Record<string, number> = {
  PRO: 39,
  ELITE: 79,
};

// GET /api/admin/stats - Aggregated dashboard statistics
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());
    const thirtyDaysAgo = new Date(now - 30 * 86_400_000);
    const oneDayAgo = new Date(now - 86_400_000);

    const [
      tierCounts,
      paidSubscriptions,
      exportStatsWeek,
      exportsToday,
      signupsRaw,
      webhookCount,
      cancelledCount,
      totalSubCount,
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
      // 3. Export stats this week
      prisma.exportJob.groupBy({
        by: ["status"],
        _count: true,
        where: { createdAt: { gte: startOfWeek } },
      }),
      // 4. Exports today
      prisma.exportJob.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      // 5. Signups per day (last 30 days) - use raw query
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT DATE("createdAt") as date, CAST(COUNT(*) AS INTEGER) as count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      // 6. Webhook health (last 24h)
      prisma.webhookEvent.count({
        where: { processedAt: { gte: oneDayAgo } },
      }),
      // 7. Cancelled subscriptions
      prisma.subscription.count({
        where: { status: "cancelled" },
      }),
      // 8. Total subscriptions
      prisma.subscription.count(),
    ]);

    // Calculate MRR
    const mrr = paidSubscriptions.reduce((sum, sub) => {
      return sum + (TIER_PRICES[sub.tier] || 0);
    }, 0);

    // Format tier counts
    const usersByTier: Record<string, number> = {};
    for (const tc of tierCounts) {
      usersByTier[tc.tier] = tc._count;
    }

    // Format export stats
    const exportStats: Record<string, number> = {};
    for (const es of exportStatsWeek) {
      exportStats[es.status] = es._count;
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
        exportStats,
        exportsToday,
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
