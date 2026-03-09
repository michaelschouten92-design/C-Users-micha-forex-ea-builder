import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateTerminal } from "@/lib/terminal-auth";
import { apiError, ErrorCode } from "@/lib/error-codes";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ module: "terminal-deployments" });

/** Strict hex hash: 64 chars (SHA-256 output). */
const HEX_HASH_RE = /^[0-9a-fA-F]{64}$/;

const deploymentSchema = z.object({
  symbol: z.string().min(1).max(20).trim(),
  timeframe: z.string().min(1).max(10).trim(),
  magicNumber: z.number().int().min(0),
  eaName: z.string().min(1).max(100).trim(),
  /** Optional SHA-256 hash of EA parameters/config. Reported by Monitor EA. */
  materialFingerprint: z
    .string()
    .regex(HEX_HASH_RE, "materialFingerprint must be a 64-char hex SHA-256 hash")
    .optional(),
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
 *
 * Material fingerprint detection:
 * - If materialFingerprint is provided and the deployment already has one stored,
 *   a mismatch triggers RELINK_REQUIRED on LINKED deployments.
 * - First fingerprint observed is stored without triggering a change.
 * - Fingerprint is optional for backward compatibility.
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateTerminal(request);
  if (!authResult.success) return authResult.response;

  const { terminalId } = authResult;

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

  // Process each deployment
  const results = await Promise.all(
    deployments.map(async (d) => {
      const deploymentKey = computeDeploymentKey(d);
      const reportedFingerprint = d.materialFingerprint ?? null;

      // Read existing row first to detect fingerprint changes
      const existing = await prisma.terminalDeployment.findUnique({
        where: {
          terminalConnectionId_deploymentKey: {
            terminalConnectionId: terminalId,
            deploymentKey,
          },
        },
        select: {
          id: true,
          instanceId: true,
          baselineStatus: true,
          materialFingerprint: true,
        },
      });

      // Determine if this is a material change
      const isMaterialChange =
        reportedFingerprint !== null &&
        existing !== null &&
        existing.materialFingerprint !== null &&
        existing.materialFingerprint !== reportedFingerprint;

      // Determine new baselineStatus
      let newBaselineStatus: string | undefined;
      if (isMaterialChange && existing!.baselineStatus === "LINKED") {
        newBaselineStatus = "RELINK_REQUIRED";
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        lastSeenAt: now,
        symbol: d.symbol.toUpperCase(),
        timeframe: d.timeframe.toUpperCase(),
        eaName: d.eaName,
      };
      // Store fingerprint: always accept the latest reported value
      if (reportedFingerprint !== null) {
        updateData.materialFingerprint = reportedFingerprint;
      }
      if (newBaselineStatus) {
        updateData.baselineStatus = newBaselineStatus;
      }

      // Build create data (new deployment, no change detection needed)
      const createData = {
        terminalConnectionId: terminalId,
        deploymentKey,
        symbol: d.symbol.toUpperCase(),
        timeframe: d.timeframe.toUpperCase(),
        magicNumber: d.magicNumber,
        eaName: d.eaName,
        lastSeenAt: now,
        ...(reportedFingerprint !== null && { materialFingerprint: reportedFingerprint }),
      };

      const deployment = await prisma.terminalDeployment.upsert({
        where: {
          terminalConnectionId_deploymentKey: {
            terminalConnectionId: terminalId,
            deploymentKey,
          },
        },
        create: createData,
        update: updateData,
        select: {
          id: true,
          deploymentKey: true,
          instanceId: true,
          baselineStatus: true,
          materialFingerprint: true,
        },
      });

      // If material change detected on a LINKED deployment, suspend canonical baseline trust
      if (isMaterialChange && newBaselineStatus === "RELINK_REQUIRED" && existing!.instanceId) {
        const instanceId = existing!.instanceId;
        try {
          await prisma.liveEAInstance.update({
            where: { id: instanceId },
            data: { strategyVersionId: null },
          });
          log.warn(
            {
              terminalId,
              deploymentKey,
              instanceId,
              previousFingerprint: existing!.materialFingerprint,
              newFingerprint: reportedFingerprint,
            },
            "Material change detected — baseline trust suspended (strategyVersionId cleared)"
          );
        } catch (err) {
          log.error(
            { err, instanceId, deploymentKey },
            "Failed to clear strategyVersionId on material change"
          );
        }
      }

      return {
        deploymentKey,
        symbol: d.symbol.toUpperCase(),
        timeframe: d.timeframe.toUpperCase(),
        magicNumber: d.magicNumber,
        eaName: d.eaName,
        instanceId: deployment.instanceId,
        baselineStatus: deployment.baselineStatus,
        materialFingerprint: deployment.materialFingerprint,
      };
    })
  );

  return NextResponse.json({
    terminalId,
    deployments: results,
    timestamp: now.toISOString(),
  });
}
