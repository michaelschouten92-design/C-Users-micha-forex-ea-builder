import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

interface AttentionItem {
  id: string;
  type: string;
  severity: "critical" | "high" | "warning";
  title: string;
  detail: string;
  instanceId?: string;
  userId?: string;
  timestamp: string;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, warning: 2 };

// GET /api/admin/attention-queue - Items needing founder attention
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const items: AttentionItem[] = [];

    // 1. Error EAs → critical
    const errorEAs = await prisma.liveEAInstance.findMany({
      where: { status: "ERROR", deletedAt: null },
      select: { id: true, eaName: true, lastError: true, userId: true, updatedAt: true },
    });
    for (const ea of errorEAs) {
      items.push({
        id: `error-ea-${ea.id}`,
        type: "error_ea",
        severity: "critical",
        title: `EA in ERROR state: ${ea.eaName}`,
        detail: ea.lastError || "No error details",
        instanceId: ea.id,
        userId: ea.userId,
        timestamp: ea.updatedAt.toISOString(),
      });
    }

    // 2. Silent EAs → warning (ONLINE but no heartbeat for 10min)
    const silentEAs = await prisma.liveEAInstance.findMany({
      where: {
        status: "ONLINE",
        deletedAt: null,
        lastHeartbeat: { lt: tenMinAgo },
      },
      select: { id: true, eaName: true, lastHeartbeat: true, userId: true },
    });
    for (const ea of silentEAs) {
      items.push({
        id: `silent-ea-${ea.id}`,
        type: "silent_ea",
        severity: "warning",
        title: `Silent EA: ${ea.eaName}`,
        detail: `Last heartbeat: ${ea.lastHeartbeat?.toISOString() ?? "never"}`,
        instanceId: ea.id,
        userId: ea.userId,
        timestamp: ea.lastHeartbeat?.toISOString() ?? new Date().toISOString(),
      });
    }

    // 3 & 4. Degraded + drifting strategies → high (run in parallel)
    const [degradedSnapshots, driftingSnapshots] = await Promise.all([
      prisma.healthSnapshot.findMany({
        where: { status: "DEGRADED" },
        distinct: ["instanceId"],
        orderBy: { createdAt: "desc" },
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
        select: {
          id: true,
          instanceId: true,
          createdAt: true,
          instance: { select: { eaName: true, userId: true, deletedAt: true } },
        },
      }),
    ]);

    const degradedInstanceIds = new Set<string>();
    for (const snap of degradedSnapshots) {
      if (snap.instance.deletedAt) continue;
      degradedInstanceIds.add(snap.instanceId);
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
      // Avoid duplicating if already in degraded list
      if (degradedInstanceIds.has(snap.instanceId)) continue;
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

    // 5. Failed exports (last hour) → warning
    const failedExports = await prisma.exportJob.findMany({
      where: { status: "FAILED", createdAt: { gte: oneHourAgo } },
      select: {
        id: true,
        errorMessage: true,
        userId: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    });
    for (const exp of failedExports) {
      items.push({
        id: `failed-export-${exp.id}`,
        type: "failed_export",
        severity: "warning",
        title: `Failed export: ${exp.project.name}`,
        detail: exp.errorMessage || "No error details",
        userId: exp.userId,
        timestamp: exp.createdAt.toISOString(),
      });
    }

    // 6. Export queue backlog (>10) → warning
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
