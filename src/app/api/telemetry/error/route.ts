import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { enqueueNotification } from "@/lib/outbox";
import { logger } from "@/lib/logger";
import { z } from "zod";

const errorSchema = z.object({
  errorCode: z.number().int().min(-999999).max(999999),
  message: z.string().max(5000),
  context: z.string().max(500).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const parsed = errorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid error data" }, { status: 400 });
    }

    const { errorCode, message, context } = parsed.data;

    // Atomic: create error record + read instance + update status + cap old errors
    const instance = await prisma.$transaction(async (tx) => {
      await tx.eAError.create({
        data: {
          instanceId: auth.instanceId,
          errorCode,
          message,
          context: context ?? null,
        },
      });

      // Cap errors per instance: keep only the most recent 500
      const oldErrors = await tx.eAError.findMany({
        where: { instanceId: auth.instanceId },
        orderBy: { createdAt: "desc" },
        skip: 500,
        take: 100,
        select: { id: true },
      });
      if (oldErrors.length > 0) {
        await tx.eAError.deleteMany({
          where: { id: { in: oldErrors.map((e) => e.id) } },
        });
      }

      const inst = await tx.liveEAInstance.findUnique({
        where: { id: auth.instanceId },
        select: { status: true, eaName: true, user: { select: { email: true, webhookUrl: true } } },
      });

      await tx.liveEAInstance.update({
        where: { id: auth.instanceId },
        data: {
          lastError: message.substring(0, 500),
          status: "ERROR",
        },
      });

      return inst;
    });

    // Send email alert if status changed to ERROR (was previously ONLINE or OFFLINE)
    if (instance && instance.status !== "ERROR") {
      enqueueNotification({
        userId: auth.userId,
        channel: "EMAIL",
        destination: instance.user.email,
        subject: `EA Alert: ${instance.eaName}`,
        payload: {
          html: `<p>Your EA "${instance.eaName}" has entered ERROR state: ${message.substring(0, 300)}</p>`,
        },
      });

      if (instance.user.webhookUrl) {
        enqueueNotification({
          userId: auth.userId,
          channel: "WEBHOOK",
          destination: instance.user.webhookUrl,
          payload: {
            event: "error",
            data: {
              eaName: instance.eaName,
              errorCode,
              message: message.substring(0, 300),
              status: "ERROR",
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
