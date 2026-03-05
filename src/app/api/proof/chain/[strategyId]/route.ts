import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { verifyProofChain, type StoredProofEvent } from "@/lib/proof/chain";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/proof/chain/[strategyId]" });

export const dynamic = "force-dynamic";

const WINDOW_SIZE = 50;
const STRATEGY_ID_PATTERN = /^AS-[A-F0-9]{6,10}$/i;
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
};

type Props = { params: Promise<{ strategyId: string }> };

type ChainStatus = "PASS" | "FAIL" | "UNKNOWN";

interface ChainResponse {
  strategyId: string;
  status: ChainStatus;
  checkedAt: string;
  head: { lastSequence: number; lastEventHashPrefix: string } | null;
  summary: { scannedFrom: number; scannedTo: number; breaks: number } | null;
  firstBreak: {
    sequence: number;
    expectedPrevHashPrefix: string;
    actualPrevHashPrefix: string;
    eventHashPrefix: string;
  } | null;
  errorCode?: string;
}

function prefix(hash: string | undefined | null): string {
  return hash ? hash.slice(0, 8) : "";
}

/**
 * GET /api/proof/chain/[strategyId] — public proof chain verification
 *
 * Read-only. Returns chain integrity status for a strategy's proof event log.
 * No auth required. No secrets in response. Only hash prefixes (8 chars).
 */
export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `proof-chain:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const { strategyId: rawId } = await params;
  const strategyId = rawId.toUpperCase();

  if (!STRATEGY_ID_PATTERN.test(strategyId)) {
    return NextResponse.json(
      { error: "Invalid strategyId format" },
      { status: 400, headers: CACHE_HEADERS }
    );
  }

  try {
    // 1. Read chain head
    const head = await prisma.proofChainHead.findUnique({
      where: { strategyId },
    });

    if (!head || head.lastSequence < 1) {
      const resp: ChainResponse = {
        strategyId,
        status: "UNKNOWN",
        checkedAt: new Date().toISOString(),
        head: null,
        summary: null,
        firstBreak: null,
        errorCode: "NO_CHAIN",
      };
      return NextResponse.json(resp, { headers: CACHE_HEADERS });
    }

    // 2. Compute scan window
    const scanFrom = Math.max(1, head.lastSequence - WINDOW_SIZE + 1);
    const scanTo = head.lastSequence;

    // 3. Fetch events in the window
    const events = await prisma.proofEventLog.findMany({
      where: {
        strategyId,
        sequence: { gte: scanFrom, lte: scanTo },
      },
      orderBy: { sequence: "asc" },
      select: {
        sequence: true,
        strategyId: true,
        type: true,
        sessionId: true,
        eventHash: true,
        prevEventHash: true,
        meta: true,
        createdAt: true,
      },
    });

    if (events.length === 0) {
      const resp: ChainResponse = {
        strategyId,
        status: "UNKNOWN",
        checkedAt: new Date().toISOString(),
        head: {
          lastSequence: head.lastSequence,
          lastEventHashPrefix: prefix(head.lastEventHash),
        },
        summary: null,
        firstBreak: null,
        errorCode: "NO_EVENTS",
      };
      return NextResponse.json(resp, { headers: CACHE_HEADERS });
    }

    // 4. Verify chain window
    const result = verifyProofChain(events as unknown as StoredProofEvent[], scanFrom);

    // 5. Build response
    let firstBreak: ChainResponse["firstBreak"] = null;
    if (!result.valid && result.breakAtSequence != null) {
      const brokenEvent = events.find((e) => e.sequence === result.breakAtSequence);
      // Find the event before the break to get expected prevHash
      const prevEvent = events.find((e) => e.sequence === result.breakAtSequence! - 1);
      firstBreak = {
        sequence: result.breakAtSequence,
        expectedPrevHashPrefix: prefix(prevEvent?.eventHash),
        actualPrevHashPrefix: prefix(brokenEvent?.prevEventHash),
        eventHashPrefix: prefix(brokenEvent?.eventHash),
      };
    }

    const resp: ChainResponse = {
      strategyId,
      status: result.valid ? "PASS" : "FAIL",
      checkedAt: new Date().toISOString(),
      head: {
        lastSequence: head.lastSequence,
        lastEventHashPrefix: prefix(head.lastEventHash),
      },
      summary: {
        scannedFrom: scanFrom,
        scannedTo: scanTo,
        breaks: result.valid ? 0 : 1,
      },
      firstBreak,
    };

    return NextResponse.json(resp, { headers: CACHE_HEADERS });
  } catch (err) {
    log.error({ err, strategyId }, "Proof chain verification failed");

    const resp: ChainResponse = {
      strategyId,
      status: "UNKNOWN",
      checkedAt: new Date().toISOString(),
      head: null,
      summary: null,
      firstBreak: null,
      errorCode: "INTERNAL_ERROR",
    };
    return NextResponse.json(resp, {
      status: 500,
      headers: CACHE_HEADERS,
    });
  }
}
