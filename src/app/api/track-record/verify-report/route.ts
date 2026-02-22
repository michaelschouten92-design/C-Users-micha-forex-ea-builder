import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { ProofBundle } from "@/lib/track-record/types";
import { verifyProofBundle } from "@/lib/track-record/verifier";
import { safeReadJson } from "@/lib/validations";
import {
  verifyRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
  getClientIp,
} from "@/lib/rate-limit";

const MAX_VERIFY_BODY = 5 * 1024 * 1024; // 5MB cap
const MAX_EVENTS = 10_000;

// POST /api/track-record/verify-report — verify a proof bundle (public, no auth needed)
export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rl = await checkRateLimit(verifyRateLimiter, `verify-report:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const result = await safeReadJson(request, MAX_VERIFY_BODY);
  if ("error" in result) return result.error;
  const body = result.data;

  // Basic shape validation
  const bundle = body as ProofBundle;
  if (
    !bundle?.report?.manifest ||
    !bundle?.report?.body ||
    !Array.isArray(bundle?.events) ||
    bundle.events.length > MAX_EVENTS
  ) {
    return NextResponse.json(
      { error: "Invalid proof bundle: missing report, manifest, or events" },
      { status: 400 }
    );
  }

  try {
    const result = verifyProofBundle(bundle);

    return NextResponse.json({
      verified: result.verified,
      level: result.level,
      summary: result.summary,
      l1: result.l1,
      l2: result.l2,
      l3: result.l3,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Proof bundle verification error"
    );
    return NextResponse.json(
      { error: "Verification failed due to internal error" },
      { status: 500 }
    );
  }
}
