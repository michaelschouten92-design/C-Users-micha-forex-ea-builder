import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";

const log = logger.child({ route: "/api/cron/cleanup-heartbeats" });
const RETENTION_DAYS = 7;
const BATCH_SIZE = 5000;

/**
 * Cron endpoint to delete EAHeartbeat rows older than 7 days.
 * Heartbeats are transient telemetry — not part of the audit chain.
 * SSE stream only reads from the last 30 seconds.
 *
 * Schedule: daily
 * Safe to run repeatedly.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;

  try {
    // Delete in batches to avoid long locks
    for (let i = 0; i < 20; i++) {
      const result = await prisma.$executeRaw`
        DELETE FROM "EAHeartbeat"
        WHERE id IN (
          SELECT id FROM "EAHeartbeat"
          WHERE "createdAt" < ${cutoff}
          LIMIT ${BATCH_SIZE}
        )
      `;

      totalDeleted += result;
      if (result < BATCH_SIZE) break; // No more rows to delete
    }

    log.info({ totalDeleted, cutoffDate: cutoff.toISOString() }, "heartbeat-cleanup-completed");

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    log.error({ error }, "heartbeat-cleanup-failed");
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
