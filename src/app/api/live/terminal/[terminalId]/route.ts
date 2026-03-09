import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

/**
 * GET /api/live/terminal/[terminalId] — Get terminal details + deployments.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ terminalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { terminalId } = await params;

  const terminal = await prisma.terminalConnection.findUnique({
    where: { id: terminalId },
    select: {
      id: true,
      userId: true,
      label: true,
      status: true,
      lastHeartbeat: true,
      broker: true,
      accountNumber: true,
      terminalVersion: true,
      createdAt: true,
      deletedAt: true,
      deployments: {
        select: {
          id: true,
          deploymentKey: true,
          symbol: true,
          timeframe: true,
          magicNumber: true,
          eaName: true,
          materialFingerprint: true,
          baselineStatus: true,
          instanceId: true,
          firstSeenAt: true,
          lastSeenAt: true,
        },
        orderBy: { lastSeenAt: "desc" },
      },
    },
  });

  if (!terminal || terminal.deletedAt || terminal.userId !== session.user.id) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Terminal not found"), { status: 404 });
  }

  return NextResponse.json({
    id: terminal.id,
    label: terminal.label,
    status: terminal.status,
    lastHeartbeat: terminal.lastHeartbeat,
    broker: terminal.broker,
    accountNumber: terminal.accountNumber,
    terminalVersion: terminal.terminalVersion,
    createdAt: terminal.createdAt,
    deployments: terminal.deployments,
  });
}

/**
 * DELETE /api/live/terminal/[terminalId] — Soft-delete a terminal connection.
 * Does NOT cascade-delete child instances — they become standalone (terminalConnectionId = null).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ terminalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { terminalId } = await params;

  const terminal = await prisma.terminalConnection.findUnique({
    where: { id: terminalId },
    select: { id: true, userId: true, deletedAt: true },
  });

  if (!terminal || terminal.deletedAt || terminal.userId !== session.user.id) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Terminal not found"), { status: 404 });
  }

  await prisma.$transaction([
    // Soft-delete the terminal
    prisma.terminalConnection.update({
      where: { id: terminalId },
      data: { deletedAt: new Date() },
    }),
    // Detach child instances
    prisma.liveEAInstance.updateMany({
      where: { terminalConnectionId: terminalId },
      data: { terminalConnectionId: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
