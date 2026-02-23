import { prisma } from "./prisma";
import { logger } from "./logger";
import { randomInt, createHash, createHmac } from "crypto";
import { checkRateLimit, adminOtpVerifyRateLimiter } from "./rate-limit";
import { timingSafeEqual } from "@/lib/csrf";

const log = logger.child({ module: "admin-otp" });
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOKIE_NAME = "admin_otp_verified";
const OTP_COOKIE_MAX_AGE = 60 * 60; // 1 hour

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is required");
  return secret;
}

/**
 * Create a signed OTP cookie value bound to the user's ID.
 * Format: userId:timestamp:hmac
 */
export function signOtpCookie(userId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = getAuthSecret();
  const data = `${userId}:${timestamp}`;
  const hmac = createHmac("sha256", secret).update(data).digest("hex");
  return `${data}:${hmac}`;
}

/**
 * Verify a signed OTP cookie value matches the expected user ID.
 */
export function verifyOtpCookie(cookieValue: string, userId: string): boolean {
  const parts = cookieValue.split(":");
  if (parts.length !== 3) return false;

  const [cookieUserId, timestampStr, providedHmac] = parts;
  if (cookieUserId !== userId) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Check cookie hasn't expired (use same maxAge as the cookie itself)
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > OTP_COOKIE_MAX_AGE) return false;

  // Verify HMAC
  const secret = getAuthSecret();
  const data = `${cookieUserId}:${timestampStr}`;
  const expectedHmac = createHmac("sha256", secret).update(data).digest("hex");

  // Timing-safe comparison
  if (providedHmac.length !== expectedHmac.length) return false;
  const a = Buffer.from(providedHmac, "hex");
  const b = Buffer.from(expectedHmac, "hex");
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Generate a 6-digit OTP code for an admin user.
 * Deletes any existing codes for this email first.
 */
export async function generateAdminOtp(email: string): Promise<string> {
  // Delete existing OTPs for this email
  await prisma.adminOtp.deleteMany({ where: { email } });

  const code = randomInt(100000, 999999).toString();
  const hashedCode = createHash("sha256").update(code).digest("hex");

  await prisma.adminOtp.create({
    data: {
      email,
      code: hashedCode,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  log.info({ email: email.substring(0, 3) + "***" }, "Admin OTP generated");
  return code;
}

/**
 * Verify a 6-digit OTP code for an admin user.
 * Returns true if valid, false otherwise.
 * Deletes the OTP after successful verification.
 */
export async function verifyAdminOtp(email: string, code: string): Promise<boolean> {
  // Rate limit verification attempts to prevent brute-force on 6-digit codes
  const rateLimitResult = await checkRateLimit(adminOtpVerifyRateLimiter, `otp-verify:${email}`);
  if (!rateLimitResult.success) {
    // Invalidate the OTP so the attacker cannot retry after the rate limit window resets
    await prisma.adminOtp.deleteMany({ where: { email } });
    log.warn(
      { email: email.substring(0, 3) + "***" },
      "OTP verification rate limited — OTP invalidated"
    );
    return false;
  }

  const hashedCode = createHash("sha256").update(code).digest("hex");

  const otp = await prisma.adminOtp.findFirst({
    where: {
      email,
      expiresAt: { gte: new Date() },
    },
  });

  if (!otp || !timingSafeEqual(hashedCode, otp.code)) {
    log.warn({ email: email.substring(0, 3) + "***" }, "Admin OTP verification failed");
    return false;
  }

  // Delete used OTP
  await prisma.adminOtp.delete({ where: { id: otp.id } });

  log.info({ email: email.substring(0, 3) + "***" }, "Admin OTP verified");
  return true;
}

export { OTP_COOKIE_NAME, OTP_COOKIE_MAX_AGE };
