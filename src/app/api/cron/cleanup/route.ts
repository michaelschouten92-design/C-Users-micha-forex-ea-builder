import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";

const log = logger.child({ route: "/api/cron/cleanup" });

/**
 * Cron endpoint to permanently delete soft-deleted projects (>30 days)
 * and expired password reset tokens.
 *
 * Protect with a secret bearer token in production (e.g. via Vercel Cron).
 */
async function handleCleanup(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In production on Vercel, verify the request comes from Vercel Cron
  if (process.env.VERCEL && !request.headers.get("x-vercel-cron")) {
    log.warn("Cron request missing x-vercel-cron header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const BATCH_SIZE = 1000;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    // Batched delete helper to avoid long-running queries
    const MAX_ITERATIONS = 100; // Cap at 100K records per model to prevent cron timeout

    async function batchDelete(
      model: {
        deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<{ count: number }>;
        findMany: (args: {
          where: Record<string, unknown>;
          select: { id: true };
          take: number;
        }) => Promise<Array<{ id: string }>>;
      },
      where: Record<string, unknown>
    ): Promise<number> {
      let totalDeleted = 0;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const batch = await model.findMany({ where, select: { id: true }, take: BATCH_SIZE });
        if (batch.length === 0) break;
        const result = await model.deleteMany({ where: { id: { in: batch.map((r) => r.id) } } });
        totalDeleted += result.count;
        if (batch.length < BATCH_SIZE) break;
      }
      return totalDeleted;
    }

    // Permanently delete soft-deleted projects older than 30 days
    // (cascades to versions and exports via Prisma onDelete: Cascade)
    const deletedProjects = await batchDelete(prisma.project, { deletedAt: { lt: thirtyDaysAgo } });

    // Clean up expired tokens
    const deletedTokens = await batchDelete(prisma.passwordResetToken, {
      expiresAt: { lt: new Date() },
    });
    const deletedVerificationTokens = await batchDelete(prisma.emailVerificationToken, {
      expiresAt: { lt: new Date() },
    });
    const deletedAdminOtps = await batchDelete(prisma.adminOtp, {
      expiresAt: { lt: new Date() },
    });

    // Clean up old webhook events (>90 days)
    const deletedWebhookEvents = await batchDelete(prisma.webhookEvent, {
      processedAt: { lt: ninetyDaysAgo },
    });

    // Clean up old audit logs (>365 days)
    const deletedAuditLogs = await batchDelete(prisma.auditLog, {
      createdAt: { lt: oneYearAgo },
    });

    // Auto-downgrade past_due subscriptions after 14-day grace period
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const pastDueSubs = await prisma.subscription.findMany({
      where: {
        status: "past_due",
        currentPeriodEnd: { lt: fourteenDaysAgo },
      },
      select: { id: true, userId: true, tier: true },
    });

    let downgraded = 0;
    for (const sub of pastDueSubs) {
      if (sub.tier === "FREE") continue;
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          tier: "FREE",
          status: "canceled",
          stripeSubId: null,
        },
      });
      downgraded++;
      log.info(
        { userId: sub.userId, previousTier: sub.tier },
        "Auto-downgraded past_due subscription"
      );
    }

    log.info(
      {
        deletedProjects,
        deletedTokens,
        deletedWebhookEvents,
        deletedVerificationTokens,
        deletedAuditLogs,
        deletedAdminOtps,
        downgraded,
      },
      "Cleanup completed"
    );

    return NextResponse.json({
      success: true,
      deleted: {
        projects: deletedProjects,
        expiredTokens: deletedTokens,
        webhookEvents: deletedWebhookEvents,
        verificationTokens: deletedVerificationTokens,
        auditLogs: deletedAuditLogs,
      },
      downgraded,
    });
  } catch (error) {
    log.error({ error }, "Cleanup failed");
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}
