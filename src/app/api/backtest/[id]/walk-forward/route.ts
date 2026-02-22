import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runWalkForward } from "@/lib/backtest-parser/walk-forward";
import {
  checkRateLimit,
  walkForwardProRateLimiter,
  walkForwardEliteRateLimiter,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import type { ParsedDeal } from "@/lib/backtest-parser/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check subscription tier
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const tier = subscription?.tier ?? "FREE";
  if (tier === "FREE") {
    return NextResponse.json(
      { error: "Walk-forward analysis requires a Pro or Elite subscription" },
      { status: 403 }
    );
  }

  // Rate limit
  const limiter = tier === "ELITE" ? walkForwardEliteRateLimiter : walkForwardProRateLimiter;
  const rateLimitResult = await checkRateLimit(limiter, `walk-forward:${session.user.id}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Daily walk-forward analysis limit reached" },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  // Fetch backtest run
  const backtestRun = await prisma.backtestRun.findUnique({
    where: { id },
    include: { upload: { select: { userId: true } } },
  });

  if (!backtestRun || backtestRun.upload.userId !== session.user.id) {
    return NextResponse.json({ error: "Backtest not found" }, { status: 404 });
  }

  // Check if already computed
  if (backtestRun.walkForwardResult) {
    return NextResponse.json(backtestRun.walkForwardResult);
  }

  // Parse options from request body
  let numWindows = 5;
  let oosRatio = 0.2;
  try {
    const body = await request.json();
    if (body.numWindows) numWindows = Math.min(10, Math.max(3, body.numWindows));
    if (body.oosRatio) oosRatio = Math.min(0.4, Math.max(0.1, body.oosRatio));
  } catch {
    // Use defaults
  }

  // Run walk-forward analysis
  const deals = backtestRun.trades as unknown as ParsedDeal[];
  const result = runWalkForward(deals, backtestRun.initialDeposit, { numWindows, oosRatio });

  // Store result
  await prisma.backtestRun.update({
    where: { id },
    data: { walkForwardResult: JSON.parse(JSON.stringify(result)) },
  });

  return NextResponse.json(result);
}
