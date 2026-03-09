import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateTerminal } from "@/lib/terminal-auth";
import { apiError, ErrorCode } from "@/lib/error-codes";

export const dynamic = "force-dynamic";

const deploymentSchema = z.object({
  symbol: z.string().min(1).max(20).trim(),
  timeframe: z.string().min(1).max(10).trim(),
  magicNumber: z.number().int().min(0),
  eaName: z.string().min(1).max(100).trim(),
});

const bodySchema = z.object({
  deployments: z.array(deploymentSchema).max(50),
  broker: z.string().max(100).trim().optional(),
  accountNumber: z.string().max(50).trim().optional(),
  terminalVersion: z.string().max(50).trim().optional(),
});

/**
 * Compute stable deployment identity key.
 * SHA-256(symbol:timeframe:magicNumber:eaName) — case-normalized.
 */
function computeDeploymentKey(d: {
  symbol: string;
  timeframe: string;
  magicNumber: number;
  eaName: string;
}): string {
  const raw = `${d.symbol.toUpperCase()}:${d.timeframe.toUpperCase()}:${d.magicNumber}:${d.eaName}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * POST /api/telemetry/terminal/deployments
 *
 * Called periodically by the Monitor EA to report which deployments are
 * running on this terminal. Upserts TerminalDeployment rows and updates
 * terminal heartbeat/metadata.
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateTerminal(request);
  if (!authResult.success) return authResult.response;

  const { terminalId, userId } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid JSON"), {
      status: 400,
    });
  }

  const validation = bodySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Validation failed", validation.error.message),
      { status: 400 }
    );
  }

  const { deployments, broker, accountNumber, terminalVersion } = validation.data;
  const now = new Date();

  // Update terminal heartbeat + metadata
  await prisma.terminalConnection.update({
    where: { id: terminalId },
    data: {
      status: "ONLINE",
      lastHeartbeat: now,
      ...(broker != null && { broker }),
      ...(accountNumber != null && { accountNumber }),
      ...(terminalVersion != null && { terminalVersion }),
    },
  });

  // Upsert each deployment
  const results = await Promise.all(
    deployments.map(async (d) => {
      const deploymentKey = computeDeploymentKey(d);

      const deployment = await prisma.terminalDeployment.upsert({
        where: {
          terminalConnectionId_deploymentKey: {
            terminalConnectionId: terminalId,
            deploymentKey,
          },
        },
        create: {
          terminalConnectionId: terminalId,
          deploymentKey,
          symbol: d.symbol.toUpperCase(),
          timeframe: d.timeframe.toUpperCase(),
          magicNumber: d.magicNumber,
          eaName: d.eaName,
          lastSeenAt: now,
        },
        update: {
          lastSeenAt: now,
          // Update fields in case EA name changed but key is same
          symbol: d.symbol.toUpperCase(),
          timeframe: d.timeframe.toUpperCase(),
          eaName: d.eaName,
        },
        select: {
          id: true,
          deploymentKey: true,
          instanceId: true,
          baselineStatus: true,
        },
      });

      return {
        deploymentKey,
        symbol: d.symbol.toUpperCase(),
        timeframe: d.timeframe.toUpperCase(),
        magicNumber: d.magicNumber,
        eaName: d.eaName,
        instanceId: deployment.instanceId,
        baselineStatus: deployment.baselineStatus,
      };
    })
  );

  return NextResponse.json({
    terminalId,
    userId,
    deployments: results,
    timestamp: now.toISOString(),
  });
}
