import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const webhookUpdateSchema = z.object({
  webhookUrl: z
    .string()
    .url("Must be a valid URL")
    .startsWith("https://", "Webhook URL must use HTTPS")
    .max(2048, "URL must be 2048 characters or less")
    .nullable()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      return val.trim();
    }),
  leaderboardOptIn: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { webhookUrl: true, leaderboardOptIn: true },
  });

  return NextResponse.json({
    webhookUrl: user?.webhookUrl ?? null,
    leaderboardOptIn: user?.leaderboardOptIn ?? false,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleUpdate(request);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return handleUpdate(request);
}

async function handleUpdate(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = webhookUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const updateData: { webhookUrl?: string | null; leaderboardOptIn?: boolean } = {};
    if (parsed.data.webhookUrl !== undefined) {
      updateData.webhookUrl = parsed.data.webhookUrl ?? null;
    }
    if (parsed.data.leaderboardOptIn !== undefined) {
      updateData.leaderboardOptIn = parsed.data.leaderboardOptIn;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { webhookUrl: true, leaderboardOptIn: true },
    });

    return NextResponse.json({
      success: true,
      webhookUrl: updated.webhookUrl,
      leaderboardOptIn: updated.leaderboardOptIn,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
