import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
  apiRateLimiter,
} from "@/lib/rate-limit";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

const MAX_EXTERNAL_INSTANCES = 20;

const registerSchema = z.object({
  eaName: z
    .string()
    .min(1, "EA name is required")
    .max(100, "EA name must be 100 characters or less")
    .trim(),
});

// POST /api/live/register — Register an external EA for monitoring
export async function POST(request: NextRequest) {
  const session = await auth();
  const log = createApiLogger("/api/live/register", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.suspended) {
    return NextResponse.json(apiError(ErrorCode.ACCOUNT_SUSPENDED, "Account suspended"), {
      status: 403,
    });
  }

  // Rate limit: reuse the general API limiter (30 req/min)
  const rateLimitResult = await checkRateLimit(apiRateLimiter, `register-ea:${session.user.id}`);
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", details: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: rateLimitHeaders });
  }

  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten().fieldErrors },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const { eaName } = validation.data;

  try {
    // Generate API key
    const apiKey = randomBytes(32).toString("hex");
    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

    // Atomic: count + create in a single transaction to prevent race conditions
    const instance = await prisma.$transaction(async (tx) => {
      const externalCount = await tx.liveEAInstance.count({
        where: { userId: session.user.id, exportJobId: null, deletedAt: null },
      });

      if (externalCount >= MAX_EXTERNAL_INSTANCES) {
        throw Object.assign(new Error("Instance limit reached"), { code: "LIMIT_EXCEEDED" });
      }

      const liveEA = await tx.liveEAInstance.create({
        data: {
          exportJobId: null,
          userId: session.user.id,
          apiKeyHash,
          apiKeySuffix: apiKey.slice(-4),
          eaName,
          mode: "LIVE",
        },
      });

      await tx.trackRecordState.create({
        data: { instanceId: liveEA.id },
      });

      return liveEA;
    });

    log.info({ instanceId: instance.id, eaName }, "External EA registered");

    await logAuditEvent({
      userId: session.user.id,
      eventType: "live.external_ea_registered",
      resourceType: "live_ea_instance",
      resourceId: instance.id,
      metadata: { eaName },
    });

    return NextResponse.json(
      {
        instanceId: instance.id,
        apiKey,
        eaName: instance.eaName,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    if (error instanceof Error && (error as Error & { code?: string }).code === "LIMIT_EXCEEDED") {
      return NextResponse.json(
        apiError(
          ErrorCode.PLAN_REQUIRED,
          "Instance limit reached",
          `You can register up to ${MAX_EXTERNAL_INSTANCES} external EAs. Remove unused instances to add more.`
        ),
        { status: 403, headers: rateLimitHeaders }
      );
    }
    log.error({ error: extractErrorDetails(error) }, "Failed to register external EA");
    return NextResponse.json(
      { error: "Failed to register external EA. Please try again." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
