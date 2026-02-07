import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema, formatZodErrors, checkBodySize, checkContentType } from "@/lib/validations";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import {
  passwordResetRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

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

    // Find token by hash and check expiry in a single unified path to prevent timing side-channel.
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    const isValid = resetToken && resetToken.expiresAt >= new Date();

    if (!isValid) {
      // Clean up expired token if it exists
      if (resetToken) {
        await prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        });
      }

      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Hash new password before entering transaction
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Atomic: update password + delete token in one transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: resetToken.email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await tx.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      log.info({ userId: user.id }, "Password reset completed");
    });

    return NextResponse.json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Reset password error");
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
