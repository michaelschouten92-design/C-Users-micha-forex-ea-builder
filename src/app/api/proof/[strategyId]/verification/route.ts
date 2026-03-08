import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ strategyId: string }> };

/**
 * GET /api/proof/[strategyId]/verification — public verification data export
 * Returns hashes, chain info, and trade counts for independent verification.
 */
export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `proof-verification:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const { strategyId } = await params;

  const identity = await prisma.strategyIdentity.findUnique({
    where: { strategyId: strategyId.toUpperCase() },
    include: {
      publicPage: { select: { isPublic: true, pinnedInstanceId: true, ladderLevel: true } },
      versions: {
        orderBy: { versionNo: "desc" },
        take: 1,
        include: {
          binding: { select: { snapshotHash: true, baselineHash: true } },
        },
      },
      project: {
        select: {
          backtestUploads: {
            select: {
              runs: {
                orderBy: { createdAt: "desc" as const },
                take: 1,
                select: { totalTrades: true },
              },
            },
          },
        },
      },
    },
  });

  if (!identity || !identity.publicPage?.isPublic) {
    return NextResponse.json(
      { error: "Strategy not found" },
      { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  }

  const page = identity.publicPage;
  const latestVersion = identity.versions[0] ?? null;
  const binding = latestVersion?.binding ?? null;

  // Find latest backtest trade count
  let backtestTradeCount: number | null = null;
  for (const upload of identity.project?.backtestUploads ?? []) {
    if (upload.runs[0]) {
      backtestTradeCount = upload.runs[0].totalTrades;
      break;
    }
  }

  // Chain info from pinned instance
  let tradeChainHead: string | null = null;
  let tradeChainLength: number | null = null;
  let liveTradeCount: number | null = null;

  if (page.pinnedInstanceId) {
    const [trackState, eventCount] = await Promise.all([
      prisma.trackRecordState.findUnique({
        where: { instanceId: page.pinnedInstanceId },
        select: { lastEventHash: true, totalTrades: true },
      }),
      prisma.trackRecordEvent.count({
        where: { instanceId: page.pinnedInstanceId },
      }),
    ]);

    if (trackState) {
      tradeChainHead = trackState.lastEventHash;
      liveTradeCount = trackState.totalTrades;
    }
    tradeChainLength = eventCount;
  }

  return NextResponse.json(
    {
      strategyId: identity.strategyId,
      snapshotHash: binding?.snapshotHash ?? null,
      baselineMetricsHash: binding?.baselineHash ?? null,
      tradeChainHead,
      tradeChainLength,
      backtestTradeCount,
      liveTradeCount,
      ladderLevel: page.ladderLevel,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
