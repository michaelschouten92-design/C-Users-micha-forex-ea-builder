import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";
import { buildJsonSchema } from "@/lib/validations";
import { migrateProjectData } from "@/lib/migrations";

type Params = { params: Promise<{ id: string; versionId: string }> };

// POST /api/projects/[id]/versions/[versionId]/restore - Restore a previous version
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const { id, versionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create a new version from the old version's buildJson (inside transaction)
    const newVersion = await prisma.$transaction(async (tx) => {
      const sourceVersion = await tx.buildVersion.findFirst({
        where: { id: versionId, projectId: id },
      });

      if (!sourceVersion) return null;

      // Migrate and re-validate buildJson before restoring
      const migrated = migrateProjectData(sourceVersion.buildJson);
      const validation = buildJsonSchema.safeParse(migrated);
      if (!validation.success) {
        throw new Error("Version contains invalid strategy data and cannot be restored");
      }

      const lastVersion = await tx.buildVersion.findFirst({
        where: { projectId: id },
        orderBy: { versionNo: "desc" },
        select: { versionNo: true },
      });

      const nextVersionNo = (lastVersion?.versionNo ?? 0) + 1;

      // Update metadata timestamp (use migrated data)
      const buildJson = {
        ...migrated,
        metadata: {
          ...migrated.metadata,
          updatedAt: new Date().toISOString(),
          restoredFrom: sourceVersion.versionNo,
        },
      };

      return tx.buildVersion.create({
        data: {
          projectId: id,
          versionNo: nextVersionNo,
          buildJson: buildJson as unknown as Prisma.InputJsonValue,
        },
      });
    });

    if (!newVersion) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Suppress unused variable warning for request (required by Next.js route signature)
    void request;

    return NextResponse.json(
      {
        id: newVersion.id,
        versionNo: newVersion.versionNo,
        createdAt: newVersion.createdAt,
        restoredFromVersion: versionId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("invalid strategy data")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error({ error, projectId: id, versionId }, "Failed to restore version");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
