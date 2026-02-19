import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ALERT_TYPES = ["DRAWDOWN", "OFFLINE", "DAILY_LOSS", "NEW_TRADE", "ERROR"] as const;
const CHANNELS = ["EMAIL", "WEBHOOK"] as const;

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
    enabled: c.enabled,
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

  // Validate threshold is provided for threshold-based alerts
  if (alertType === "DRAWDOWN" && (threshold === null || threshold === undefined)) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Threshold is required for DRAWDOWN alerts"),
      { status: 400 }
    );
  }

  // If instanceId is specified, verify the user owns it
  if (instanceId) {
    const instance = await prisma.liveEAInstance.findFirst({
      where: { id: instanceId, userId: session.user.id },
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
      enabled,
    },
  });

  return NextResponse.json({ data: { id: config.id } }, { status: 201 });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
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

  // Build update data, only including fields that were provided
  const updateData: Record<string, unknown> = {};
  if (updates.alertType !== undefined) updateData.alertType = updates.alertType;
  if (updates.threshold !== undefined) updateData.threshold = updates.threshold;
  if (updates.channel !== undefined) updateData.channel = updates.channel;
  if (updates.webhookUrl !== undefined) updateData.webhookUrl = updates.webhookUrl;
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
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
