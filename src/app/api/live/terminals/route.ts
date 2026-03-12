import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

/**
 * GET /api/live/terminals — List all terminals for the authenticated user.
 * Includes deployments with their link status and linked instance summary.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const terminals = await prisma.terminalConnection.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      status: true,
      lastHeartbeat: true,
      broker: true,
      accountNumber: true,
      terminalVersion: true,
      unattributedTradeCount: true,
      createdAt: true,
      deployments: {
        orderBy: { lastSeenAt: "desc" },
        select: {
          id: true,
          deploymentKey: true,
          symbol: true,
          timeframe: true,
          magicNumber: true,
          eaName: true,
          materialFingerprint: true,
          source: true,
          baselineStatus: true,
          instanceId: true,
          firstSeenAt: true,
          lastSeenAt: true,
          instance: {
            select: {
              id: true,
              eaName: true,
              status: true,
              strategyVersionId: true,
              lifecycleState: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    terminals: terminals.map((t) => ({
      ...t,
      lastHeartbeat: t.lastHeartbeat?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      deployments: t.deployments.map((d) => ({
        ...d,
        firstSeenAt: d.firstSeenAt.toISOString(),
        lastSeenAt: d.lastSeenAt.toISOString(),
        instance: d.instance
          ? {
              id: d.instance.id,
              eaName: d.instance.eaName,
              status: d.instance.status,
              hasBaseline: d.instance.strategyVersionId !== null,
              lifecycleState: d.instance.lifecycleState,
            }
          : null,
      })),
    })),
  });
}
