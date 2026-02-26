import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";
import {
  checkRateLimit,
  adminMutationRateLimiter,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson } from "@/lib/validations";
import { encrypt } from "@/lib/crypto";

const suspendSchema = z.object({
  email: z.string().email(),
  reason: z.string().min(1).max(1000),
});

// POST /api/admin/users/suspend - Suspend a user
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;

    const result = await safeReadJson(request);
    if ("error" in result) return result.error;
    const body = result.data;

    const rl = await checkRateLimit(
      adminMutationRateLimiter,
      `admin-mut:${adminCheck.session.user.id}`
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rl) },
        { status: 429, headers: createRateLimitHeaders(rl) }
      );
    }

    const validation = suspendSchema.safeParse(body);
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

    const { email, reason } = validation.data;

    // Prevent self-suspension
    const targetUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!targetUser) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }
    if (targetUser.id === adminCheck.session.user.id) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Cannot suspend yourself"), {
        status: 400,
      });
    }

    const user = await prisma.user.update({
      where: { email },
      data: {
        suspended: true,
        suspendedAt: new Date(),
        suspendedReason: encrypt(reason),
      },
      select: { id: true, email: true, suspended: true },
    });

    // Audit log
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.user_suspend" as AuditEventType,
      resourceType: "user",
      resourceId: user.id,
      metadata: { targetEmail: email, reason },
    }).catch((err) => {
      logger.error({ err, resourceId: user.id }, "Audit log failed: user_suspend");
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    logger.error({ error }, "Failed to suspend user");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
