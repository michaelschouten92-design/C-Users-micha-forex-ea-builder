/**
 * GET /api/track-record/[token]
 *
 * Public endpoint — returns account-level track record data.
 * No auth required. Rate-limited by IP.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { loadTrackRecord } from "@/app/track-record/[token]/load-track-record";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `track-record:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const { token } = await params;
  const data = await loadTrackRecord(token);

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
