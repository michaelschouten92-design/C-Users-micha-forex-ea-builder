import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Verify project ownership before exposing baseline metrics
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
