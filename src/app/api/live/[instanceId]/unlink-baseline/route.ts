import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { logAuditEvent, getAuditContext } from "@/lib/audit";
import { appendProofEventInTx } from "@/lib/proof/events";
import { randomUUID } from "crypto";
import { apiRateLimiter, checkRateLimit, createRateLimitHeaders, formatRateLimitError } from "@/lib/rate-limit";

const log = logger.child({ route: "unlink-baseline" });

/**
 * POST /api/live/[instanceId]/unlink-baseline
 *
 * Unlinks the baseline from a LiveEAInstance and optionally
 * resets the associated TerminalDeployment's baselineStatus.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }
    if (session.user.suspended) {
      return NextResponse.json(apiError(ErrorCode.ACCOUNT_SUSPENDED, "Account suspended"), {
        status: 403,
      });
    }

    // Rate limit baseline operations
    const rl = await checkRateLimit(apiRateLimiter, `baseline-unlink:${session.user.id}`);
    if (!rl.success) {
      return NextResponse.json(
        apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)),
        { status: 429, headers: createRateLimitHeaders(rl) }
      );
    }

    const { instanceId } = await params;

    // 2. Parse body
    let body: { deploymentId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    // 3. Find instance and verify ownership
    const instance = await prisma.liveEAInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        userId: true,
        eaName: true,
        exportJobId: true,
        strategyVersionId: true,
        deletedAt: true,
        strategyVersion: {
          select: { strategyIdentity: { select: { strategyId: true } } },
        },
      },
    });

    if (!instance || instance.deletedAt || instance.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
        status: 404,
      });
    }

    // 4. Only external EAs can be unlinked (exported EAs have a permanent chain)
    if (instance.exportJobId) {
      return NextResponse.json(
        apiError(
          ErrorCode.INELIGIBLE_INSTANCE,
          "Exported instances cannot have their baseline unlinked."
        ),
        { status: 409 }
      );
    }

    // 5. Check there's actually a baseline to unlink
    if (!instance.strategyVersionId) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "No baseline is currently linked."),
        { status: 400 }
      );
    }

    // 6. Clear instance baseline + reset deployments atomically, with proof event
    const strategyId = instance.strategyVersion?.strategyIdentity?.strategyId;
    await prisma.$transaction(
      async (tx) => {
        if (strategyId) {
          await appendProofEventInTx(tx, strategyId, "BASELINE_UNLINKED", {
            eventType: "BASELINE_UNLINKED",
            recordId: randomUUID(),
            strategyId,
            instanceId,
            previousStrategyVersionId: instance.strategyVersionId,
            deploymentId: body.deploymentId ?? null,
            timestamp: new Date().toISOString(),
          });
        }
        await tx.liveEAInstance.update({
          where: { id: instanceId },
          data: { strategyVersionId: null },
        });
        if (body.deploymentId) {
          await tx.terminalDeployment.update({
            where: { id: body.deploymentId },
            data: { baselineStatus: "UNLINKED", strategyVersionId: null },
          });
        } else {
          await tx.terminalDeployment.updateMany({
            where: { instanceId },
            data: { baselineStatus: "UNLINKED", strategyVersionId: null },
          });
        }
      },
      { isolationLevel: "Serializable" }
    );

    // 8. Audit
    const auditCtx = getAuditContext(request);
    await logAuditEvent({
      userId: session.user.id,
      eventType: "live.baseline_unlinked",
      resourceType: "live_instance",
      resourceId: instanceId,
      metadata: {
        deploymentId: body.deploymentId ?? null,
        previousStrategyVersionId: instance.strategyVersionId,
        instanceEaName: instance.eaName,
      },
      ...auditCtx,
    });

    log.info(
      {
        instanceId,
        deploymentId: body.deploymentId,
        userId: session.user.id,
      },
      "Baseline unlinked from instance"
    );

    return NextResponse.json({ unlinked: true, instanceId }, { status: 200 });
  } catch (error) {
    log.error({ error }, "Failed to unlink baseline");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
