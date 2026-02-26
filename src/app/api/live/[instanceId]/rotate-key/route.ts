import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/live/[instanceId]/rotate-key
 * Rotates the API key for an EA instance.
 * The old key remains valid for 24 hours (grace period).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { instanceId } = await params;

  // Verify instance exists and belongs to user
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true, apiKeyHash: true, eaName: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), { status: 404 });
  }

  // Generate new key
  const newApiKey = randomBytes(32).toString("hex");
  const newHash = createHash("sha256").update(newApiKey).digest("hex");
  const now = new Date();
  const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_MS);

  await prisma.liveEAInstance.update({
    where: { id: instanceId },
    data: {
      apiKeyHashPrev: instance.apiKeyHash,
      apiKeyHash: newHash,
      keyRotatedAt: now,
      keyGracePeriodEnd: gracePeriodEnd,
    },
  });

  logAuditEvent({
    userId: session.user.id,
    eventType: "live.external_ea_registered", // reuse closest audit type
    resourceType: "live_ea_instance",
    resourceId: instanceId,
    metadata: { action: "key_rotation", eaName: instance.eaName },
  }).catch((err) => {
    logger.error({ err, instanceId }, "Audit log failed: key_rotation");
  });

  return NextResponse.json({
    apiKey: newApiKey,
    gracePeriodEnd: gracePeriodEnd.toISOString(),
  });
}
