import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { getCachedTier } from "@/lib/plan-limits";
import { isPrivateUrl } from "@/app/api/account/webhook/route";
import { NextRequest, NextResponse } from "next/server";
import { logAlertStateTransition } from "@/lib/ea/trading-state";
import { z } from "zod";

const ALERT_TYPES = [
  "DRAWDOWN",
  "OFFLINE",
  "DAILY_LOSS",
  "NEW_TRADE",
  "ERROR",
  "WEEKLY_LOSS",
  "EQUITY_TARGET",
] as const;
const CHANNELS = ["EMAIL", "WEBHOOK", "BROWSER_PUSH", "TELEGRAM"] as const;

const createAlertSchema = z.object({
  instanceId: z.string().optional().nullable(),
  alertType: z.enum(ALERT_TYPES),
  threshold: z.number().finite().min(0).max(100).optional().nullable(),
  channel: z.enum(CHANNELS),
  webhookUrl: z.string().url().optional().nullable(),
  enabled: z.boolean().default(true),
});

const updateAlertSchema = z.object({
  id: z.string(),
  instanceId: z.string().optional().nullable(),
  alertType: z.enum(ALERT_TYPES).optional(),
  threshold: z.number().finite().min(0).max(100).optional().nullable(),
  channel: z.enum(CHANNELS).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  enabled: z.boolean().optional(),
});

const deleteAlertSchema = z.object({
  id: z.string(),
});

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(ErrorCode.PLAN_REQUIRED, "Live EA monitoring requires a Pro or Elite subscription"),
      { status: 403 }
    );
  }

  const configs = await prisma.eAAlertConfig.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      instance: { select: { id: true, eaName: true } },
    },
  });

  const data = configs.map((c) => ({
    id: c.id,
    instanceId: c.instanceId,
    instanceName: c.instance?.eaName ?? null,
    alertType: c.alertType,
    threshold: c.threshold,
    channel: c.channel,
    webhookUrl: c.webhookUrl,
    enabled: c.state === "ACTIVE",
    lastTriggered: c.lastTriggered?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(ErrorCode.PLAN_REQUIRED, "Live EA monitoring requires a Pro or Elite subscription"),
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
      status: 400,
    });
  }

  const parsed = createAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid alert data",
        parsed.error.issues.map((i) => i.message)
      ),
      { status: 400 }
    );
  }

  const { alertType, threshold, channel, webhookUrl, enabled, instanceId } = parsed.data;

  // Validate webhook URL is provided when channel is WEBHOOK
  if (channel === "WEBHOOK" && !webhookUrl) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Webhook URL is required for WEBHOOK channel"),
      { status: 400 }
    );
  }

  // Block private/internal URLs to prevent SSRF
  if (webhookUrl && isPrivateUrl(webhookUrl)) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Webhook URL must not point to a private or internal address"
      ),
      { status: 400 }
    );
  }

  // Validate threshold is required and must be > 0 for threshold-based alert types
  const THRESHOLD_REQUIRED_TYPES = [
    "DRAWDOWN",
    "DAILY_LOSS",
    "WEEKLY_LOSS",
    "EQUITY_TARGET",
  ] as const;
  if (
    (THRESHOLD_REQUIRED_TYPES as readonly string[]).includes(alertType) &&
    (threshold === null || threshold === undefined || threshold <= 0)
  ) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Threshold is required and must be greater than 0 for ${alertType} alerts`
      ),
      { status: 400 }
    );
  }

  // If instanceId is specified, verify the user owns it
  if (instanceId) {
    const instance = await prisma.liveEAInstance.findFirst({
      where: { id: instanceId, userId: session.user.id, deletedAt: null },
    });
    if (!instance) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
        status: 404,
      });
    }
  }

  const config = await prisma.eAAlertConfig.create({
    data: {
      userId: session.user.id,
      instanceId: instanceId ?? null,
      alertType,
      threshold: threshold ?? null,
      channel,
      webhookUrl: webhookUrl ?? null,
      state: enabled ? "ACTIVE" : "DISABLED",
    },
  });

  return NextResponse.json({ data: { id: config.id } }, { status: 201 });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(ErrorCode.PLAN_REQUIRED, "Live EA monitoring requires a Pro or Elite subscription"),
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
      status: 400,
    });
  }

  const parsed = updateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid alert data",
        parsed.error.issues.map((i) => i.message)
      ),
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  // Verify the user owns this config
  const existing = await prisma.eAAlertConfig.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Alert config not found"), {
      status: 404,
    });
  }

  // Validate threshold when alert type requires it (considering both new and existing values)
  const effectiveAlertType = updates.alertType ?? existing.alertType;
  const effectiveThreshold =
    updates.threshold !== undefined ? updates.threshold : existing.threshold;
  const THRESHOLD_REQUIRED_UPDATE = ["DRAWDOWN", "DAILY_LOSS", "WEEKLY_LOSS", "EQUITY_TARGET"];
  if (
    THRESHOLD_REQUIRED_UPDATE.includes(effectiveAlertType) &&
    (effectiveThreshold === null || effectiveThreshold === undefined || effectiveThreshold <= 0)
  ) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Threshold is required and must be greater than 0 for ${effectiveAlertType} alerts`
      ),
      { status: 400 }
    );
  }

  // Block private/internal URLs to prevent SSRF
  if (updates.webhookUrl && isPrivateUrl(updates.webhookUrl)) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Webhook URL must not point to a private or internal address"
      ),
      { status: 400 }
    );
  }

  // Build update data, only including fields that were provided
  const updateData: Record<string, unknown> = {};
  if (updates.alertType !== undefined) updateData.alertType = updates.alertType;
  if (updates.threshold !== undefined) updateData.threshold = updates.threshold;
  if (updates.channel !== undefined) updateData.channel = updates.channel;
  if (updates.webhookUrl !== undefined) updateData.webhookUrl = updates.webhookUrl;
  if (updates.enabled !== undefined) {
    const newState = updates.enabled ? "ACTIVE" : "DISABLED";
    updateData.state = newState;
    logAlertStateTransition(
      id,
      existing.state as "ACTIVE" | "DISABLED",
      newState,
      updates.enabled ? "user_enable" : "user_disable"
    );
  }
  if (updates.instanceId !== undefined) updateData.instanceId = updates.instanceId ?? null;

  await prisma.eAAlertConfig.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(ErrorCode.PLAN_REQUIRED, "Live EA monitoring requires a Pro or Elite subscription"),
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
      status: 400,
    });
  }

  const parsed = deleteAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid request"), {
      status: 400,
    });
  }

  // Verify the user owns this config
  const existing = await prisma.eAAlertConfig.findFirst({
    where: { id: parsed.data.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Alert config not found"), {
      status: 404,
    });
  }

  await prisma.eAAlertConfig.delete({ where: { id: parsed.data.id } });

  return NextResponse.json({ success: true });
}
