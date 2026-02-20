import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";
import { ErrorCode, apiError } from "@/lib/error-codes";

type Props = {
  params: Promise<{ id: string }>;
};

const verifiedPageSchema = z.object({
  isPublic: z.boolean().optional(),
  showEquityCurve: z.boolean().optional(),
  showTradeLog: z.boolean().optional(),
  showHealthStatus: z.boolean().optional(),
  pinnedInstanceId: z.string().nullable().optional(),
});

// POST /api/projects/[id]/verified-page — create/update verified page settings
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier !== "ELITE") {
    return NextResponse.json(
      apiError(
        ErrorCode.PLAN_REQUIRED,
        "Verified Strategy Page requires Elite",
        "Upgrade to Elite to create a public Verified Strategy Page and share your verified track record."
      ),
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = verifiedPageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Ensure strategy identity exists
  const identity = await prisma.strategyIdentity.findUnique({
    where: { projectId: id },
    select: { id: true, strategyId: true },
  });

  if (!identity) {
    return NextResponse.json(
      { error: "No strategy identity found. Export the project first." },
      { status: 400 }
    );
  }

  // Generate slug from strategy ID
  const slug = identity.strategyId.toLowerCase();

  const page = await prisma.verifiedStrategyPage.upsert({
    where: { strategyIdentityId: identity.id },
    create: {
      strategyIdentityId: identity.id,
      slug,
      ...validation.data,
    },
    update: validation.data,
  });

  return NextResponse.json({ page });
}

// GET /api/projects/[id]/verified-page — get current page settings
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier !== "ELITE") {
    return NextResponse.json(
      apiError(
        ErrorCode.PLAN_REQUIRED,
        "Verified Strategy Page requires Elite",
        "Upgrade to Elite to access Verified Strategy Page settings."
      ),
      { status: 403 }
    );
  }

  const identity = await prisma.strategyIdentity.findUnique({
    where: { projectId: id },
    select: { id: true },
  });

  if (!identity) {
    return NextResponse.json({ page: null });
  }

  const page = await prisma.verifiedStrategyPage.findUnique({
    where: { strategyIdentityId: identity.id },
  });

  return NextResponse.json({ page });
}
