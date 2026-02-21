import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { sendAdminDailyReportEmail } from "@/lib/email";

const log = logger.child({ route: "/api/cron/admin-report" });

/**
 * Cron endpoint to send daily admin report email.
 * Run daily at 8 AM UTC via Vercel Cron.
 */
async function handleAdminReport(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In production on Vercel, verify the request comes from Vercel Cron
  if (process.env.VERCEL && !request.headers.get("x-vercel-cron")) {
    log.warn("Cron request missing x-vercel-cron header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86_400_000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      tierCounts,
      exportsToday,
      exportsDone,
      exportsFailed,
      churnRiskCount,
      onlineEAs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.subscription.groupBy({
        by: ["tier"],
        _count: true,
      }),
      prisma.exportJob.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.exportJob.count({
        where: { createdAt: { gte: oneDayAgo }, status: "DONE" },
      }),
      prisma.exportJob.count({
        where: { createdAt: { gte: oneDayAgo }, status: "FAILED" },
      }),
      prisma.user.count({
        where: {
          subscription: { tier: { not: "FREE" }, status: "active" },
          OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: thirtyDaysAgo } }],
        },
      }),
      prisma.liveEAInstance.count({ where: { status: "ONLINE" } }),
    ]);

    // Calculate MRR
    const paidSubs = await prisma.subscription.findMany({
      where: {
        status: { in: ["active", "trialing"] },
        tier: { not: "FREE" },
        stripeSubId: { not: null },
      },
      select: { tier: true },
    });
    const TIER_PRICES: Record<string, number> = { PRO: 39, ELITE: 79 };
    const mrr = paidSubs.reduce((sum, s) => sum + (TIER_PRICES[s.tier] || 0), 0);

    const tierMap: Record<string, number> = {};
    for (const tc of tierCounts) {
      tierMap[tc.tier] = tc._count;
    }

    const stats = {
      totalUsers,
      newUsersToday,
      newUsersWeek,
      proUsers: tierMap.PRO || 0,
      eliteUsers: tierMap.ELITE || 0,
      mrr,
      exportsToday,
      exportsDone,
      exportsFailed,
      churnRiskCount,
      onlineEAs,
    };

    // Save revenue snapshot for historical tracking
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const totalPaidSubs = (tierMap.PRO || 0) + (tierMap.ELITE || 0);
    const cancelledCount = await prisma.subscription.count({ where: { status: "cancelled" } });
    const totalSubCount = await prisma.subscription.count();
    const churnRate = totalSubCount > 0 ? cancelledCount / totalSubCount : 0;

    await prisma.revenueSnapshot.upsert({
      where: { date: today },
      create: {
        date: today,
        mrr,
        arr: mrr * 12,
        paidCount: totalPaidSubs,
        freeCount: tierMap.FREE || 0,
        proCount: tierMap.PRO || 0,
        eliteCount: tierMap.ELITE || 0,
        churnRate,
      },
      update: {
        mrr,
        arr: mrr * 12,
        paidCount: totalPaidSubs,
        freeCount: tierMap.FREE || 0,
        proCount: tierMap.PRO || 0,
        eliteCount: tierMap.ELITE || 0,
        churnRate,
      },
    });

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      log.error("ADMIN_EMAIL not configured");
      return NextResponse.json({ error: "ADMIN_EMAIL not configured" }, { status: 500 });
    }

    await sendAdminDailyReportEmail(adminEmail, stats);

    log.info({ stats }, "Admin daily report sent");

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    log.error({ error }, "Admin report failed");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  return handleAdminReport(request);
}
