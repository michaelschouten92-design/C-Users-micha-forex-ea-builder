import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const pauseSchema = z.object({
  paused: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { instanceId } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
      status: 400,
    });
  }

  const parsed = pauseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid request data"), {
      status: 400,
    });
  }

  // Verify the user owns this instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
      status: 404,
    });
  }

  await prisma.liveEAInstance.update({
    where: { id: instanceId },
    data: { paused: parsed.data.paused },
  });

  return NextResponse.json({ success: true, paused: parsed.data.paused });
}
