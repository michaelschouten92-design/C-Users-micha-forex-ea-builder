import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMQL5Code } from "@/lib/mql5-generator";
import { checkExportLimit, getExportPermissions } from "@/lib/plan-limits";
import {
  exportRequestSchema,
  buildJsonSchema,
  formatZodErrors,
  checkBodySize,
  checkContentType,
} from "@/lib/validations";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { migrateProjectData } from "@/lib/migrations";
import {
  exportRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { BuildJsonSchema } from "@/types/builder";

type Props = {
  params: Promise<{ id: string }>;
};

// POST /api/projects/[id]/export - Generate MQL5 code
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;
  const log = createApiLogger("/api/projects/[id]/export", "POST", session?.user?.id);

  if (!session?.user?.id) {
    log.warn("Unauthorized export attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Require verified email before allowing exports
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before exporting." },
      { status: 403 }
    );
  }

  // Check rate limit (10 exports per hour per user)
  const rateLimitResult = await checkRateLimit(exportRateLimiter, session.user.id);
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.success) {
    log.warn({ remaining: rateLimitResult.remaining }, "Rate limit exceeded for export");
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        details: formatRateLimitError(rateLimitResult),
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    );
  }

  // Validate request
  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();
    const validation = exportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const { versionId, exportType } = validation.data;

    // Audit the export request
    await audit.exportRequest(session.user.id, id, exportType);

    // Check export limits (plan-based monthly limits)
    const exportLimit = await checkExportLimit(session.user.id);
    if (!exportLimit.allowed) {
      return NextResponse.json(
        apiError(
          ErrorCode.EXPORT_LIMIT,
          "Export limit reached",
          `You've used ${exportLimit.current} of ${exportLimit.max} exports this month. Upgrade to Pro for unlimited exports.`
        ),
        { status: 403 }
      );
    }

    // Check MQL5 export permission and trade management in one lookup
    const permissions = await getExportPermissions(session.user.id);
    if (!permissions.canExportMQL5) {
      return NextResponse.json(
        apiError(
          ErrorCode.PLAN_REQUIRED,
          "Export not available",
          "MQL5 export requires a Starter or Pro plan. Upgrade to export your strategies."
        ),
        { status: 403 }
      );
    }

    // Fetch the project with the specified version
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        versions: versionId
          ? { where: { id: versionId } }
          : { orderBy: { versionNo: "desc" }, take: 1 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.versions.length === 0) {
      return NextResponse.json(
        { error: "No version found. Please save your strategy first." },
        { status: 400 }
      );
    }

    const version = project.versions[0];

    // Migrate data to current schema version before validation
    const migratedBuildJson = migrateProjectData(version.buildJson);

    // Validate buildJson from database
    const buildJsonValidation = buildJsonSchema.safeParse(migratedBuildJson);
    if (!buildJsonValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid strategy data",
          details: formatZodErrors(buildJsonValidation.error),
        },
        { status: 400 }
      );
    }
    const buildJson = buildJsonValidation.data as BuildJsonSchema;

    // Validate the build JSON has necessary components
    const validationErrors = validateBuildJson(buildJson);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Strategy validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Generate MQL5 code
    const mql5Code = generateMQL5Code(buildJson, project.name);

    // Create export job record
    const exportJob = await prisma.exportJob.create({
      data: {
        userId: session.user.id,
        projectId: project.id,
        buildVersionId: version.id,
        exportType: exportType || "MQ5",
        status: "DONE",
        outputName: `${sanitizeFileName(project.name)}.mq5`,
      },
    });

    log.info(
      { projectId: project.id, exportId: exportJob.id, versionNo: version.versionNo },
      "Export completed successfully"
    );

    // Audit successful export
    await audit.exportComplete(session.user.id, project.id, exportJob.id);

    return NextResponse.json(
      {
        success: true,
        exportId: exportJob.id,
        fileName: exportJob.outputName,
        code: mql5Code,
        versionNo: version.versionNo,
        exportType: "MQ5",
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    log.error({ error: extractErrorDetails(error), projectId: id }, "Export failed");

    // Audit failed export
    if (session?.user?.id) {
      await audit.exportFailed(session.user.id, id, String(error));
    }

    return NextResponse.json(
      { error: "Failed to generate MQL5 code" },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

// GET /api/projects/[id]/export - Get export history
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;
  const log = createApiLogger("/api/projects/[id]/export", "GET", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateLimitResult = await checkRateLimit(exportRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(request.nextUrl.searchParams.get("pageSize") ?? "10", 10) || 10)
    );
    const skip = (page - 1) * pageSize;

    const [exports, total] = await Promise.all([
      prisma.exportJob.findMany({
        where: {
          projectId: id,
          userId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          buildVersion: {
            select: { versionNo: true },
          },
        },
      }),
      prisma.exportJob.count({
        where: {
          projectId: id,
          userId: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      data: exports,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error(
      { error: extractErrorDetails(error), projectId: id },
      "Failed to fetch export history"
    );
    return NextResponse.json({ error: "Failed to fetch export history" }, { status: 500 });
  }
}

function validateBuildJson(buildJson: BuildJsonSchema): string[] {
  const errors: string[] = [];

  if (!buildJson.nodes || buildJson.nodes.length === 0) {
    errors.push("No nodes found. Add a timing block and an entry strategy.");
    return errors;
  }

  // Entry strategy blocks contain signal, SL, TP, and position sizing
  const hasEntryStrategy = buildJson.nodes.some((n) => n.data && "entryType" in n.data);

  // Check for timing node (required)
  const timingTypes = ["always", "custom-times", "trading-session"];
  const hasTimingNode = buildJson.nodes.some(
    (n) => timingTypes.includes(n.type as string) || (n.data && "timingType" in n.data)
  );

  if (!hasTimingNode) {
    errors.push(
      "No timing block found. Add a timing block (Always, Custom Times, or Trading Sessions)."
    );
  }

  if (!hasEntryStrategy) {
    errors.push(
      "No entry strategy found. Add an entry strategy block to define your trading logic."
    );
  }

  return errors;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}
