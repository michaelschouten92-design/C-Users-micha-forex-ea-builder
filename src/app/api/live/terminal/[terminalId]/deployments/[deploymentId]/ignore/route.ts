import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

/**
 * POST /api/live/terminal/[terminalId]/deployments/[deploymentId]/ignore
 * Soft-hide a discovered deployment so it no longer appears in the UI.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ terminalId: string; deploymentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { terminalId, deploymentId } = await params;

  const terminal = await prisma.terminalConnection.findUnique({
    where: { id: terminalId },
    select: { id: true, userId: true, deletedAt: true },
  });

  if (!terminal || terminal.deletedAt || terminal.userId !== session.user.id) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Terminal not found"), { status: 404 });
  }

  const deployment = await prisma.terminalDeployment.findUnique({
    where: { id: deploymentId },
    select: { id: true, terminalConnectionId: true, source: true },
  });

  if (!deployment || deployment.terminalConnectionId !== terminalId) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Deployment not found"), {
      status: 404,
    });
  }

  if (deployment.source !== "DISCOVERED") {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Only discovered deployments can be ignored"),
      { status: 400 }
    );
  }

  await prisma.terminalDeployment.update({
    where: { id: deploymentId },
    data: { ignoredAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
