import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/ea-alerts/triggered - List triggered alerts
export async function GET(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20)
    );
    const acknowledged = url.searchParams.get("acknowledged");

    const where: Record<string, unknown> = {};
    if (acknowledged === "true") where.acknowledged = true;
    if (acknowledged === "false") where.acknowledged = false;

    const [alerts, total] = await Promise.all([
      prisma.eAAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          rule: { select: { type: true, threshold: true } },
          instance: { select: { eaName: true, symbol: true, user: { select: { email: true } } } },
        },
      }),
      prisma.eAAlert.count({ where }),
    ]);

    return NextResponse.json({
      data: alerts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch triggered alerts");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// PATCH /api/admin/ea-alerts/triggered - Acknowledge alert
export async function PATCH(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await request.json().catch(() => null);
    const bodyValidation = z.object({ id: z.string().cuid() }).safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Missing or invalid alert id"),
        {
          status: 400,
        }
      );
    }

    const alert = await prisma.eAAlert.update({
      where: { id: bodyValidation.data.id },
      data: { acknowledged: true },
    });

    return NextResponse.json(alert);
  } catch (error) {
    logger.error({ error }, "Failed to acknowledge alert");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
