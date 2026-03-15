import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const userId = session.user.id;

  const [backtestCount, instances] = await Promise.all([
    prisma.backtestUpload.count({ where: { userId } }),
    prisma.liveEAInstance.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        exportJobId: true,
        strategyVersionId: true,
        lastHeartbeat: true,
        totalTrades: true,
        terminalDeployments: {
          select: { baselineStatus: true },
          take: 1,
        },
      },
    }),
  ]);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const monitorConnected = instances.some(
    (i) => i.lastHeartbeat && i.lastHeartbeat > fiveMinutesAgo
  );
  const baselineLinked = instances.some((i) => i.strategyVersionId !== null);
  const hasTrades = instances.some((i) => i.totalTrades > 0);

  // Find first instance eligible for baseline linking:
  // external (no exportJobId), no baseline yet, not in relink state
  const linkable = instances.find(
    (i) =>
      i.exportJobId === null &&
      i.strategyVersionId === null &&
      !i.terminalDeployments.some((d) => d.baselineStatus === "RELINK_REQUIRED")
  );

  return NextResponse.json({
    hasBacktest: backtestCount > 0,
    monitorConnected,
    hasTrades,
    baselineLinked,
    firstLinkable: linkable
      ? {
          instanceId: linkable.id,
          label: [linkable.eaName, linkable.symbol].filter(Boolean).join(" · ") || "Deployment",
        }
      : null,
  });
}
