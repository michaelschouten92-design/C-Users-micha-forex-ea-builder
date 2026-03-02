import { NextRequest, NextResponse } from "next/server";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalAuditReplayRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { authenticateInternal, computeReplay, stableStringify, logAuditAccess } from "../_shared";

export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(internalAuditReplayRateLimiter, `internal-audit-bundle:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const recordId = request.nextUrl.searchParams.get("recordId");
  if (!recordId) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Missing required parameter: recordId"),
      { status: 400 }
    );
  }

  try {
    const result = await computeReplay(recordId);

    // Fetch config snapshot if configVersion is present
    const configVersion = result.extracted.configVersion as string | undefined;
    let configSnapshot: Record<string, unknown> | null = null;

    if (configVersion) {
      const configRow = await prisma.verificationConfig.findUnique({
        where: { configVersion },
        select: { snapshot: true },
      });
      configSnapshot = (configRow?.snapshot as Record<string, unknown>) ?? null;
    }

    // Best-effort access logging
    logAuditAccess(result.strategyId, recordId, "bundle").catch(() => {});

    const bundle = {
      bundleVersion: "1",
      generatedAt: new Date().toISOString(),
      recordId,
      replay: {
        chain: result.chain,
        runType: result.runType,
        extracted: result.extracted,
        snapshotVerification: result.snapshotVerification,
        configVerification: result.configVerification,
      },
      proofEvents: result.events.map((e) => ({
        sequence: e.sequence,
        eventHash: e.eventHash,
        prevEventHash: e.prevEventHash,
        type: e.type,
        strategyId: e.strategyId,
        createdAt: e.createdAt,
        payload: e.payload,
      })),
      configSnapshot,
    };

    // Deterministic JSON output
    const body = stableStringify(bundle);

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
