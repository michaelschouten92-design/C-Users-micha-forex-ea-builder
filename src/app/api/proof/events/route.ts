import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logProofEvent, getSessionId, type ProofEventType } from "@/lib/proof/events";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

const eventSchema = z.object({
  type: z.enum([
    "proof_page_view",
    "share_click",
    "proof_link_copy",
    "profile_view",
    "leaderboard_view",
  ]),
  strategyId: z.string().optional(),
  ownerId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

/**
 * POST /api/proof/events — server-side event ingestion
 * No auth required (anonymous tracking with privacy-safe IP hashing)
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `proof-events:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = eventSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const { type, strategyId, ownerId, meta } = validation.data;
  const sessionId = getSessionId(request);

  // Fire and forget — don't block response on DB write
  logProofEvent({
    type: type as ProofEventType,
    strategyId,
    ownerId,
    sessionId,
    referrer: request.headers.get("referer") ?? undefined,
    ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
    meta,
  });

  const response = NextResponse.json({ ok: true });

  // Set session cookie if not present
  if (!request.cookies.get("proof_sid")) {
    response.cookies.set("proof_sid", sessionId, {
      maxAge: 365 * 86400,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
