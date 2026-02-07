import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema, formatZodErrors, checkBodySize } from "@/lib/validations";
import { env } from "@/lib/env";
import {
  passwordResetRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import crypto from "crypto";

export async function POST(request: Request) {
  const log = createApiLogger("/api/auth/forgot-password", "POST");

  // Check body size
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Check rate limit (5 requests per 15 minutes per email)
    const rateLimitResult = await checkRateLimit(passwordResetRateLimiter, email.toLowerCase());
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      // Return same message as success to prevent email enumeration
      // but with rate limit headers for monitoring
      log.warn({ email: email.substring(0, 3) + "***" }, "Password reset rate limit exceeded");
      return NextResponse.json(
        {
          message: "If an account with this email exists, a reset link has been sent.",
        },
        { headers: rateLimitHeaders }
      );
    }

    // Check if user exists and uses password auth
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          message: "If an account with this email exists, a reset link has been sent.",
        },
        { headers: rateLimitHeaders }
      );
    }

    // Delete any existing tokens for this email + clean up all expired tokens
    await Promise.all([
      prisma.passwordResetToken.deleteMany({ where: { email } }),
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    ]);

    // Generate secure token and hash it for storage
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save hashed token (plaintext token is only sent via email)
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: tokenHash,
        expiresAt,
      },
    });

    // Build reset URL with plaintext token
    const resetUrl = `${env.AUTH_URL}/reset-password?token=${token}`;

    // Send email with reset link
    await sendPasswordResetEmail(email, resetUrl);

    log.info({ email: email.substring(0, 3) + "***" }, "Password reset email sent");

    return NextResponse.json(
      {
        message: "If an account with this email exists, a reset link has been sent.",
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Forgot password error");
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
