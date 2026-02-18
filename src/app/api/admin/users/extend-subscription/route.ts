import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";

const extendSchema = z.object({
  email: z.string().email(),
  days: z.number().int().min(1).max(365),
});

// POST /api/admin/users/extend-subscription - Extend a user's subscription period
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

    const validation = extendSchema.safeParse(body);
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

    const { email, days } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, subscription: true },
    });

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    if (!user.subscription) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "User has no subscription"), {
        status: 400,
      });
    }

    // Calculate new end: max(currentPeriodEnd, now()) + days
    const currentEnd = user.subscription.currentPeriodEnd
      ? new Date(user.subscription.currentPeriodEnd)
      : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        currentPeriodEnd: newEnd,
        manualPeriodEnd: newEnd,
      },
    });

    // Audit log
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.subscription_extended" as AuditEventType,
      resourceType: "subscription",
      resourceId: user.subscription.id,
      metadata: { targetEmail: email, days, newEnd: newEnd.toISOString() },
    }).catch(() => {});

    return NextResponse.json({ success: true, newEnd: newEnd.toISOString() });
  } catch (error) {
    logger.error({ error }, "Failed to extend subscription");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
