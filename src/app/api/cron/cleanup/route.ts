import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logSubscriptionTransition } from "@/lib/subscription/transitions";
import { timingSafeEqual } from "@/lib/csrf";
import { sendRenewalReminderEmail } from "@/lib/email";
import { enqueueNotification } from "@/lib/outbox";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

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
    const cronStartTime = Date.now();
    const CRON_TIMEOUT_MS = 55_000; // 55 seconds — Vercel free tier has 60s limit
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    /** Check if we're approaching the cron timeout limit */
    function isTimedOut(): boolean {
      return Date.now() - cronStartTime > CRON_TIMEOUT_MS;
    }

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
        if (isTimedOut()) break;
        const batch = await model.findMany({ where, select: { id: true }, take: BATCH_SIZE });
        if (batch.length === 0) break;
        const result = await model.deleteMany({ where: { id: { in: batch.map((r) => r.id) } } });
        totalDeleted += result.count;
        if (batch.length < BATCH_SIZE) break;
      }
      return totalDeleted;
    }

    // Batch 1: Independent deletions (can run in parallel)
    const [
      deletedProjects,
      deletedTokens,
      deletedVerificationTokens,
      deletedAdminOtps,
      deletedWebhookEvents,
      deletedAuditLogs,
    ] = await Promise.all([
      batchDelete(prisma.project, { deletedAt: { lt: thirtyDaysAgo } }),
      batchDelete(prisma.passwordResetToken, { expiresAt: { lt: new Date() } }),
      batchDelete(prisma.emailVerificationToken, { expiresAt: { lt: new Date() } }),
      batchDelete(prisma.adminOtp, { expiresAt: { lt: new Date() } }),
      batchDelete(prisma.webhookEvent, { processedAt: { lt: ninetyDaysAgo } }),
      batchDelete(prisma.auditLog, { createdAt: { lt: oneYearAgo } }),
    ]);

    // Batch 2: EA-related operations (can run in parallel)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const [deletedHeartbeats, deletedEAErrors, staleInstances] = await Promise.all([
      batchDelete(prisma.eAHeartbeat, { createdAt: { lt: thirtyDaysAgo } }),
      batchDelete(prisma.eAError, { createdAt: { lt: thirtyDaysAgo } }),
      prisma.liveEAInstance.updateMany({
        where: {
          status: { in: ["ONLINE", "ERROR"] },
          lastHeartbeat: { lt: fifteenMinutesAgo },
        },
        data: { status: "OFFLINE" },
      }),
    ]);

    // NOTE: Legacy EAAlertRule/EAAlert evaluation has been removed.
    // Alert processing now uses only the EAAlertConfig system (via @/lib/alerts),
    // which is triggered in real-time during heartbeat and trade processing.
    // See prisma/schema.prisma for deprecated model annotations.

    // Send renewal reminder emails for subscriptions expiring within 3 days.
    // Idempotency mechanism: the query uses a narrow 1-day window (2-3 days from now),
    // so even if cron retries within the same day, the same subscriptions are selected
    // and the emails are harmless duplicates. Once the window passes (<2 days),
    // the subscription no longer matches and won't be emailed again.
    let renewalRemindersSent = 0;
    if (!isTimedOut()) {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      const renewalCandidates = await prisma.subscription.findMany({
        where: {
          status: "active",
          tier: { not: "FREE" },
          currentPeriodEnd: {
            gte: twoDaysFromNow,
            lt: threeDaysFromNow,
          },
        },
        select: {
          stripeCustomerId: true,
          tier: true,
          user: { select: { email: true } },
        },
      });

      const validCandidates = renewalCandidates.filter(
        (sub) => sub.user.email && sub.stripeCustomerId
      );

      for (let i = 0; i < validCandidates.length; i += 5) {
        if (isTimedOut()) break;
        const batch = validCandidates.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(async (sub) => {
            const upcomingInvoice = await getStripe().invoices.createPreview({
              customer: sub.stripeCustomerId!,
            });
            const portalSession = await getStripe().billingPortal.sessions.create({
              customer: sub.stripeCustomerId!,
              return_url: `${env.AUTH_URL}/app`,
            });
            await sendRenewalReminderEmail(
              sub.user.email,
              sub.tier,
              upcomingInvoice.amount_due,
              portalSession.url
            );
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            renewalRemindersSent++;
          } else {
            log.warn({ err: result.reason }, "Failed to send renewal reminder");
          }
        }
      }
    }

    // Send downgrade warning emails to past_due subscriptions (7-day warning)
    let warningsSent = 0;
    if (!isTimedOut()) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const warningCandidates = await prisma.subscription.findMany({
        where: {
          status: "past_due",
          currentPeriodEnd: {
            lt: sevenDaysAgo,
            gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          },
          tier: { not: "FREE" },
        },
        select: { tier: true, userId: true, user: { select: { email: true } } },
      });

      const settingsUrl = `${env.AUTH_URL}/app/settings`;
      for (const sub of warningCandidates) {
        if (isTimedOut()) break;
        await enqueueNotification({
          userId: sub.userId,
          channel: "EMAIL",
          destination: sub.user.email,
          subject: `Action Required: Your ${sub.tier} plan is at risk`,
          payload: {
            html: `<p>Your subscription is past due. You have <strong>7 days</strong> before your account is downgraded to FREE.</p><p><a href="${settingsUrl}">Update your payment method</a></p>`,
          },
        });
        warningsSent++;
      }
    }

    // Clear expired key rotation grace periods
    if (!isTimedOut()) {
      await prisma.liveEAInstance.updateMany({
        where: { keyGracePeriodEnd: { lt: new Date() }, apiKeyHashPrev: { not: null } },
        data: { apiKeyHashPrev: null, keyGracePeriodEnd: null },
      });
    }

    // Auto-downgrade past_due subscriptions after 14-day grace period
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    let downgraded = 0;

    if (!isTimedOut()) {
      // Atomic UPDATE...RETURNING to get affected rows for structured transition logging.
      // Prevents concurrent cron runs from double-downgrading (same atomicity as updateMany).
      const downgradeRows = await prisma.$queryRaw<Array<{ userId: string; tier: string }>>`
        UPDATE "Subscription"
        SET tier = 'FREE', status = 'cancelled', "stripeSubId" = NULL
        WHERE status = 'past_due'
          AND "currentPeriodEnd" < ${fourteenDaysAgo}
          AND tier != 'FREE'
          AND ("manualPeriodEnd" IS NULL OR "manualPeriodEnd" < ${fourteenDaysAgo})
        RETURNING "userId", tier
      `;
      downgraded = downgradeRows.length;
      for (const row of downgradeRows) {
        logSubscriptionTransition(
          row.userId,
          { status: "past_due", tier: row.tier as "PRO" | "ELITE" },
          { status: "cancelled", tier: "FREE" },
          "auto_downgrade_past_due_14d"
        );
      }
      if (downgraded > 0) {
        log.info({ count: downgraded }, "Auto-downgraded past_due subscriptions");
      }
    }

    const timedOut = isTimedOut();

    log.info(
      {
        deletedProjects,
        deletedTokens,
        deletedWebhookEvents,
        deletedVerificationTokens,
        deletedAuditLogs,
        deletedAdminOtps,
        deletedHeartbeats,
        deletedEAErrors,
        staleEAsOfflined: staleInstances.count,
        downgraded,
        warningsSent,
        renewalRemindersSent,
        timedOut,
        durationMs: Date.now() - cronStartTime,
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
        eaHeartbeats: deletedHeartbeats,
        eaErrors: deletedEAErrors,
      },
      staleEAsOfflined: staleInstances.count,
      downgraded,
      warningsSent,
      renewalRemindersSent,
      timedOut,
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
