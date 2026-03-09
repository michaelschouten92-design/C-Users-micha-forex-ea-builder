import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { logAuditEvent } from "@/lib/audit";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";

const linkSchema = z.object({
  instanceId: z.string().min(1, "instanceId is required"),
});

/**
 * POST /api/live/terminal/[terminalId]/deployments/[deploymentId]/link
 *
 * Links a discovered TerminalDeployment to a canonical LiveEAInstance.
 * This is a user-initiated, session-authenticated governance action.
 *
 * Behavior:
 * - Sets TerminalDeployment.instanceId = instanceId
 * - Sets LiveEAInstance.terminalConnectionId = terminalId
 * - Derives TerminalDeployment.baselineStatus from instance's strategyVersionId
 * - Idempotent: re-linking same deployment to same instance is a no-op success
 * - Fails closed on conflicts (deployment already linked elsewhere, instance on different terminal)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ terminalId: string; deploymentId: string }> }
) {
  const session = await auth();
  const log = createApiLogger(
    "/api/live/terminal/[terminalId]/deployments/[deploymentId]/link",
    "POST",
    session?.user?.id
  );

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { terminalId, deploymentId } = await params;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
      status: 400,
    });
  }

  const validation = linkSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Validation failed", validation.error.message),
      { status: 400 }
    );
  }

  const { instanceId } = validation.data;

  try {
    // 1. Verify terminal ownership
    const terminal = await prisma.terminalConnection.findUnique({
      where: { id: terminalId },
      select: { id: true, userId: true, deletedAt: true, label: true },
    });

    if (!terminal || terminal.deletedAt || terminal.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Terminal not found"), {
        status: 404,
      });
    }

    // 2. Verify deployment exists and belongs to this terminal
    const deployment = await prisma.terminalDeployment.findUnique({
      where: { id: deploymentId },
      select: {
        id: true,
        terminalConnectionId: true,
        instanceId: true,
        deploymentKey: true,
        symbol: true,
        timeframe: true,
        magicNumber: true,
        eaName: true,
        baselineStatus: true,
      },
    });

    if (!deployment || deployment.terminalConnectionId !== terminalId) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Deployment not found"), {
        status: 404,
      });
    }

    // 3. Idempotency: if already linked to this exact instance, return success
    if (deployment.instanceId === instanceId) {
      return NextResponse.json({
        linked: true,
        deploymentId: deployment.id,
        instanceId,
        terminalId,
        baselineStatus: deployment.baselineStatus,
        idempotent: true,
      });
    }

    // 4. Conflict: deployment already linked to a different instance
    if (deployment.instanceId !== null) {
      return NextResponse.json(
        apiError(
          ErrorCode.DEPLOYMENT_ALREADY_LINKED,
          "This deployment is already linked to a different instance. Unlink it first before relinking."
        ),
        { status: 409 }
      );
    }

    // 5. Verify instance ownership and eligibility
    const instance = await prisma.liveEAInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        userId: true,
        deletedAt: true,
        eaName: true,
        strategyVersionId: true,
        terminalConnectionId: true,
      },
    });

    if (!instance || instance.deletedAt || instance.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
        status: 404,
      });
    }

    // 6. Conflict: instance already associated with a different terminal
    if (instance.terminalConnectionId !== null && instance.terminalConnectionId !== terminalId) {
      return NextResponse.json(
        apiError(
          ErrorCode.INSTANCE_ALREADY_LINKED,
          "This instance is already associated with a different terminal."
        ),
        { status: 409 }
      );
    }

    // 7. Conflict: instance already linked to a different deployment
    const existingDeployment = await prisma.terminalDeployment.findFirst({
      where: { instanceId, id: { not: deploymentId } },
      select: { id: true, symbol: true, timeframe: true, eaName: true },
    });

    if (existingDeployment) {
      return NextResponse.json(
        apiError(
          ErrorCode.INSTANCE_HAS_DEPLOYMENT,
          `This instance is already linked to another deployment (${existingDeployment.eaName} ${existingDeployment.symbol} ${existingDeployment.timeframe}). Unlink it first.`
        ),
        { status: 409 }
      );
    }

    // 8. Derive baselineStatus from instance's canonical baseline chain
    const baselineStatus = instance.strategyVersionId ? "LINKED" : "UNLINKED";

    // 9. Execute the link in a transaction
    await prisma.$transaction([
      prisma.terminalDeployment.update({
        where: { id: deploymentId },
        data: {
          instanceId,
          baselineStatus,
        },
      }),
      prisma.liveEAInstance.update({
        where: { id: instanceId },
        data: {
          terminalConnectionId: terminalId,
        },
      }),
    ]);

    log.info(
      { terminalId, deploymentId, instanceId, baselineStatus },
      "Terminal deployment linked to instance"
    );

    await logAuditEvent({
      userId: session.user.id,
      eventType: "live.deployment_linked",
      resourceType: "terminal_deployment",
      resourceId: deploymentId,
      metadata: {
        terminalId,
        terminalLabel: terminal.label,
        instanceId,
        instanceEaName: instance.eaName,
        deploymentKey: deployment.deploymentKey,
        deploymentSymbol: deployment.symbol,
        deploymentTimeframe: deployment.timeframe,
        deploymentMagicNumber: deployment.magicNumber,
        baselineStatus,
      },
    });

    return NextResponse.json({
      linked: true,
      deploymentId: deployment.id,
      instanceId,
      terminalId,
      baselineStatus,
      idempotent: false,
    });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Failed to link deployment");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
