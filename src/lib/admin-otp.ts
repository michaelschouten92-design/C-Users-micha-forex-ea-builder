import { prisma } from "./prisma";
import { logger } from "./logger";
import { randomInt, createHash } from "crypto";

const log = logger.child({ module: "admin-otp" });
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOKIE_NAME = "admin_otp_verified";
const OTP_COOKIE_MAX_AGE = 60 * 60; // 1 hour

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
  const hashedCode = createHash("sha256").update(code).digest("hex");

  const otp = await prisma.adminOtp.findFirst({
    where: {
      email,
      code: hashedCode,
      expiresAt: { gte: new Date() },
    },
  });

  if (!otp) {
    log.warn({ email: email.substring(0, 3) + "***" }, "Admin OTP verification failed");
    return false;
  }

  // Delete used OTP
  await prisma.adminOtp.delete({ where: { id: otp.id } });

  log.info({ email: email.substring(0, 3) + "***" }, "Admin OTP verified");
  return true;
}

export { OTP_COOKIE_NAME, OTP_COOKIE_MAX_AGE };
