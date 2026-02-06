import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema, formatZodErrors } from "@/lib/validations";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import {
  passwordResetRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  const log = createApiLogger("/api/auth/reset-password", "POST");

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

    // Rate limit by token to prevent brute-force attempts
    const rateLimitResult = await checkRateLimit(passwordResetRateLimiter, `reset:${token}`);
    if (!rateLimitResult.success) {
      log.warn("Reset password rate limit exceeded");
      return NextResponse.json(
        { error: formatRateLimitError(rateLimitResult) },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Find token and check expiry in a single unified path to prevent timing side-channel.
    // Both "not found" and "expired" return the same error after the same work.
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    log.info({ userId: user.id }, "Password reset completed");

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
