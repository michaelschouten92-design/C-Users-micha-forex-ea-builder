import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/audit-logs/export-csv - Export audit logs as CSV
export async function GET(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
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
        return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid date format"), {
          status: 400,
        });
      }
      where.createdAt = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    // Escape CSV fields to prevent formula injection
    function escapeCsv(value: unknown): string {
      const str = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(str) || str.includes(",") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const header = "Timestamp,EventType,UserId,ResourceType,ResourceId,Metadata,IP";
    const rows = logs.map((log) =>
      [
        log.createdAt.toISOString(),
        escapeCsv(log.eventType),
        escapeCsv(log.userId || ""),
        escapeCsv(log.resourceType || ""),
        escapeCsv(log.resourceId || ""),
        escapeCsv(log.metadata || ""),
        escapeCsv(log.ipAddress || ""),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to export audit logs CSV");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
