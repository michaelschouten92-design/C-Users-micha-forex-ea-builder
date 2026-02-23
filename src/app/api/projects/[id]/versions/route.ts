import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVersionSchema, formatZodErrors, checkContentType } from "@/lib/validations";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

class VersionConflictError extends Error {
  constructor(
    public actual: number,
    public expected: number
  ) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
  }
}

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/versions - List versions for a project (paginated)
export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = Math.min(
      10000,
      Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
    );
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20)
    );
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      prisma.buildVersion.findMany({
        where: { projectId: id },
        orderBy: { versionNo: "desc" },
        select: {
          id: true,
          versionNo: true,
          createdAt: true,
          isAutosave: true,
        },
        skip,
        take: limit,
      }),
      prisma.buildVersion.count({
        where: { projectId: id },
      }),
    ]);

    return NextResponse.json({
      data: versions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error, projectId: id }, "Failed to fetch versions");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/versions - Create a new version
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const { id } = await params;

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

  // Validate content type
  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Early rejection based on Content-Length header before reading the body
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Request too large", details: "Maximum request size is 5MB" },
      { status: 413 }
    );
  }

  // Fallback: check actual body size after reading (Content-Length can be absent or spoofed)
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const validation = createVersionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: formatZodErrors(validation.error) },
      { status: 400 }
    );
  }

  const { buildJson, expectedVersion, isAutosave } = validation.data;

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
      const newVersion = await tx.buildVersion.create({
        data: {
          projectId: id,
          versionNo: nextVersionNo,
          buildJson: updatedBuildJson as Prisma.InputJsonValue,
          isAutosave: isAutosave ?? false,
        },
      });

      // Cleanup old autosaves within the same transaction for consistency
      if (isAutosave) {
        try {
          const oldAutosaves = await tx.buildVersion.findMany({
            where: { projectId: id, isAutosave: true },
            orderBy: { versionNo: "desc" },
            select: { id: true },
            skip: 5,
          });
          if (oldAutosaves.length > 0) {
            await tx.buildVersion.deleteMany({
              where: { id: { in: oldAutosaves.map((v) => v.id) } },
            });
          }
        } catch (cleanupError) {
          logger.warn(
            { error: cleanupError, projectId: id },
            "Autosave cleanup failed — old autosaves may accumulate"
          );
        }
      }

      return newVersion;
    });

    // Quick validation warnings (non-blocking, helps users catch issues before export)
    const warnings: string[] = [];
    const nodes = buildJson.nodes ?? [];
    const edges = buildJson.edges ?? [];

    if (nodes.length > 0) {
      const timingTypes = ["always", "custom-times", "trading-session"];
      const hasTimingNode = nodes.some(
        (n: Record<string, unknown>) =>
          timingTypes.includes(n.type as string) ||
          (n.data &&
            typeof n.data === "object" &&
            "timingType" in (n.data as Record<string, unknown>))
      );
      if (!hasTimingNode) {
        warnings.push("No timing block found — add a 'When to trade' block.");
      }

      const hasSignalNode = nodes.some((n: Record<string, unknown>) =>
        [
          "moving-average",
          "rsi",
          "macd",
          "bollinger-bands",
          "atr",
          "adx",
          "stochastic",
          "candlestick-pattern",
          "support-resistance",
          "range-breakout",
        ].includes(n.type as string)
      );
      if (!hasSignalNode) {
        warnings.push("No entry strategy found — add an entry strategy block.");
      }

      const hasTradeNode = nodes.some(
        (n: Record<string, unknown>) => n.type === "place-buy" || n.type === "place-sell"
      );
      if (!hasTradeNode) {
        warnings.push("No trade action — add a Place Buy or Place Sell block.");
      }

      // Check for disconnected nodes
      const connectedIds = new Set<string>();
      const queue: string[] = nodes
        .filter((n: Record<string, unknown>) => timingTypes.includes(n.type as string))
        .map((n: Record<string, unknown>) => n.id as string);
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (connectedIds.has(current)) continue;
        connectedIds.add(current);
        for (const e of edges) {
          const edge = e as Record<string, unknown>;
          if (edge.source === current && !connectedIds.has(edge.target as string)) {
            queue.push(edge.target as string);
          }
        }
      }
      const disconnected = nodes.filter(
        (n: Record<string, unknown>) =>
          !connectedIds.has(n.id as string) && !timingTypes.includes(n.type as string)
      );
      if (disconnected.length > 0) {
        warnings.push(`${disconnected.length} disconnected node(s) — connect them or remove them.`);
      }
    }

    return NextResponse.json(
      {
        id: version.id,
        versionNo: version.versionNo,
        createdAt: version.createdAt,
        ...(warnings.length > 0 ? { warnings } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return NextResponse.json(
        apiError(
          ErrorCode.VERSION_CONFLICT,
          "Version conflict",
          "Version conflict — please refresh and try again."
        ),
        { status: 409 }
      );
    }
    // Handle Prisma unique constraint violation (concurrent saves with same versionNo)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        apiError(
          ErrorCode.VERSION_CONFLICT,
          "Version conflict",
          "Concurrent save detected. Please try again."
        ),
        { status: 409 }
      );
    }
    logger.error({ error }, "Failed to create version");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
