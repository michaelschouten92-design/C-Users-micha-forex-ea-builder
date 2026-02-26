import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMetrics } from "@/lib/track-record/metrics";
import {
  publicApiRateLimiter,
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

type Props = {
  params: Promise<{ slug: string }>;
};

// GET /api/strategy/[slug] — public strategy page data (no auth required)
export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `strategy:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

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
        lifecyclePhase: true,
        provenAt: true,
        retiredAt: true,
        peakScore: true,
        strategyStatus: true,
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

      // Compute risk-adjusted metrics from TRADE_CLOSE events
      const tradeCloseEvents = await prisma.trackRecordEvent.findMany({
        where: { instanceId: instance.id, eventType: "TRADE_CLOSE" },
        orderBy: { seqNo: "asc" },
        select: { payload: true },
        take: 5000,
      });

      const snapshotEvents = await prisma.trackRecordEvent.findMany({
        where: { instanceId: instance.id, eventType: "SNAPSHOT" },
        orderBy: { seqNo: "asc" },
        select: { payload: true, timestamp: true },
        take: 5000,
      });

      const tradeResults = tradeCloseEvents.map((e) => {
        const p = e.payload as Record<string, unknown>;
        return (p.profit as number) ?? 0;
      });

      const equityCurveForMetrics = snapshotEvents.map((e) => {
        const p = e.payload as Record<string, unknown>;
        return {
          t: e.timestamp.toISOString(),
          b: (p.balance as number) ?? 0,
          e: (p.equity as number) ?? 0,
          dd: (p.drawdownPct as number) ?? 0,
        };
      });

      const metrics = computeMetrics(tradeResults, equityCurveForMetrics);

      // Get drawdown duration from track record state
      const drawdownState = await prisma.trackRecordState.findUnique({
        where: { instanceId: instance.id },
        select: { maxDrawdownDurationSec: true },
      });

      // Broker verification: count and match BROKER_EVIDENCE events
      const brokerEvidenceEvents = await prisma.trackRecordEvent.findMany({
        where: { instanceId: instance.id, eventType: "BROKER_EVIDENCE" },
        orderBy: { seqNo: "asc" },
        select: { payload: true, timestamp: true },
        take: 5000,
      });

      let brokerVerification = null;
      if (brokerEvidenceEvents.length > 0) {
        const tradeEvents = await prisma.trackRecordEvent.findMany({
          where: {
            instanceId: instance.id,
            eventType: { in: ["TRADE_OPEN", "TRADE_CLOSE"] },
          },
          orderBy: { seqNo: "asc" },
          select: { eventType: true, payload: true, timestamp: true },
          take: 10000,
        });

        let matchedCount = 0;
        let mismatchedCount = 0;

        for (const be of brokerEvidenceEvents) {
          const bPayload = be.payload as Record<string, unknown>;
          const linkedTicket = (bPayload.linkedTicket as string) ?? "";
          const execPrice = (bPayload.executionPrice as number) ?? 0;
          const execTime = (bPayload.executionTimestamp as number) ?? 0;

          const matched = tradeEvents.find((te) => {
            const tp = te.payload as Record<string, unknown>;
            const ticket = (tp.ticket as string) ?? "";
            const price =
              te.eventType === "TRADE_OPEN"
                ? ((tp.openPrice as number) ?? 0)
                : ((tp.closePrice as number) ?? 0);
            const timeDiff = Math.abs(Math.floor(te.timestamp.getTime() / 1000) - execTime);
            return ticket === linkedTicket && timeDiff < 60;
          });

          if (matched) {
            const tp = matched.payload as Record<string, unknown>;
            const price =
              matched.eventType === "TRADE_OPEN"
                ? ((tp.openPrice as number) ?? 0)
                : ((tp.closePrice as number) ?? 0);
            if (Math.abs(price - execPrice) < 0.0001) {
              matchedCount++;
            } else {
              mismatchedCount++;
            }
          } else {
            mismatchedCount++;
          }
        }

        brokerVerification = {
          evidenceCount: brokerEvidenceEvents.length,
          matchedCount,
          mismatchedCount,
        };
      }

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
        lifecycle: instance
          ? {
              phase: instance.lifecyclePhase,
              provenAt: instance.provenAt,
              retiredAt: instance.retiredAt,
              peakScore: instance.peakScore,
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
        metrics,
        drawdownDuration: drawdownState?.maxDrawdownDurationSec ?? 0,
        brokerVerification,
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
    lifecycle: null,
    chain: null,
    equityCurve: [],
    metrics: null,
    drawdownDuration: 0,
    brokerVerification: null,
    settings: {
      showEquityCurve: page.showEquityCurve,
      showTradeLog: page.showTradeLog,
      showHealthStatus: page.showHealthStatus,
    },
  });
}
