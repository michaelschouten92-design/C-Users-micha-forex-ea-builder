import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  publicApiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
  getClientIp,
} from "@/lib/rate-limit";

type Props = {
  params: Promise<{ token: string }>;
};

// GET /api/track-record/shared/[token] — public, return shared proof bundle
export async function GET(request: NextRequest, { params }: Props) {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `shared-proof:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const { token } = await params;

  const shared = await prisma.sharedProofBundle.findUnique({
    where: { token },
    include: {
      instance: {
        select: { eaName: true, symbol: true, broker: true, deletedAt: true },
      },
    },
  });

  if (!shared) {
    return NextResponse.json({ error: "Proof bundle not found" }, { status: 404 });
  }

  // Check if the underlying instance has been deleted
  if (shared.instance.deletedAt !== null) {
    return NextResponse.json(
      { error: "The instance associated with this proof bundle has been deleted" },
      { status: 410 }
    );
  }

  // Check expiry
  if (shared.expiresAt && shared.expiresAt < new Date()) {
    return NextResponse.json({ error: "This proof bundle has expired" }, { status: 410 });
  }

  // Increment access count (fire and forget)
  prisma.sharedProofBundle
    .update({
      where: { id: shared.id },
      data: { accessCount: { increment: 1 } },
    })
    .catch((err) => {
      logger.error({ err, bundleId: shared.id }, "Failed to increment shared bundle access count");
    });

  return NextResponse.json({
    bundle: shared.bundleJson,
    metadata: {
      eaName: shared.instance.eaName,
      symbol: shared.instance.symbol,
      broker: shared.instance.broker,
      createdAt: shared.createdAt,
      expiresAt: shared.expiresAt,
      accessCount: shared.accessCount + 1,
    },
  });
}
