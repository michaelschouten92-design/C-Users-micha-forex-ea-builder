import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { errorCode, message, context } = body;

    if (errorCode == null || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert error record
    await prisma.eAError.create({
      data: {
        instanceId: auth.instanceId,
        errorCode: Number(errorCode),
        message: String(message).substring(0, 5000),
        context: context ? String(context).substring(0, 500) : null,
      },
    });

    // Update instance with last error and set status to ERROR
    await prisma.liveEAInstance.update({
      where: { id: auth.instanceId },
      data: {
        lastError: String(message).substring(0, 500),
        status: "ERROR",
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
