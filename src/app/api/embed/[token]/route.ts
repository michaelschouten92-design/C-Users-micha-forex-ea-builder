import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, publicApiRateLimiter, getClientIp } from "@/lib/rate-limit";

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
    .catch(() => {});

  const inst = bundle.instance;

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
    verified: true,
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
