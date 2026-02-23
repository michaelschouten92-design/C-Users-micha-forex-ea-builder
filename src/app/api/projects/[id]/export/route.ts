import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMQL5Code } from "@/lib/mql5-generator";
import { checkExportLimit, getCachedTier } from "@/lib/plan-limits";
import { PLANS } from "@/lib/plans";
import {
  exportRequestSchema,
  buildJsonSchema,
  formatZodErrors,
  safeReadJson,
  checkContentType,
} from "@/lib/validations";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { migrateProjectData } from "@/lib/migrations";
import {
  exportRateLimiter,
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import {
  computeStrategyFingerprint,
  ensureStrategyIdentity,
  recordStrategyVersion,
} from "@/lib/strategy-identity";
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

  if (session.user.suspended) {
    return NextResponse.json(apiError(ErrorCode.ACCOUNT_SUSPENDED, "Account suspended"), {
      status: 403,
    });
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

  const result = await safeReadJson(request);
  if ("error" in result) return result.error;
  const body = result.data;

  try {
    const validation = exportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const { versionId, magicNumber } = validation.data;

    // Single tier lookup — reused for export limits and transaction
    const tier = await getCachedTier(session.user.id);

    // Audit the export request
    await audit.exportRequest(session.user.id, id, "MQ5");

    // Check export limits (plan-based monthly limits) — pre-check outside transaction
    // for fast rejection. The authoritative check happens atomically inside the
    // transaction below, preventing race conditions.
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

    // Override magic number for this export if provided
    if (magicNumber) {
      buildJson.settings = { ...buildJson.settings, magicNumber };
    }

    // Generate telemetry API key for live tracking
    // SECURITY NOTE: This key is embedded in the exported EA source code. Anyone with access to
    // the EA file can extract it and send telemetry data. Telemetry integrity depends on the EA
    // source remaining private. If EAs are distributed, consider scoping writes per MT account.
    const telemetryApiKey = randomBytes(32).toString("hex");
    const telemetryApiKeyHash = createHash("sha256").update(telemetryApiKey).digest("hex");

    // Generate MQL5 code (pass telemetry API key)
    const telemetryBaseUrl = env.NEXT_PUBLIC_APP_URL || env.AUTH_URL || "https://algo-studio.com";
    const generatedCode = generateMQL5Code(
      buildJson,
      project.name,
      project.description ?? undefined,
      {
        apiKey: telemetryApiKey,
        baseUrl: `${telemetryBaseUrl}/api/telemetry`,
      }
    );
    const fileExtension = ".mq5";

    // Atomically check limit + create export job + LiveEAInstance inside a transaction
    const maxExports = PLANS[tier].limits.maxExportsPerMonth;
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const exportJob = await prisma.$transaction(async (tx) => {
      const currentCount = await tx.exportJob.count({
        where: { userId: session.user.id, createdAt: { gte: startOfMonth }, deletedAt: null },
      });
      if (currentCount >= maxExports) {
        return null;
      }
      const job = await tx.exportJob.create({
        data: {
          userId: session.user.id,
          projectId: project.id,
          buildVersionId: version.id,
          exportType: "MQ5",
          status: "DONE",
          outputName: `${sanitizeFileName(project.name)}${fileExtension}`,
        },
      });

      // Compute strategy fingerprint and ensure identity + version exist
      const fingerprintResult = computeStrategyFingerprint(
        buildJson as unknown as Parameters<typeof computeStrategyFingerprint>[0]
      );
      const identity = await ensureStrategyIdentity(tx, project.id, fingerprintResult.fingerprint);
      const strategyVersion = await recordStrategyVersion(
        tx,
        identity.id,
        version.id,
        fingerprintResult
      );

      // Create LiveEAInstance for telemetry tracking (linked to strategy version)
      const liveEA = await tx.liveEAInstance.create({
        data: {
          exportJobId: job.id,
          userId: session.user.id,
          apiKeyHash: telemetryApiKeyHash,
          eaName: project.name,
          mode: "LIVE",
          strategyVersionId: strategyVersion.id,
        },
      });

      // Initialize TrackRecordState for the event-sourced track record system
      await tx.trackRecordState.create({
        data: { instanceId: liveEA.id },
      });

      return job;
    });

    if (!exportJob) {
      return NextResponse.json(
        apiError(
          ErrorCode.EXPORT_LIMIT,
          "Export limit reached",
          `You've reached your monthly export limit. Upgrade to Pro for unlimited exports.`
        ),
        { status: 403 }
      );
    }

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
        code: generatedCode,
        versionNo: version.versionNo,
        exportType: "MQ5",
        telemetryApiKey,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    log.error({ error: extractErrorDetails(error), projectId: id }, "Export failed");

    // Audit failed export (fire-and-forget to avoid masking the original error)
    if (session?.user?.id) {
      const details = extractErrorDetails(error);
      audit.exportFailed(session.user.id, id, details.message ?? "Unknown error").catch(() => {});
    }

    return NextResponse.json(
      {
        error:
          "Export failed — your strategy may contain unsupported configuration. Try simplifying your setup or contact support if the issue persists.",
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

// GET /api/projects/[id]/export - Get export history or re-download a previous export
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;
  const log = createApiLogger("/api/projects/[id]/export", "GET", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit (use general limiter for read-only history, not the export quota)
  const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  // Re-download a previous export (no credit cost)
  const redownloadId = request.nextUrl.searchParams.get("redownload");
  if (redownloadId) {
    try {
      const exportJob = await prisma.exportJob.findFirst({
        where: {
          id: redownloadId,
          projectId: id,
          userId: session.user.id,
        },
        select: {
          id: true,
          outputName: true,
          exportType: true,
          buildVersion: { select: { buildJson: true } },
          project: { select: { name: true, description: true } },
        },
      });

      if (!exportJob) {
        return NextResponse.json({ error: "Export not found" }, { status: 404 });
      }

      // Migrate and validate buildJson
      const migratedBuildJson = migrateProjectData(exportJob.buildVersion.buildJson);
      const buildJsonValidation = buildJsonSchema.safeParse(migratedBuildJson);
      if (!buildJsonValidation.success) {
        return NextResponse.json(
          { error: "Invalid strategy data in saved version" },
          { status: 400 }
        );
      }
      const buildJson = buildJsonValidation.data as BuildJsonSchema;

      // Generate new telemetry API key for redownload (old plaintext key is never stored)
      let telemetryConfig: { apiKey: string; baseUrl: string } | undefined;
      const liveEA = await prisma.liveEAInstance.findUnique({
        where: { exportJobId: redownloadId },
        select: { id: true },
      });
      if (liveEA) {
        const newApiKey = randomBytes(32).toString("hex");
        const newApiKeyHash = createHash("sha256").update(newApiKey).digest("hex");
        await prisma.liveEAInstance.update({
          where: { id: liveEA.id },
          data: { apiKeyHash: newApiKeyHash },
        });
        const telemetryBaseUrl =
          env.NEXT_PUBLIC_APP_URL || env.AUTH_URL || "https://algo-studio.com";
        telemetryConfig = { apiKey: newApiKey, baseUrl: `${telemetryBaseUrl}/api/telemetry` };
      }

      // Regenerate MQL5 code from the saved buildJson
      const redownloadCode = generateMQL5Code(
        buildJson,
        exportJob.project.name,
        exportJob.project.description ?? undefined,
        telemetryConfig
      );

      return NextResponse.json({
        fileName: exportJob.outputName,
        code: redownloadCode,
        telemetryApiKey: telemetryConfig?.apiKey,
      });
    } catch (error) {
      log.error(
        { error: extractErrorDetails(error), exportId: redownloadId },
        "Failed to re-download export"
      );
      return NextResponse.json({ error: "Failed to re-download export" }, { status: 500 });
    }
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
          deletedAt: null,
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
          deletedAt: null,
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
    errors.push("No nodes found. Add blocks to define your strategy.");
    return errors;
  }

  // Check for at least one trading node (place-buy or place-sell)
  const hasTradingNode = buildJson.nodes.some(
    (n) =>
      n.data &&
      "tradingType" in n.data &&
      ((n.data as Record<string, unknown>).tradingType === "place-buy" ||
        (n.data as Record<string, unknown>).tradingType === "place-sell")
  );

  if (!hasTradingNode) {
    errors.push(
      "No trading block found. Add a Place Buy or Place Sell block to define your trading logic."
    );
  }

  // Validate multi-pair symbol names if enabled
  const multiPair = buildJson.settings?.multiPair;
  if (multiPair?.enabled && multiPair.symbols?.length > 0) {
    const symbolPattern = /^[A-Za-z0-9._]{1,20}$/;
    for (const sym of multiPair.symbols) {
      if (sym.length > 0 && !symbolPattern.test(sym)) {
        errors.push(
          `Invalid symbol name "${sym}". Symbols must be 1-20 characters and contain only letters, numbers, dots, and underscores.`
        );
      }
    }
    if (multiPair.symbols.filter((s) => s.length > 0).length === 0) {
      errors.push("Multi-pair mode is enabled but no symbols are specified.");
    }
  }

  return errors;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}
