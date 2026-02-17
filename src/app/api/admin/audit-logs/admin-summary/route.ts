import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// Admin-related event types to track
const ADMIN_EVENT_TYPES = [
  "admin.impersonation_start",
  "admin.impersonation_stop",
  "admin.user_notes_update",
  "admin.plan_limits_update",
  "admin.segment_create",
  "admin.segment_delete",
  "subscription.upgrade",
  "subscription.downgrade",
  "subscription.cancel",
];

// GET /api/admin/audit-logs/admin-summary - Admin actions summary (last 30 days)
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    const [grouped, recentEvents] = await Promise.all([
      // Group admin events by type
      prisma.auditLog.groupBy({
        by: ["eventType"],
        where: {
          eventType: { in: ADMIN_EVENT_TYPES },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
      }),
      // Latest 20 admin events
      prisma.auditLog.findMany({
        where: {
          eventType: { in: ADMIN_EVENT_TYPES },
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const summary = grouped.map((g) => ({
      eventType: g.eventType,
      count: g._count,
    }));

    return NextResponse.json({
      summary,
      recentEvents,
      totalActions: summary.reduce((acc, s) => acc + s.count, 0),
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch admin summary");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
