import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyChain, type StoredEvent } from "@/lib/track-record/chain-verifier";
import { verifyCheckpointHmac } from "@/lib/track-record/checkpoint";
import { stateFromDb } from "@/lib/track-record/state-manager";
import {
  verifyRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
  checkRateLimit,
} from "@/lib/rate-limit";

const verifySchema = z.object({
  instanceId: z.string().min(1),
});

// GET /api/track-record/verify?instanceId=... — public chain verification
export async function GET(request: NextRequest) {
  // Rate limit check
  const clientIp = getClientIp(request);
  const rateLimitResult = await checkRateLimit(verifyRateLimiter, clientIp);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const instanceId = request.nextUrl.searchParams.get("instanceId");
  if (!instanceId) {
    return NextResponse.json({ error: "instanceId is required" }, { status: 400 });
  }

  const validation = verifySchema.safeParse({ instanceId });
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid instanceId" }, { status: 400 });
  }

  try {
    // Verify the instance exists and is not deleted
    const instance = await prisma.liveEAInstance.findFirst({
      where: { id: instanceId, deletedAt: null },
      select: { id: true },
    });

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    // Guard against DoS: cap event count
    const eventCount = await prisma.trackRecordEvent.count({ where: { instanceId } });
    if (eventCount > 50000) {
      return NextResponse.json(
        { error: "Instance has too many events for full verification. Use proof bundles." },
        { status: 413 }
      );
    }

    // Load all events for this instance
    const events = await prisma.trackRecordEvent.findMany({
      where: { instanceId },
      orderBy: { seqNo: "asc" },
      select: {
        instanceId: true,
        seqNo: true,
        eventType: true,
        eventHash: true,
        prevHash: true,
        payload: true,
        timestamp: true,
      },
    });

    // Verify the hash chain
    const chainResult = verifyChain(
      events.map((e) => ({
        ...e,
        payload: e.payload as Record<string, unknown>,
      })) as StoredEvent[],
      instanceId
    );

    // Verify latest checkpoint HMAC
    let checkpointVerified = false;
    let checkpointCount = 0;
    let lastCheckpointHmac: string | null = null;

    const latestCheckpoint = await prisma.trackRecordCheckpoint.findFirst({
      where: { instanceId },
      orderBy: { seqNo: "desc" },
    });

    if (latestCheckpoint) {
      checkpointCount = await prisma.trackRecordCheckpoint.count({
        where: { instanceId },
      });
      lastCheckpointHmac = latestCheckpoint.hmac;

      // Load state to verify HMAC
      const dbState = await prisma.trackRecordState.findUnique({
        where: { instanceId },
      });

      if (dbState) {
        const state = stateFromDb(dbState);
        // Verify against checkpoint's state, not current state
        const checkpointState = {
          ...state,
          lastSeqNo: latestCheckpoint.seqNo,
          balance: latestCheckpoint.balance,
          equity: latestCheckpoint.equity,
          highWaterMark: latestCheckpoint.highWaterMark,
          maxDrawdown: latestCheckpoint.maxDrawdown,
          maxDrawdownPct: latestCheckpoint.maxDrawdownPct,
          totalTrades: latestCheckpoint.totalTrades,
          totalProfit: latestCheckpoint.totalProfit,
          totalSwap: latestCheckpoint.totalSwap,
          totalCommission: latestCheckpoint.totalCommission,
          winCount: latestCheckpoint.winCount,
          lossCount: latestCheckpoint.lossCount,
        };
        checkpointVerified = verifyCheckpointHmac(
          instanceId,
          checkpointState,
          latestCheckpoint.hmac
        );
      }
    }

    return NextResponse.json({
      instanceId,
      chain: {
        valid: chainResult.valid,
        length: chainResult.chainLength,
        firstEventHash: chainResult.firstEventHash,
        lastEventHash: chainResult.lastEventHash,
        ...(chainResult.error ? { error: chainResult.error } : {}),
        ...(chainResult.breakAtSeqNo != null ? { breakAtSeqNo: chainResult.breakAtSeqNo } : {}),
      },
      checkpoints: {
        count: checkpointCount,
        lastHmac: lastCheckpointHmac,
        verified: checkpointVerified,
      },
      verified: chainResult.valid && (checkpointCount === 0 || checkpointVerified),
    });
  } catch (error) {
    console.error("Track record verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
