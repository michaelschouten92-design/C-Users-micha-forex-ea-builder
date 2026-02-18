import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { sendDowngradeWarningEmail } from "@/lib/email";
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

    // Clean up old EA heartbeats (>30 days)
    const deletedHeartbeats = await batchDelete(prisma.eAHeartbeat, {
      createdAt: { lt: thirtyDaysAgo },
    });

    // Clean up old EA errors (>30 days)
    const deletedEAErrors = await batchDelete(prisma.eAError, {
      createdAt: { lt: thirtyDaysAgo },
    });

    // Mark EA instances as OFFLINE if no heartbeat for >15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const staleInstances = await prisma.liveEAInstance.updateMany({
      where: {
        status: { in: ["ONLINE", "ERROR"] },
        lastHeartbeat: { lt: fifteenMinutesAgo },
      },
      data: { status: "OFFLINE" },
    });

    // Evaluate EA alert rules after marking stale instances offline
    try {
      const enabledRules = await prisma.eAAlertRule.findMany({
        where: { enabled: true },
      });

      const oneDayAgoForAlerts = new Date(Date.now() - 86_400_000);

      // Batch: fetch all instance data needed by any rule type in parallel
      const maxConsecThreshold = Math.max(
        ...enabledRules
          .filter((r) => r.type === "CONSECUTIVE_LOSSES")
          .map((r) => Math.ceil(r.threshold) + 1),
        1
      );
      const minOfflineThreshold = Math.min(
        ...enabledRules.filter((r) => r.type === "OFFLINE_DURATION").map((r) => r.threshold),
        Infinity
      );
      const offlineSince =
        minOfflineThreshold < Infinity
          ? new Date(Date.now() - minOfflineThreshold * 60 * 1000)
          : new Date(0);

      const [onlineInstances, offlineInstances, recentAlerts] = await Promise.all([
        prisma.liveEAInstance.findMany({
          where: { status: "ONLINE" },
          select: {
            id: true,
            eaName: true,
            heartbeats: {
              orderBy: { createdAt: "desc" },
              take: 2,
              select: { drawdown: true, equity: true },
            },
            trades: {
              where: { closeTime: { not: null } },
              orderBy: { closeTime: "desc" },
              take: maxConsecThreshold,
              select: { profit: true },
            },
          },
        }),
        enabledRules.some((r) => r.type === "OFFLINE_DURATION")
          ? prisma.liveEAInstance.findMany({
              where: { status: "OFFLINE", lastHeartbeat: { lt: offlineSince } },
              select: { id: true, eaName: true },
            })
          : Promise.resolve([]),
        // Batch dedup: get all recent alerts in one query
        prisma.eAAlert.findMany({
          where: { createdAt: { gte: oneDayAgoForAlerts } },
          select: { ruleId: true, instanceId: true },
        }),
      ]);

      // Build dedup set
      const alertKeys = new Set(recentAlerts.map((a) => `${a.ruleId}:${a.instanceId}`));
      const alertsToCreate: { ruleId: string; instanceId: string; message: string }[] = [];

      for (const rule of enabledRules) {
        let matchingInstances: { id: string; eaName: string }[] = [];

        if (rule.type === "DRAWDOWN_EXCEEDED") {
          matchingInstances = onlineInstances
            .filter((i) => i.heartbeats.length > 0 && i.heartbeats[0].drawdown > rule.threshold)
            .map((i) => ({ id: i.id, eaName: i.eaName }));
        } else if (rule.type === "OFFLINE_DURATION") {
          const threshold = new Date(Date.now() - rule.threshold * 60 * 1000);
          matchingInstances = offlineInstances.filter(() => offlineSince <= threshold);
        } else if (rule.type === "EQUITY_DROP") {
          matchingInstances = onlineInstances
            .filter((i) => {
              if (i.heartbeats.length < 2) return false;
              const latest = i.heartbeats[0].equity;
              const previous = i.heartbeats[1].equity;
              if (previous === 0) return false;
              return ((previous - latest) / previous) * 100 > rule.threshold;
            })
            .map((i) => ({ id: i.id, eaName: i.eaName }));
        } else if (rule.type === "CONSECUTIVE_LOSSES") {
          matchingInstances = onlineInstances
            .filter((i) => {
              let consecutive = 0;
              for (const trade of i.trades) {
                if (trade.profit < 0) consecutive++;
                else break;
              }
              return consecutive >= rule.threshold;
            })
            .map((i) => ({ id: i.id, eaName: i.eaName }));
        }

        for (const inst of matchingInstances) {
          if (!alertKeys.has(`${rule.id}:${inst.id}`)) {
            alertsToCreate.push({
              ruleId: rule.id,
              instanceId: inst.id,
              message: `${rule.type.replace(/_/g, " ")} alert: ${inst.eaName} exceeded threshold ${rule.threshold}`,
            });
            alertKeys.add(`${rule.id}:${inst.id}`);
          }
        }
      }

      // Bulk create all alerts in one query
      if (alertsToCreate.length > 0) {
        await prisma.eAAlert.createMany({ data: alertsToCreate, skipDuplicates: true });
      }
    } catch (alertError) {
      log.error({ error: alertError }, "EA alert evaluation failed (non-fatal)");
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
        select: { tier: true, user: { select: { email: true } } },
      });

      for (const sub of warningCandidates) {
        if (isTimedOut()) break;
        const settingsUrl = `${env.AUTH_URL}/app/settings`;
        sendDowngradeWarningEmail(sub.user.email, sub.tier, 7, settingsUrl).catch(() => {});
        warningsSent++;
      }
    }

    // Auto-downgrade past_due subscriptions after 14-day grace period
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    let downgraded = 0;

    if (!isTimedOut()) {
      const pastDueSubs = await prisma.subscription.findMany({
        where: {
          status: "past_due",
          currentPeriodEnd: { lt: fourteenDaysAgo },
          // Also check manualPeriodEnd - if admin extended, respect that
          OR: [{ manualPeriodEnd: null }, { manualPeriodEnd: { lt: fourteenDaysAgo } }],
        },
        select: { id: true, userId: true, tier: true },
      });

      for (const sub of pastDueSubs) {
        if (isTimedOut()) break;
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
