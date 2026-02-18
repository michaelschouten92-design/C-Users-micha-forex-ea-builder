import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/users - List all users with subscription info (admin only, paginated)
export async function GET(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "500", 10) || 500)
    );
    const skip = (page - 1) * limit;

    // Start of current month (UTC) for export count
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86_400_000);

    const [users, total, activityCounts] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          role: true,
          referredBy: true,
          suspended: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              projects: { where: { deletedAt: null } },
              exports: {
                where: { createdAt: { gte: startOfMonth } },
              },
            },
          },
        },
      }),
      prisma.user.count(),
      // Batch audit log activity query for last 30 days
      prisma.auditLog.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
        _count: true,
      }),
    ]);

    // Build activity map: userId -> event count in last 30d
    const activityMap = new Map<string, number>();
    for (const entry of activityCounts) {
      if (entry.userId) {
        activityMap.set(entry.userId, entry._count);
      }
    }

    const data = users.map((user) => {
      const tier = user.subscription?.tier || "FREE";
      const status = user.subscription?.status || "active";
      const periodEnd = user.subscription?.currentPeriodEnd;

      // Activity score: >=3 events in 30d = active
      const eventCount = activityMap.get(user.id) || 0;
      const activityStatus = eventCount >= 3 ? "active" : "inactive";

      // Churn risk: PRO/ELITE users with subscription expiry <=7d OR lastLoginAt >30d
      let churnRisk = false;
      if (tier !== "FREE" && status === "active") {
        const expiresWithin7d = periodEnd && new Date(periodEnd) <= sevenDaysFromNow;
        const noRecentLogin = !user.lastLoginAt || new Date(user.lastLoginAt) < thirtyDaysAgo;
        churnRisk = !!(expiresWithin7d || noRecentLogin);
      }

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        role: user.role,
        subscription: { tier, status },
        projectCount: user._count.projects,
        exportCount: user._count.exports,
        referredBy: user.referredBy ?? null,
        suspended: user.suspended,
        activityStatus,
        churnRisk,
      };
    });

    return NextResponse.json({
      data,
      adminEmail: adminCheck.adminEmail,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error({ error }, "Failed to list users (admin)");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
