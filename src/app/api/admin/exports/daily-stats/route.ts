import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/exports/daily-stats - Export counts grouped by day + status (last 30 days)
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    const rows = await prisma.$queryRaw<{ date: string; status: string; count: number }[]>`
      SELECT DATE("createdAt") as date, "status", CAST(COUNT(*) AS INTEGER) as count
      FROM "ExportJob"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt"), "status"
      ORDER BY date
    `;

    // Transform to per-day structure: { date, DONE, FAILED, QUEUED, RUNNING }
    const dayMap = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const dateStr =
        typeof row.date === "object"
          ? (row.date as Date).toISOString().split("T")[0]
          : String(row.date);
      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, { DONE: 0, FAILED: 0, QUEUED: 0, RUNNING: 0 });
      }
      dayMap.get(dateStr)![row.status] = Number(row.count);
    }

    const data = Array.from(dayMap.entries()).map(([date, statuses]) => ({
      date,
      ...statuses,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ error }, "Failed to fetch daily export stats");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
