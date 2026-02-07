import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; versionId: string }> };

// GET /api/projects/[id]/versions/[versionId] - Get a specific version
export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  const { id, versionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const version = await prisma.buildVersion.findFirst({
    where: {
      id: versionId,
      projectId: id,
    },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json(version);
}
