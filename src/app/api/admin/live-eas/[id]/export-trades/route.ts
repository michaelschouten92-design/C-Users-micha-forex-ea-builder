import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/live-eas/[id]/export-trades - Export trade history as CSV
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { id } = await params;

    const trades = await prisma.eATrade.findMany({
      where: { instanceId: id },
      orderBy: { openTime: "desc" },
    });

    // Build CSV
    const headers = [
      "Ticket",
      "Symbol",
      "Type",
      "Lots",
      "OpenPrice",
      "ClosePrice",
      "Profit",
      "OpenTime",
      "CloseTime",
    ];
    const rows = trades.map((t) => [
      t.ticket,
      t.symbol,
      t.type,
      t.lots.toFixed(2),
      t.openPrice.toFixed(5),
      t.closePrice?.toFixed(5) ?? "",
      t.profit.toFixed(2),
      t.openTime.toISOString(),
      t.closeTime?.toISOString() ?? "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="trades-${id}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to export trades CSV");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
