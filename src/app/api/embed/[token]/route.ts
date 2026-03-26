import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkRateLimit, publicApiRateLimiter, getClientIp } from "@/lib/rate-limit";
import { verifyChain } from "@/lib/track-record/chain-verifier";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(request);

  const rateLimitResult = await checkRateLimit(publicApiRateLimiter, `embed:${ip}`);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const bundle = await prisma.sharedProofBundle.findUnique({
    where: { token },
    include: {
      instance: {
        select: {
          id: true,
          eaName: true,
          symbol: true,
          timeframe: true,
          broker: true,
          totalTrades: true,
          totalProfit: true,
          balance: true,
          equity: true,
          status: true,
          heartbeats: {
            orderBy: { createdAt: "desc" },
            take: 100,
            select: { equity: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!bundle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check expiration
  if (bundle.expiresAt && new Date() > bundle.expiresAt) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Increment access count (fire-and-forget)
  prisma.sharedProofBundle
    .update({
      where: { id: bundle.id },
      data: { accessCount: { increment: 1 } },
    })
    .catch((err) => {
      logger.error({ err, bundleId: bundle.id }, "Failed to increment embed access count");
    });

  const inst = bundle.instance;

  // Verify chain integrity via cryptographic hash-chain walk
  const [trackState, chainEvents] = await Promise.all([
    prisma.trackRecordState.findUnique({
      where: { instanceId: inst.id },
      select: { lastSeqNo: true },
    }),
    prisma.trackRecordEvent.findMany({
      where: { instanceId: inst.id },
      orderBy: { seqNo: "asc" },
      take: 200,
      select: { instanceId: true, seqNo: true, eventType: true, eventHash: true, prevHash: true, payload: true, timestamp: true },
    }),
  ]);
  let verified = false;
  if (trackState && trackState.lastSeqNo > 0 && chainEvents.length > 0) {
    const result = verifyChain(chainEvents as Parameters<typeof verifyChain>[0], inst.id);
    verified = result.valid && result.chainLength === trackState.lastSeqNo;
  }

  // Calculate metrics from heartbeats
  const heartbeats = inst.heartbeats.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let maxDD = 0;
  let peak = heartbeats[0]?.equity ?? 0;
  for (const hb of heartbeats) {
    if (hb.equity > peak) peak = hb.equity;
    if (peak > 0) {
      const dd = ((peak - hb.equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }

  // Calculate return %
  const initialEquity = heartbeats[0]?.equity ?? inst.balance ?? 0;
  const currentEquity = inst.equity ?? inst.balance ?? 0;
  const returnPct = initialEquity > 0 ? ((currentEquity - initialEquity) / initialEquity) * 100 : 0;

  // Calculate win rate from bundleJson if available
  const bundleData = bundle.bundleJson as Record<string, unknown> | null;
  const winRate = bundleData?.winRate as number | undefined;

  // Sharpe from bundleJson
  const sharpe = bundleData?.sharpeRatio as number | undefined;

  // Period
  const firstDate = heartbeats[0]?.createdAt;
  const lastDate = heartbeats[heartbeats.length - 1]?.createdAt;

  const data = {
    eaName: inst.eaName,
    symbol: inst.symbol,
    timeframe: inst.timeframe,
    broker: inst.broker,
    returnPct: Math.round(returnPct * 10) / 10,
    maxDrawdownPct: Math.round(maxDD * 10) / 10,
    winRate: winRate ?? null,
    totalTrades: inst.totalTrades,
    sharpeRatio: sharpe ?? null,
    period:
      firstDate && lastDate
        ? `${new Date(firstDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${new Date(lastDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
        : null,
    verified,
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
