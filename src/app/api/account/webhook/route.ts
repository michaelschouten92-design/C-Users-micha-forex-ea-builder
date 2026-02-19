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
});

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { webhookUrl: true },
  });

  return NextResponse.json({ webhookUrl: user?.webhookUrl ?? null });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
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

    await prisma.user.update({
      where: { id: session.user.id },
      data: { webhookUrl: parsed.data.webhookUrl ?? null },
    });

    return NextResponse.json({ success: true, webhookUrl: parsed.data.webhookUrl ?? null });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
