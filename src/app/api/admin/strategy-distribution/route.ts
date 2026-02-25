import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { resolveStrategyStatus, type StrategyStatus } from "@/lib/strategy-status/resolver";

// GET /api/admin/strategy-distribution - Strategy status distribution
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    // Get all live (non-deleted) EA instances with their latest health snapshot
    const instances = await prisma.liveEAInstance.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        status: true,
        lastHeartbeat: true,
        createdAt: true,
        deletedAt: true,
        lifecyclePhase: true,
        healthSnapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
            driftDetected: true,
            strategyVersionId: true,
          },
        },
        trackRecordState: {
          select: { lastSeqNo: true },
        },
        strategyVersion: {
          select: {
            backtestBaseline: { select: { id: true } },
          },
        },
      },
    });

    // Compute distribution
    const distribution: Record<StrategyStatus, number> = {
      CONSISTENT: 0,
      MONITORING: 0,
      TESTING: 0,
      UNSTABLE: 0,
      EDGE_DEGRADED: 0,
      INACTIVE: 0,
    };

    for (const inst of instances) {
      const latestHealth = inst.healthSnapshots[0] ?? null;
      const result = resolveStrategyStatus({
        eaStatus: inst.status as "ONLINE" | "OFFLINE" | "ERROR",
        lastHeartbeat: inst.lastHeartbeat,
        createdAt: inst.createdAt,
        deletedAt: inst.deletedAt,
        lifecyclePhase: inst.lifecyclePhase as "NEW" | "PROVING" | "PROVEN" | "RETIRED",
        healthStatus:
          (latestHealth?.status as "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA") ??
          null,
        driftDetected: latestHealth?.driftDetected ?? false,
        hasBaseline: !!inst.strategyVersion?.backtestBaseline,
        chainVerified: (inst.trackRecordState?.lastSeqNo ?? 0) > 0,
      });
      distribution[result.status]++;
    }

    return NextResponse.json(
      { distribution, total: instances.length },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch strategy distribution");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
