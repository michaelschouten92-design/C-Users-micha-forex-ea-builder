import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Rate limit by IP to prevent abuse
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = await checkRateLimit(apiRateLimiter, `health:${ip}`);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    healthy = false;
  }

  // Only return status — no internal details like latency
  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
