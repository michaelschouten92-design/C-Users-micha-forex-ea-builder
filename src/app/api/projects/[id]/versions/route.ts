import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVersionSchema, formatZodErrors } from "@/lib/validations";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

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
      buildJson: true, // Include buildJson to avoid N+1 queries when loading versions
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
  const validation = createVersionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: formatZodErrors(validation.error) },
      { status: 400 }
    );
  }

  const { buildJson } = validation.data;

  // Get the next version number
  const lastVersion = await prisma.buildVersion.findFirst({
    where: { projectId: id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });

  const nextVersionNo = (lastVersion?.versionNo ?? 0) + 1;

  // Update metadata timestamps
  const now = new Date().toISOString();
  const updatedBuildJson = {
    ...buildJson,
    metadata: {
      ...buildJson.metadata,
      updatedAt: now,
    },
  };

  // Create the new version
  const version = await prisma.buildVersion.create({
    data: {
      projectId: id,
      versionNo: nextVersionNo,
      buildJson: updatedBuildJson as Prisma.InputJsonValue,
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
