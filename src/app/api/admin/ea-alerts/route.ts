import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/ea-alerts - List alert rules
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const rules = await prisma.eAAlertRule.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { alerts: true } },
      },
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    logger.error({ error }, "Failed to fetch EA alert rules");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

const createRuleSchema = z.object({
  type: z.enum(["DRAWDOWN_EXCEEDED", "CONSECUTIVE_LOSSES", "OFFLINE_DURATION", "EQUITY_DROP"]),
  threshold: z.number().min(0),
  enabled: z.boolean().default(true),
});

// POST /api/admin/ea-alerts - Create alert rule
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const validation = createRuleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Validation failed",
          validation.error.errors.map((e) => e.message)
        ),
        { status: 400 }
      );
    }

    const rule = await prisma.eAAlertRule.create({
      data: {
        userId: adminCheck.session.user.id,
        type: validation.data.type,
        threshold: validation.data.threshold,
        enabled: validation.data.enabled,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create EA alert rule");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// DELETE /api/admin/ea-alerts - Delete alert rule
export async function DELETE(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Missing id"), {
        status: 400,
      });
    }

    await prisma.eAAlertRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete EA alert rule");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
