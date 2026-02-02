import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { BuildJsonSchema } from "@/types/builder";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/versions - List all versions for a project
export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const versions = await prisma.buildVersion.findMany({
    where: { projectId: id },
    orderBy: { versionNo: "desc" },
    select: {
      id: true,
      versionNo: true,
      createdAt: true,
    },
  });

  return NextResponse.json(versions);
}

// POST /api/projects/[id]/versions - Create a new version
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const buildJson: BuildJsonSchema = body.buildJson;

  if (!buildJson) {
    return NextResponse.json({ error: "buildJson is required" }, { status: 400 });
  }

  // Validate buildJson structure
  if (buildJson.version !== "1.0") {
    return NextResponse.json({ error: "Invalid buildJson version" }, { status: 400 });
  }

  // Get the next version number
  const lastVersion = await prisma.buildVersion.findFirst({
    where: { projectId: id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });

  const nextVersionNo = (lastVersion?.versionNo ?? 0) + 1;

  // Update metadata timestamps
  const now = new Date().toISOString();
  buildJson.metadata = {
    ...buildJson.metadata,
    updatedAt: now,
  };

  // Create the new version
  const version = await prisma.buildVersion.create({
    data: {
      projectId: id,
      versionNo: nextVersionNo,
      buildJson: buildJson as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(
    {
      id: version.id,
      versionNo: version.versionNo,
      createdAt: version.createdAt,
    },
    { status: 201 }
  );
}
