import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkBodySize } from "@/lib/validations";
import {
  apiRateLimiter,
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

  // Rate limit
  const rateLimitResult = await checkRateLimit(apiRateLimiter, `gdpr-delete:${session.user.id}`);
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
        { error: "Confirmation required. Send { confirm: \"DELETE\" } to proceed." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Cancel Stripe subscription if active
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeSubId) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        await getStripe().subscriptions.cancel(subscription.stripeSubId);
      } catch (stripeError) {
        logger.warn({ error: stripeError, userId }, "Failed to cancel Stripe subscription during account deletion");
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

      // Delete password reset tokens
      const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user) {
        await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
      }

      // Delete audit logs
      await tx.auditLog.deleteMany({ where: { userId } });

      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });

    logger.info({ userId }, "GDPR account deletion completed");

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    logger.error({ error, userId: session.user.id }, "GDPR account deletion failed");
    return NextResponse.json({ error: "Account deletion failed" }, { status: 500 });
  }
}
