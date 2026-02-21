import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";
import { ErrorCode, apiError } from "@/lib/error-codes";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// GET /api/live/[instanceId]/health/history — health snapshots over time
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { instanceId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier !== "ELITE") {
    return NextResponse.json(
      apiError(
        ErrorCode.PLAN_REQUIRED,
        "Health history requires Elite",
        "Upgrade to Elite to access strategy health history and trend analysis."
      ),
      { status: 403 }
    );
  }

  // Verify ownership
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  const limit = Math.min(
    100,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "30", 10) || 30)
  );

  const snapshots = await prisma.healthSnapshot.findMany({
    where: { instanceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ snapshots });
}
