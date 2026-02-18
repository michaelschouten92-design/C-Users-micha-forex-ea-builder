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
import { checkContentType, checkBodySize } from "@/lib/validations";

const unsuspendSchema = z.object({
  email: z.string().email(),
});

// POST /api/admin/users/unsuspend - Unsuspend a user
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;
    const sizeError = checkBodySize(request);
    if (sizeError) return sizeError;

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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const validation = unsuspendSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Validation failed"), {
        status: 400,
      });
    }

    const { email } = validation.data;

    const user = await prisma.user.update({
      where: { email },
      data: {
        suspended: false,
        suspendedAt: null,
        suspendedReason: null,
      },
      select: { id: true, email: true, suspended: true },
    });

    // Audit log
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.user_unsuspend" as AuditEventType,
      resourceType: "user",
      resourceId: user.id,
      metadata: { targetEmail: email },
    }).catch(() => {});

    return NextResponse.json({ success: true, user });
  } catch (error) {
    logger.error({ error }, "Failed to unsuspend user");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
