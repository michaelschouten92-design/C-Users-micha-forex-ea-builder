import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { getHealthWithFreshness } from "@/lib/strategy-health";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// GET /api/live/[instanceId]/health — latest health assessment
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
        "Strategy Health Monitor requires Elite",
        "Upgrade to Elite to access strategy health monitoring, edge degradation alerts, and drawdown analysis."
      ),
      { status: 403 }
    );
  }

  // Verify ownership
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  const { snapshot, fresh } = await getHealthWithFreshness(instanceId);

  return NextResponse.json({ health: snapshot, fresh });
}
