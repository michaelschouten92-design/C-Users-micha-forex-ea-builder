import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { getAttentionItems, type AttentionItem } from "@/lib/admin-alerts";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, warning: 2 };

// GET /api/admin/attention-queue - Items needing founder attention
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const now = new Date();

    // Get shared attention items (error EAs, silent EAs, failed exports, outbox dead)
    const items: AttentionItem[] = await getAttentionItems();

    // Additional items for the live dashboard (not in cron):

    // Degraded + drifting strategies → high
    const [degradedSnapshots, driftingSnapshots] = await Promise.all([
      prisma.healthSnapshot.findMany({
        where: { status: "DEGRADED" },
        distinct: ["instanceId"],
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          instanceId: true,
          createdAt: true,
          instance: { select: { eaName: true, userId: true, deletedAt: true } },
        },
      }),
      prisma.healthSnapshot.findMany({
        where: { driftDetected: true },
        distinct: ["instanceId"],
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          instanceId: true,
          createdAt: true,
          instance: { select: { eaName: true, userId: true, deletedAt: true } },
        },
      }),
    ]);

    const existingInstanceIds = new Set(items.filter((i) => i.instanceId).map((i) => i.instanceId));
    const degradedInstanceIds = new Set<string>();

    for (const snap of degradedSnapshots) {
      degradedInstanceIds.add(snap.instanceId); // Track regardless of deletedAt for drift dedup
      if (snap.instance.deletedAt) continue;
      items.push({
        id: `degraded-${snap.id}`,
        type: "degraded_strategy",
        severity: "high",
        title: `Degraded strategy: ${snap.instance.eaName}`,
        detail: "Health status is DEGRADED",
        instanceId: snap.instanceId,
        userId: snap.instance.userId,
        timestamp: snap.createdAt.toISOString(),
      });
    }

    for (const snap of driftingSnapshots) {
      if (snap.instance.deletedAt) continue;
      if (degradedInstanceIds.has(snap.instanceId)) continue;
      if (existingInstanceIds.has(snap.instanceId)) continue;
      items.push({
        id: `drift-${snap.id}`,
        type: "drifting_strategy",
        severity: "high",
        title: `Drift detected: ${snap.instance.eaName}`,
        detail: "Edge drift detected — strategy expectancy declining",
        instanceId: snap.instanceId,
        userId: snap.instance.userId,
        timestamp: snap.createdAt.toISOString(),
      });
    }

    // Export queue backlog (>10) → warning
    const queueDepth = await prisma.exportJob.count({
      where: { status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (queueDepth > 10) {
      items.push({
        id: "export-backlog",
        type: "export_backlog",
        severity: "warning",
        title: "Export queue backlog",
        detail: `${queueDepth} jobs queued or running`,
        timestamp: now.toISOString(),
      });
    }

    // Sort by severity then timestamp
    items.sort((a, b) => {
      const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch attention queue");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
