import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { sendEAAlertEmail } from "@/lib/email";
import { fireWebhook } from "@/lib/webhook";
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

    // Insert error record
    await prisma.eAError.create({
      data: {
        instanceId: auth.instanceId,
        errorCode,
        message,
        context: context ?? null,
      },
    });

    // Check previous status before updating to ERROR
    const instance = await prisma.liveEAInstance.findUnique({
      where: { id: auth.instanceId },
      select: { status: true, eaName: true, user: { select: { email: true, webhookUrl: true } } },
    });

    // Update instance with last error and set status to ERROR
    await prisma.liveEAInstance.update({
      where: { id: auth.instanceId },
      data: {
        lastError: message.substring(0, 500),
        status: "ERROR",
      },
    });

    // Send email alert if status changed to ERROR (was previously ONLINE or OFFLINE)
    if (instance && instance.status !== "ERROR") {
      sendEAAlertEmail(
        instance.user.email,
        instance.eaName,
        `Your EA "${instance.eaName}" has entered ERROR state: ${message.substring(0, 300)}`
      ).catch(() => {});

      if (instance.user.webhookUrl) {
        fireWebhook(instance.user.webhookUrl, {
          event: "error",
          data: {
            eaName: instance.eaName,
            errorCode,
            message: message.substring(0, 300),
            status: "ERROR",
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
