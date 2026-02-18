import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  resetPasswordSchema,
  formatZodErrors,
  checkBodySize,
  checkContentType,
} from "@/lib/validations";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import {
  passwordResetRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SALT_ROUNDS } from "@/lib/auth";

export async function POST(request: Request) {
  const log = createApiLogger("/api/auth/reset-password", "POST");

  // Validate request
  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Rate limit by token hash to prevent brute-force attempts
    const rateLimitResult = await checkRateLimit(passwordResetRateLimiter, `reset:${tokenHash}`);
    if (!rateLimitResult.success) {
      log.warn("Reset password rate limit exceeded");
      return NextResponse.json(
        { error: formatRateLimitError(rateLimitResult) },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Hash new password before entering transaction
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Atomic: find + delete token + update password in one transaction
    // Token is deleted first to prevent race condition (two concurrent requests using same token)
    let resetUserId: string | null = null;
    await prisma
      .$transaction(async (tx) => {
        // Find and delete token atomically within the transaction
        const resetToken = await tx.passwordResetToken.findUnique({
          where: { token: tokenHash },
        });

        if (!resetToken || resetToken.expiresAt < new Date()) {
          // Clean up expired token if found
          if (resetToken) {
            await tx.passwordResetToken.delete({ where: { id: resetToken.id } });
          }
          throw new Error("INVALID_TOKEN");
        }

        // Delete token immediately to prevent reuse
        await tx.passwordResetToken.delete({ where: { id: resetToken.id } });

        const user = await tx.user.findUnique({
          where: { email: resetToken.email },
        });

        if (!user) {
          throw new Error("INVALID_TOKEN");
        }

        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, passwordChangedAt: new Date() },
        });

        resetUserId = user.id;
        log.info({ userId: user.id }, "Password reset completed");
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "INVALID_TOKEN") {
          return null; // Will be handled below
        }
        throw err;
      });

    if (!resetUserId) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Reset password error");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
