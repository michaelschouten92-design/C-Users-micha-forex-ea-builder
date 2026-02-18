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

      for (const rule of enabledRules) {
        let matchingInstances: { id: string; eaName: string }[] = [];

        if (rule.type === "DRAWDOWN_EXCEEDED") {
          // Check latest heartbeat drawdown against threshold
          const instances = await prisma.liveEAInstance.findMany({
            where: { status: "ONLINE" },
            select: {
              id: true,
              eaName: true,
              heartbeats: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { drawdown: true },
              },
            },
          });
          matchingInstances = instances
            .filter((i) => i.heartbeats.length > 0 && i.heartbeats[0].drawdown > rule.threshold)
            .map((i) => ({ id: i.id, eaName: i.eaName }));
        } else if (rule.type === "OFFLINE_DURATION") {
          // Check how long instances have been offline (threshold in minutes)
          const offlineSince = new Date(Date.now() - rule.threshold * 60 * 1000);
          const instances = await prisma.liveEAInstance.findMany({
            where: {
              status: "OFFLINE",
              lastHeartbeat: { lt: offlineSince },
            },
            select: { id: true, eaName: true },
          });
          matchingInstances = instances;
        } else if (rule.type === "EQUITY_DROP") {
          // Compare latest equity to previous equity reading
          const instances = await prisma.liveEAInstance.findMany({
            where: { status: "ONLINE" },
            select: {
              id: true,
              eaName: true,
              heartbeats: {
                orderBy: { createdAt: "desc" },
                take: 2,
                select: { equity: true },
              },
            },
          });
          matchingInstances = instances
            .filter((i) => {
              if (i.heartbeats.length < 2) return false;
              const latest = i.heartbeats[0].equity;
              const previous = i.heartbeats[1].equity;
              if (previous === 0) return false;
              const dropPct = ((previous - latest) / previous) * 100;
              return dropPct > rule.threshold;
            })
            .map((i) => ({ id: i.id, eaName: i.eaName }));
        } else if (rule.type === "CONSECUTIVE_LOSSES") {
          // Check recent consecutive losing trades
          const instances = await prisma.liveEAInstance.findMany({
            where: { status: "ONLINE" },
            select: {
              id: true,
              eaName: true,
              trades: {
                where: { closeTime: { not: null } },
                orderBy: { closeTime: "desc" },
                take: Math.ceil(rule.threshold) + 1,
                select: { profit: true },
              },
            },
          });
          matchingInstances = instances
            .filter((i) => {
              let consecutive = 0;
              for (const trade of i.trades) {
                if (trade.profit < 0) {
                  consecutive++;
                } else {
                  break;
                }
              }
              return consecutive >= rule.threshold;
            })
            .map((i) => ({ id: i.id, eaName: i.eaName }));
        }

        // Create alerts with dedup (max 1 per rule+instance per 24h)
        for (const inst of matchingInstances) {
          const existing = await prisma.eAAlert.findFirst({
            where: {
              ruleId: rule.id,
              instanceId: inst.id,
              createdAt: { gte: oneDayAgoForAlerts },
            },
          });

          if (!existing) {
            await prisma.eAAlert.create({
              data: {
                ruleId: rule.id,
                instanceId: inst.id,
                message: `${rule.type.replace(/_/g, " ")} alert: ${inst.eaName} exceeded threshold ${rule.threshold}`,
              },
            });
          }
        }
      }
    } catch (alertError) {
      log.error({ error: alertError }, "EA alert evaluation failed (non-fatal)");
    }

    // Auto-downgrade past_due subscriptions after 14-day grace period
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const pastDueSubs = await prisma.subscription.findMany({
      where: {
        status: "past_due",
        currentPeriodEnd: { lt: fourteenDaysAgo },
        // Also check manualPeriodEnd - if admin extended, respect that
        OR: [{ manualPeriodEnd: null }, { manualPeriodEnd: { lt: fourteenDaysAgo } }],
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
        deletedHeartbeats,
        deletedEAErrors,
        staleEAsOfflined: staleInstances.count,
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
        eaHeartbeats: deletedHeartbeats,
        eaErrors: deletedEAErrors,
      },
      staleEAsOfflined: staleInstances.count,
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
