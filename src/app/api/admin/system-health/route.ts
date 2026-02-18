import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/system-health - System health dashboard
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const oneDayAgo = new Date(Date.now() - 86_400_000);

    // Database check
    let dbLatency = 0;
    let dbStatus: "ok" | "error" = "ok";
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = "error";
    }

    // Redis check (via rate limiter ping - if available)
    let redisLatency = 0;
    let redisStatus: "ok" | "error" | "unconfigured" = "unconfigured";
    try {
      const { Redis } = await import("@upstash/redis");
      if (process.env.UPSTASH_REDIS_REST_URL) {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
        });
        const redisStart = Date.now();
        await redis.ping();
        redisLatency = Date.now() - redisStart;
        redisStatus = "ok";
      }
    } catch {
      redisStatus = "error";
    }

    // Stripe check
    let stripeLatency = 0;
    let stripeStatus: "ok" | "error" | "unconfigured" = "unconfigured";
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const stripeStart = Date.now();
        await stripe.balance.retrieve();
        stripeLatency = Date.now() - stripeStart;
        stripeStatus = "ok";
      }
    } catch {
      stripeStatus = "error";
    }

    // Export queue metrics
    const [queueDepth, failedExports24h, totalExports24h] = await Promise.all([
      prisma.exportJob.count({
        where: { status: { in: ["QUEUED", "RUNNING"] } },
      }),
      prisma.exportJob.count({
        where: { status: "FAILED", createdAt: { gte: oneDayAgo } },
      }),
      prisma.exportJob.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
    ]);
    const exportFailureRate =
      totalExports24h > 0 ? ((failedExports24h / totalExports24h) * 100).toFixed(1) : "0.0";

    // Webhook events 24h
    const webhookCount24h = await prisma.webhookEvent.count({
      where: { processedAt: { gte: oneDayAgo } },
    });

    // EA status counts
    const eaCounts = await prisma.liveEAInstance.groupBy({
      by: ["status"],
      _count: true,
    });
    const eaStatusMap: Record<string, number> = {};
    for (const e of eaCounts) {
      eaStatusMap[e.status] = e._count;
    }

    return NextResponse.json(
      {
        services: {
          database: { status: dbStatus, latency: dbLatency },
          redis: { status: redisStatus, latency: redisLatency },
          stripe: { status: stripeStatus, latency: stripeLatency },
        },
        exports: {
          queueDepth,
          failureRate: exportFailureRate,
          failed24h: failedExports24h,
          total24h: totalExports24h,
        },
        webhooks: {
          count24h: webhookCount24h,
        },
        eas: {
          online: eaStatusMap.ONLINE || 0,
          offline: eaStatusMap.OFFLINE || 0,
          error: eaStatusMap.ERROR || 0,
        },
      },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch system health");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
