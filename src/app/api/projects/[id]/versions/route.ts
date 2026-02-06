import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVersionSchema, formatZodErrors } from "@/lib/validations";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

class VersionConflictError extends Error {
  constructor(public actual: number, public expected: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
  }
}

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

  const rawBody = await request.text();
  if (rawBody.length > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Request too large", details: "Maximum request size is 5MB" },
      { status: 413 }
    );
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }
  const validation = createVersionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: formatZodErrors(validation.error) },
      { status: 400 }
    );
  }

  const { buildJson, expectedVersion } = validation.data;

  // Use transaction for atomic version check + create (optimistic locking)
  try {
    const version = await prisma.$transaction(async (tx) => {
      // Get the current latest version number
      const lastVersion = await tx.buildVersion.findFirst({
        where: { projectId: id },
        orderBy: { versionNo: "desc" },
        select: { versionNo: true },
      });

      const currentVersionNo = lastVersion?.versionNo ?? 0;

      // Optimistic locking: reject if expectedVersion doesn't match
      if (expectedVersion !== undefined && expectedVersion !== currentVersionNo) {
        throw new VersionConflictError(currentVersionNo, expectedVersion);
      }

      const nextVersionNo = currentVersionNo + 1;

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
      return tx.buildVersion.create({
        data: {
          projectId: id,
          versionNo: nextVersionNo,
          buildJson: updatedBuildJson as Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json(
      {
        id: version.id,
        versionNo: version.versionNo,
        createdAt: version.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return NextResponse.json(
        {
          error: "Version conflict",
          details: `Expected version ${error.expected}, but current version is ${error.actual}. Another save may have occurred.`,
          currentVersion: error.actual,
        },
        { status: 409 }
      );
    }
    throw error;
  }
}
