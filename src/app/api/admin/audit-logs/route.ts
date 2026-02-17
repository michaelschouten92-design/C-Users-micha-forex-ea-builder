import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/audit-logs - Paginated audit logs with filters
export async function GET(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50)
    );
    const eventType = url.searchParams.get("eventType") || undefined;
    const userId = url.searchParams.get("userId") || undefined;
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;

    const where: Record<string, unknown> = {};
    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;
    if (from || to) {
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
        return NextResponse.json(
          apiError(ErrorCode.VALIDATION_FAILED, "Invalid date format for 'from' or 'to' parameter"),
          { status: 400 }
        );
      }
      where.createdAt = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    logger.error({ error }, "Failed to fetch audit logs");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
