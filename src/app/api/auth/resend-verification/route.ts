import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import {
  resendVerificationRateLimiter,
  checkRateLimit,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

const log = logger.child({ route: "/api/auth/resend-verification" });

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateLimit = await checkRateLimit(
    resendVerificationRateLimiter,
    `resend-verify:${session.user.id}`
  );
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimit) },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Delete any existing tokens for this email
    await prisma.emailVerificationToken.deleteMany({
      where: { email: user.email },
    });

    // Create new token
    const token = randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        email: user.email,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${env.AUTH_URL}/api/auth/verify-email?token=${token}`;
    await sendVerificationEmail(user.email, verifyUrl);

    log.info({ userId: session.user.id }, "Verification email resent");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Failed to resend verification email");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
