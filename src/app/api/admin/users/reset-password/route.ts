import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";
import { env } from "@/lib/env";
import crypto from "crypto";
import {
  checkRateLimit,
  adminMutationRateLimiter,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson } from "@/lib/validations";

const resetSchema = z.object({
  email: z.string().email(),
});

// POST /api/admin/users/reset-password - Trigger password reset for a user
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

    const validation = resetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Validation failed"), {
        status: 400,
      });
    }

    const { email } = validation.data;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "User uses OAuth authentication, no password to reset"
        ),
        { status: 400 }
      );
    }

    // Generate token (same logic as forgot-password)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email } }),
      prisma.passwordResetToken.create({
        data: { email, token: tokenHash, expiresAt },
      }),
    ]);

    const resetUrl = `${env.AUTH_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    // Audit log
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.password_reset_triggered" as AuditEventType,
      resourceType: "user",
      resourceId: user.id,
      metadata: { targetEmail: email },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to trigger password reset");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
