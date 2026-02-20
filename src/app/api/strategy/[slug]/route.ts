import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
};

// GET /api/strategy/[slug] — public strategy page data (no auth required)
export async function GET(request: NextRequest, { params }: Props) {
  const { slug } = await params;

  const page = await prisma.verifiedStrategyPage.findUnique({
    where: { slug },
    include: {
      strategyIdentity: {
        include: {
          project: {
            select: { name: true, description: true },
          },
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1,
            select: {
              id: true,
              versionNo: true,
              fingerprint: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!page || !page.isPublic) {
    return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
  }

  // Load pinned instance data if set
  let instanceData = null;
  if (page.pinnedInstanceId) {
    const instance = await prisma.liveEAInstance.findUnique({
      where: { id: page.pinnedInstanceId },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        timeframe: true,
        broker: true,
        status: true,
        mode: true,
        balance: true,
        equity: true,
        totalTrades: true,
        totalProfit: true,
        createdAt: true,
        lastHeartbeat: true,
      },
    });

    if (instance) {
      instanceData = instance;

      // Load track record state
      const trackState = await prisma.trackRecordState.findUnique({
        where: { instanceId: instance.id },
        select: {
          totalTrades: true,
          winCount: true,
          lossCount: true,
          totalProfit: true,
          maxDrawdownPct: true,
          balance: true,
          equity: true,
        },
      });

      // Load latest health snapshot
      const healthSnapshot = await prisma.healthSnapshot.findFirst({
        where: { instanceId: instance.id },
        orderBy: { createdAt: "desc" },
      });

      // Load chain integrity info
      const [chainLength, checkpointCount, lastCheckpoint] = await Promise.all([
        prisma.trackRecordEvent.count({
          where: { instanceId: instance.id },
        }),
        prisma.trackRecordCheckpoint.count({
          where: { instanceId: instance.id },
        }),
        prisma.trackRecordCheckpoint.findFirst({
          where: { instanceId: instance.id },
          orderBy: { createdAt: "desc" },
          select: { hmac: true, createdAt: true },
        }),
      ]);

      // Load equity curve data (heartbeats for SVG chart)
      const heartbeats = await prisma.eAHeartbeat.findMany({
        where: { instanceId: instance.id },
        orderBy: { createdAt: "asc" },
        select: {
          equity: true,
          balance: true,
          createdAt: true,
        },
        take: 500, // Limit for public page performance
      });

      return NextResponse.json({
        strategy: {
          name: page.strategyIdentity.project.name,
          description: page.strategyIdentity.project.description,
          strategyId: page.strategyIdentity.strategyId,
          currentVersion: page.strategyIdentity.versions[0] || null,
        },
        instance: instanceData,
        trackRecord: trackState,
        health: healthSnapshot
          ? {
              status: healthSnapshot.status,
              overallScore: healthSnapshot.overallScore,
              returnScore: healthSnapshot.returnScore,
              drawdownScore: healthSnapshot.drawdownScore,
              winRateScore: healthSnapshot.winRateScore,
              lastUpdated: healthSnapshot.createdAt,
            }
          : null,
        chain: {
          length: chainLength,
          checkpointCount,
          lastCheckpoint: lastCheckpoint
            ? { hmac: lastCheckpoint.hmac, at: lastCheckpoint.createdAt }
            : null,
        },
        equityCurve: page.showEquityCurve ? heartbeats : [],
        settings: {
          showEquityCurve: page.showEquityCurve,
          showTradeLog: page.showTradeLog,
          showHealthStatus: page.showHealthStatus,
        },
      });
    }
  }

  // No pinned instance — return basic strategy info
  return NextResponse.json({
    strategy: {
      name: page.strategyIdentity.project.name,
      description: page.strategyIdentity.project.description,
      strategyId: page.strategyIdentity.strategyId,
      currentVersion: page.strategyIdentity.versions[0] || null,
    },
    instance: null,
    trackRecord: null,
    health: null,
    chain: null,
    equityCurve: [],
    settings: {
      showEquityCurve: page.showEquityCurve,
      showTradeLog: page.showTradeLog,
      showHealthStatus: page.showHealthStatus,
    },
  });
}
