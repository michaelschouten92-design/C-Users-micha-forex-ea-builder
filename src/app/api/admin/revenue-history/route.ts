import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/revenue-history - Return revenue snapshots for last 12 months
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const snapshots = await prisma.revenueSnapshot.findMany({
      where: { date: { gte: twelveMonthsAgo } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ data: snapshots });
  } catch (error) {
    logger.error({ error }, "Failed to fetch revenue history");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
