import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/cron/cleanup" });

/**
 * Cron endpoint to permanently delete soft-deleted projects (>30 days)
 * and expired password reset tokens.
 *
 * Protect with a secret bearer token in production (e.g. via Vercel Cron).
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Permanently delete soft-deleted projects older than 30 days
    // (cascades to versions and exports via Prisma onDelete: Cascade)
    const deletedProjects = await prisma.project.deleteMany({
      where: {
        deletedAt: { lt: thirtyDaysAgo },
      },
    });

    // Clean up expired password reset tokens
    const deletedTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Clean up old webhook events (>90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deletedWebhookEvents = await prisma.webhookEvent.deleteMany({
      where: {
        processedAt: { lt: ninetyDaysAgo },
      },
    });

    log.info(
      {
        deletedProjects: deletedProjects.count,
        deletedTokens: deletedTokens.count,
        deletedWebhookEvents: deletedWebhookEvents.count,
      },
      "Cleanup completed"
    );

    return NextResponse.json({
      success: true,
      deleted: {
        projects: deletedProjects.count,
        expiredTokens: deletedTokens.count,
        webhookEvents: deletedWebhookEvents.count,
      },
    });
  } catch (error) {
    log.error({ error }, "Cleanup failed");
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
