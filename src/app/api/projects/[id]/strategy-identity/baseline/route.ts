import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";
import { ErrorCode, apiError } from "@/lib/error-codes";

type Props = {
  params: Promise<{ id: string }>;
};

// GET /api/projects/[id]/strategy-identity/baseline — get current baseline metrics
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(
        ErrorCode.PLAN_REQUIRED,
        "Backtest baseline requires Pro or Elite",
        "Upgrade to Pro to access backtest baselines."
      ),
      { status: 403 }
    );
  }

  const identity = await prisma.strategyIdentity.findUnique({
    where: { projectId: id },
    select: { currentVersionId: true },
  });

  if (!identity?.currentVersionId) {
    return NextResponse.json({ baseline: null });
  }

  const baseline = await prisma.backtestBaseline.findUnique({
    where: { strategyVersionId: identity.currentVersionId },
  });

  return NextResponse.json({ baseline });
}
