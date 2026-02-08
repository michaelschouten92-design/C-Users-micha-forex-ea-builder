import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendAccountDeletedEmail } from "@/lib/email";
import { checkBodySize } from "@/lib/validations";
import {
  gdprDeleteRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

/**
 * DELETE /api/account/delete - GDPR account deletion
 * Permanently deletes the user account and all associated data.
 * Requires confirmation via request body: { confirm: "DELETE" }
 */
export async function DELETE(request: Request) {
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

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();

    if (body?.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "DELETE" } to proceed.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Fetch user email before deletion (needed for confirmation email)
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Cancel Stripe subscription if active
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
          logger.error(
            { error: stripeError, userId },
            "Failed to cancel Stripe subscription during account deletion"
          );
          return NextResponse.json(
            {
              error:
                "Failed to cancel your subscription. Please cancel it in Stripe first, then try again.",
            },
            { status: 500 }
          );
        }
      }
    }

    // Delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete exports
      await tx.exportJob.deleteMany({ where: { userId } });

      // Delete versions via projects
      const projects = await tx.project.findMany({
        where: { userId },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);

      if (projectIds.length > 0) {
        await tx.buildVersion.deleteMany({ where: { projectId: { in: projectIds } } });
      }

      // Delete projects
      await tx.project.deleteMany({ where: { userId } });

      // Delete subscription
      await tx.subscription.deleteMany({ where: { userId } });

      // Delete tokens by email
      if (userRecord) {
        await tx.passwordResetToken.deleteMany({ where: { email: userRecord.email } });
        await tx.emailVerificationToken.deleteMany({ where: { email: userRecord.email } });
      }

      // Delete audit logs
      await tx.auditLog.deleteMany({ where: { userId } });

      // Delete user (cascades to UserTemplates)
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
