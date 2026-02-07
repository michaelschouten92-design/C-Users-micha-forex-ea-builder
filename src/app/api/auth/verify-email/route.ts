import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/auth/verify-email" });

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  try {
    const verification = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verification) {
      log.warn("Invalid verification token used");
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
    }

    if (verification.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.emailVerificationToken.delete({ where: { id: verification.id } });
      log.warn({ email: verification.email.substring(0, 3) + "***" }, "Expired verification token used");
      return NextResponse.redirect(new URL("/login?error=token_expired", request.url));
    }

    // Mark email as verified
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { email: verification.email },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.delete({ where: { id: verification.id } }),
    ]);

    log.info({ email: verification.email.substring(0, 3) + "***" }, "Email verified successfully");

    return NextResponse.redirect(new URL("/login?verified=true", request.url));
  } catch (error) {
    log.error({ error }, "Email verification failed");
    return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
  }
}
