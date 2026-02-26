import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { audit } from "@/lib/audit";
import {
  checkRateLimit,
  adminMutationRateLimiter,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson } from "@/lib/validations";

const impersonateSchema = z.object({
  email: z.string().email(),
});

// POST /api/admin/users/impersonate — Start impersonating a user
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

    const validation = impersonateSchema.safeParse(body);
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

    const { email } = validation.data;

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    // Prevent self-impersonation
    if (targetUser.id === adminCheck.session.user.id) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Cannot impersonate yourself"),
        { status: 400 }
      );
    }

    // Audit log
    audit
      .impersonationStart(adminCheck.session.user.id, targetUser.id, targetUser.email)
      .catch((err) => {
        logger.error({ err, targetUserId: targetUser.id }, "Audit log failed: impersonation_start");
      });

    return NextResponse.json({
      impersonate: {
        userId: targetUser.id,
        email: targetUser.email,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to impersonate user");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
