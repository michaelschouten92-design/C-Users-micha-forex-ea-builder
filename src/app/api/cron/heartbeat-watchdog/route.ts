import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { emitControlLayerAlert } from "@/lib/alerts/control-layer-alerts";

const log = logger.child({ route: "/api/cron/heartbeat-watchdog" });

/**
 * Proactive heartbeat watchdog — runs every 5 minutes.
 *
 * Detects instances that claim to be ONLINE but have not sent a heartbeat
 * in the last 5 minutes. Transitions them to OFFLINE and emits a
 * MONITOR_OFFLINE alert so the operator is notified immediately.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.VERCEL && !request.headers.get("x-vercel-cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find stale instances using database time (not application time).
    //    Oldest first so the most overdue instances are processed first.
    const staleInstances = await prisma.$queryRaw<
      Array<{ id: string; userId: string; eaName: string; lastHeartbeat: Date }>
    >`
      SELECT id, "userId", "eaName", "lastHeartbeat"
      FROM "LiveEAInstance"
      WHERE status IN ('ONLINE', 'ERROR')
        AND "deletedAt" IS NULL
        AND "lastHeartbeat" < NOW() - INTERVAL '5 minutes'
      ORDER BY "lastHeartbeat" ASC
      LIMIT 100
    `;

    if (staleInstances.length === 0) {
      return NextResponse.json({ checked: 0, transitioned: 0 });
    }

    const staleIds = staleInstances.map((i) => i.id);

    // 2. Transition to OFFLINE — re-check BOTH status AND lastHeartbeat
    //    to prevent race with a heartbeat that arrived between query and update.
    const transitioned = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "LiveEAInstance"
      SET status = 'OFFLINE'
      WHERE id = ANY(${staleIds})
        AND status IN ('ONLINE', 'ERROR')
        AND "lastHeartbeat" < NOW() - INTERVAL '5 minutes'
      RETURNING id
    `;

    const transitionedIds = new Set(transitioned.map((r: { id: string }) => r.id));

    // 3. Emit MONITOR_OFFLINE alert only for actually transitioned instances.
    //    Fire-and-forget per instance — dedupeKey prevents duplicates.
    let alerted = 0;
    for (const inst of staleInstances) {
      if (!transitionedIds.has(inst.id)) continue;
      try {
        await emitControlLayerAlert(prisma, {
          userId: inst.userId,
          instanceId: inst.id,
          alertType: "MONITOR_OFFLINE",
        });
        alerted++;
      } catch (err) {
        // Duplicate dedupeKey or other error — log and continue
        log.warn({ err, instanceId: inst.id }, "Watchdog alert emission failed");
      }
    }

    log.info(
      { checked: staleInstances.length, transitioned: transitioned.length, alerted },
      "Heartbeat watchdog completed"
    );

    return NextResponse.json({
      checked: staleInstances.length,
      transitioned: transitioned.length,
      alerted,
    });
  } catch (err) {
    log.error({ err }, "Heartbeat watchdog failed");
    return NextResponse.json({ error: "Watchdog failed" }, { status: 500 });
  }
}
