import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMQL5Code } from "@/lib/mql5-generator";
import { checkExportLimit, canExportMQL5, canUseTradeManagement } from "@/lib/plan-limits";
import { exportRequestSchema, buildJsonSchema, formatZodErrors } from "@/lib/validations";
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
        {
          error: "Export limit reached",
          details: `You've used ${exportLimit.current} of ${exportLimit.max} exports this month. Upgrade to Pro for unlimited exports.`,
        },
        { status: 403 }
      );
    }

    // Check MQL5 export permission (Starter and Pro can export)
    const canExport = await canExportMQL5(session.user.id);
    if (!canExport) {
      return NextResponse.json(
        {
          error: "Export not available",
          details: "MQL5 export requires a Starter or Pro plan. Upgrade to export your strategies.",
        },
        { status: 403 }
      );
    }

    // Fetch the project with the specified version
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
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

    // Validate buildJson from database
    const buildJsonValidation = buildJsonSchema.safeParse(version.buildJson);
    if (!buildJsonValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid strategy data",
          details: formatZodErrors(buildJsonValidation.error)
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

    // Check if user is using trade management nodes (Pro only)
    const tradeManagementTypes = ["breakeven-stop", "trailing-stop", "partial-close", "lock-profit"];
    const hasTradeManagement = buildJson.nodes.some(
      (n) => tradeManagementTypes.includes(n.type as string) || (n.data && "managementType" in n.data)
    );

    if (hasTradeManagement) {
      const canUseTM = await canUseTradeManagement(session.user.id);
      if (!canUseTM) {
        return NextResponse.json(
          {
            error: "Pro feature required",
            details: "Trade Management blocks (Breakeven Stop, Trailing Stop, Partial Close, Lock Profit) are only available for Pro users. Upgrade to Pro to use these features.",
          },
          { status: 403 }
        );
      }
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

  try {
    const exports = await prisma.exportJob.findMany({
      where: {
        projectId: id,
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        buildVersion: {
          select: { versionNo: true },
        },
      },
    });

    return NextResponse.json(exports);
  } catch (error) {
    log.error({ error: extractErrorDetails(error), projectId: id }, "Failed to fetch export history");
    return NextResponse.json(
      { error: "Failed to fetch export history" },
      { status: 500 }
    );
  }
}

function validateBuildJson(buildJson: BuildJsonSchema): string[] {
  const errors: string[] = [];

  if (!buildJson.nodes || buildJson.nodes.length === 0) {
    errors.push("No nodes found. Add at least one timing block and indicator.");
    return errors;
  }

  // Check for timing node (required)
  const timingTypes = ["always", "custom-times", "trading-session"];
  const hasTimingNode = buildJson.nodes.some(
    (n) => timingTypes.includes(n.type as string) || (n.data && "timingType" in n.data)
  );

  if (!hasTimingNode) {
    errors.push("No timing block found. Add a 'When to trade' block (Always, Custom Times, or Trading Sessions).");
  }

  // Check by node type OR by data properties (for flexibility)
  const indicatorTypes = ["moving-average", "rsi", "macd", "bollinger-bands", "atr", "adx"];
  const hasIndicator = buildJson.nodes.some(
    (n) => indicatorTypes.includes(n.type as string) || (n.data && "indicatorType" in n.data)
  );

  if (!hasIndicator) {
    errors.push("No indicator nodes found. Add at least one indicator (MA, RSI, MACD, or Bollinger Bands).");
  }

  return errors;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}
