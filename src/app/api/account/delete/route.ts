import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendAccountDeletedEmail } from "@/lib/email";
import { safeReadJson, checkContentType } from "@/lib/validations";
import { validateCsrfToken } from "@/lib/csrf";
import {
  gdprDeleteRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

/**
 * DELETE /api/account/delete - GDPR account deletion
 * Permanently deletes the user account and all associated data.
 * Requires confirmation via request body: { confirm: "DELETE" }
 */
export async function DELETE(request: NextRequest) {
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      { error: "Your session has expired. Please refresh the page and try again." },
      { status: 403 }
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 2 attempts per 24 hours
  const rateLimitResult = await checkRateLimit(
    gdprDeleteRateLimiter,
    `gdpr-delete:${session.user.id}`
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;

  const result = await safeReadJson(request);
  if ("error" in result) return result.error;
  const body = result.data as Record<string, unknown>;

  try {
    if (
      String(body?.confirm ?? "")
        .trim()
        .toUpperCase() !== "DELETE"
    ) {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "DELETE" } to proceed.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Fetch user record (email + password hash for verification)
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });

    // Password verification: required for credential users, skipped for OAuth-only
    if (userRecord?.passwordHash) {
      const password = typeof body?.password === "string" ? body.password : "";
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to delete your account." },
          { status: 400 }
        );
      }
      const isValid = await bcrypt.compare(password, userRecord.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
      }
    }

    // Cancel Stripe first - if DB cleanup fails, cron will catch the orphaned subscription.
    // This order is deliberate: Stripe cancellation is idempotent and safe to retry,
    // whereas deleting DB records before cancelling Stripe could leave active billing.
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeSubId) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        const stripeSub = await getStripe().subscriptions.retrieve(subscription.stripeSubId);
        // Only cancel if not already cancelled (safe for retries)
        if (stripeSub.status !== "canceled") {
          await getStripe().subscriptions.cancel(subscription.stripeSubId);
        }
      } catch (stripeError) {
        // If subscription is already deleted/cancelled in Stripe, proceed with DB cleanup
        const err = stripeError as { code?: string; statusCode?: number };
        if (err.statusCode === 404 || err.code === "resource_missing") {
          logger.warn(
            { userId },
            "Stripe subscription already deleted, proceeding with account deletion"
          );
        } else {
          // Log the Stripe error but proceed with GDPR deletion — user's right to be deleted takes priority
          logger.error(
            { error: stripeError, userId },
            "Failed to cancel Stripe subscription during account deletion — proceeding with deletion anyway"
          );
        }
      }
    }

    // Delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete tokens by email (not FK-based, won't cascade)
      if (userRecord) {
        await tx.passwordResetToken.deleteMany({ where: { email: userRecord.email } });
        await tx.emailVerificationToken.deleteMany({ where: { email: userRecord.email } });
      }

      // Delete audit logs (no cascade FK)
      await tx.auditLog.deleteMany({ where: { userId } });

      // Clear referral references from other users (GDPR right to erasure)
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });
      if (user?.referralCode) {
        await tx.user.updateMany({
          where: { referredBy: user.referralCode },
          data: { referredBy: null },
        });
      }

      // Delete user (cascades to Subscription, Project, BuildVersion, ExportJob, UserTemplate, EAAlertRule, LiveEAInstance)
      await tx.user.delete({ where: { id: userId } });
    });

    logger.info({ userId }, "GDPR account deletion completed");

    // Send confirmation email (fire-and-forget, after deletion)
    if (userRecord?.email) {
      sendAccountDeletedEmail(userRecord.email).catch((err) =>
        logger.warn({ error: err }, "Failed to send account deletion confirmation email")
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted.",
    });

    // Clear session cookies so the deleted user is logged out
    const cookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";
    response.cookies.set(cookieName, "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    logger.error({ error, userId: session.user.id }, "GDPR account deletion failed");
    return NextResponse.json({ error: "Account deletion failed" }, { status: 500 });
  }
}
