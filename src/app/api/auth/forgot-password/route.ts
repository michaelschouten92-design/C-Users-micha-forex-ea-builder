import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  forgotPasswordSchema,
  formatZodErrors,
  safeReadJson,
  checkContentType,
} from "@/lib/validations";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/auth";
import {
  passwordResetRateLimiter,
  loginIpRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
  getClientIp,
} from "@/lib/rate-limit";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import crypto from "crypto";

export async function POST(request: Request) {
  const log = createApiLogger("/api/auth/forgot-password", "POST");

  // Rate limit by IP (prevents credential stuffing and enumeration)
  const ip = getClientIp(request);
  const ipRl = await checkRateLimit(loginIpRateLimiter, `forgot-pwd-ip:${ip}`);
  if (!ipRl.success) {
    return NextResponse.json(
      { message: "If an account with this email exists, a reset link has been sent." },
      { status: 200, headers: createRateLimitHeaders(ipRl) }
    );
  }

  // Validate request
  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;

  const result = await safeReadJson(request);
  if ("error" in result) return result.error;
  const body = result.data;

  try {
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const email = normalizeEmail(validation.data.email);

    // Check rate limit (5 requests per 15 minutes per email)
    const rateLimitResult = await checkRateLimit(passwordResetRateLimiter, email);
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

    // Constant-time approach: record start, ensure minimum total time for ALL paths
    // to prevent timing-based account enumeration
    const startTime = Date.now();
    const MINIMUM_RESPONSE_MS = 250;

    // Helper to pad remaining time before responding
    const padTiming = async () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < MINIMUM_RESPONSE_MS) {
        await new Promise((r) => setTimeout(r, MINIMUM_RESPONSE_MS - elapsed + Math.random() * 50));
      }
    };

    // Check if user exists and uses password auth
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      await padTiming();
      return NextResponse.json(
        {
          message: "If an account with this email exists, a reset link has been sent.",
        },
        { headers: rateLimitHeaders }
      );
    }

    // Generate secure token and hash it for storage
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Atomically delete old tokens and create new one
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email } }),
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      prisma.passwordResetToken.create({
        data: {
          email,
          token: tokenHash,
          expiresAt,
        },
      }),
    ]);

    // Build reset URL with plaintext token
    const resetUrl = `${env.AUTH_URL}/reset-password?token=${token}`;

    // Send email with reset link
    await sendPasswordResetEmail(email, resetUrl);

    log.info({ email: email.substring(0, 3) + "***" }, "Password reset email sent");

    await padTiming();
    return NextResponse.json(
      {
        message: "If an account with this email exists, a reset link has been sent.",
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Forgot password error");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
