import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { generateProofBundle } from "@/lib/track-record/proof-bundle";
import {
  exportRateLimiter,
  checkRateLimit,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// GET /api/track-record/report/[instanceId] — generate investor-proof report with verification
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(exportRateLimiter, `tr-report:${session.user.id}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(
        ErrorCode.PLAN_REQUIRED,
        "Verified Track Record requires Pro or Elite",
        "Upgrade to Pro to download proof bundles and verified track record reports."
      ),
      { status: 403 }
    );
  }

  const { instanceId } = await params;

  // Verify the user owns this instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true, eaName: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  // Parse optional seqNo range from query params
  const fromSeqNo = request.nextUrl.searchParams.get("fromSeqNo");
  const toSeqNo = request.nextUrl.searchParams.get("toSeqNo");

  try {
    const bundle = await generateProofBundle(
      instanceId,
      fromSeqNo ? parseInt(fromSeqNo, 10) : undefined,
      toSeqNo ? parseInt(toSeqNo, 10) : undefined
    );

    const fileName = `proof-bundle-${instance.eaName.replace(/[^a-zA-Z0-9]/g, "_")}.json`;

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Track record report error"
    );
    return NextResponse.json({ error: "Failed to generate proof bundle" }, { status: 500 });
  }
}
