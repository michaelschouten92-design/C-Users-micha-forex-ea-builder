import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createHash } from "crypto";

const log = logger.child({ route: "/api/auth/verify-email" });

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  try {
    const hashedToken = createHash("sha256").update(token).digest("hex");

    // Atomic: find, validate, verify, and delete token in a single transaction
    // This prevents race conditions where the same token could be used simultaneously
    const result = await prisma.$transaction(async (tx) => {
      const verification = await tx.emailVerificationToken.findUnique({
        where: { token: hashedToken },
      });

      if (!verification) return { status: "invalid" as const };

      // Delete token immediately to prevent reuse (regardless of expiry)
      await tx.emailVerificationToken.delete({ where: { id: verification.id } });

      if (verification.expiresAt < new Date()) {
        log.warn(
          { email: verification.email.substring(0, 3) + "***" },
          "Expired verification token used"
        );
        return { status: "expired" as const };
      }

      // Mark email as verified
      await tx.user.update({
        where: { email: verification.email },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });

      log.info(
        { email: verification.email.substring(0, 3) + "***" },
        "Email verified successfully"
      );
      return { status: "success" as const };
    });

    switch (result.status) {
      case "invalid":
        return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
      case "expired":
        return NextResponse.redirect(new URL("/login?error=token_expired", request.url));
      case "success":
        return NextResponse.redirect(new URL("/login?verified=true", request.url));
    }
  } catch (error) {
    log.error({ error }, "Email verification failed");
    return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
  }
}
