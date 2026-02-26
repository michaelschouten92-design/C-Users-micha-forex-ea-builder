import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateAdminOtp,
  verifyAdminOtp,
  signOtpCookie,
  OTP_COOKIE_NAME,
  OTP_COOKIE_MAX_AGE,
} from "@/lib/admin-otp";
import { logger } from "@/lib/logger";
import { Resend } from "resend";
import { env, features } from "@/lib/env";
import {
  adminRateLimiter,
  adminOtpRateLimiter,
  adminOtpIpRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { safeReadJson } from "@/lib/validations";

const log = logger.child({ route: "/api/admin/otp" });

/**
 * POST /api/admin/otp — Request or verify an admin OTP.
 * Body: { action: "request" } or { action: "verify", code: "123456" }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by user
  const rateLimitResult = await checkRateLimit(adminRateLimiter, `admin-otp:${session.user.id}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  // Rate limit by IP to prevent distributed brute-force
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) {
    const ipRl = await checkRateLimit(adminOtpIpRateLimiter, `admin-otp-ip:${ip}`);
    if (!ipRl.success) {
      return NextResponse.json(
        { error: formatRateLimitError(ipRl) },
        { status: 429, headers: createRateLimitHeaders(ipRl) }
      );
    }
  }

  // Verify admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });

  const isAdmin = user?.role === "ADMIN" || (env.ADMIN_EMAIL && user?.email === env.ADMIN_EMAIL);

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Reject oversized requests and parse JSON
  const result = await safeReadJson(request, 1024); // 1KB max for OTP requests
  if ("error" in result) return result.error;
  const body = result.data as Record<string, unknown>;

  try {
    if (body.action === "request") {
      // Stricter rate limit specifically for OTP generation (3 per 15 min)
      const otpRateResult = await checkRateLimit(
        adminOtpRateLimiter,
        `admin-otp-gen:${session.user.id}`
      );
      if (!otpRateResult.success) {
        return NextResponse.json(
          { error: formatRateLimitError(otpRateResult) },
          { status: 429, headers: createRateLimitHeaders(otpRateResult) }
        );
      }

      const code = await generateAdminOtp(session.user.email);

      // Send OTP via email
      if (features.email) {
        const resend = new Resend(env.RESEND_API_KEY);
        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: session.user.email,
          subject: "AlgoStudio Admin Verification Code",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Admin Verification Code</h2>
              <p>Your one-time verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f5; border-radius: 8px; margin: 16px 0;">
                ${code}
              </div>
              <p style="color: #666;">This code expires in 10 minutes. Do not share it with anyone.</p>
            </div>
          `,
        });
      } else {
        // In development without email, log the code
        log.info({ code }, "Admin OTP generated (dev mode — no email configured)");
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "verify") {
      const code = body.code;
      if (!code || typeof code !== "string" || code.length !== 6) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 });
      }

      const valid = await verifyAdminOtp(session.user.email, code);
      if (!valid) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      }

      // Re-verify admin role before granting OTP cookie (prevents privilege escalation)
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, email: true },
      });
      const stillAdmin =
        currentUser?.role === "ADMIN" ||
        (env.ADMIN_EMAIL && currentUser?.email === env.ADMIN_EMAIL);
      if (!stillAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Set verified cookie with HMAC binding to user session (httpOnly, 1 hour)
      const response = NextResponse.json({ success: true, verified: true });
      response.cookies.set(OTP_COOKIE_NAME, signOtpCookie(session.user.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: OTP_COOKIE_MAX_AGE,
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error({ error }, "Admin OTP error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
