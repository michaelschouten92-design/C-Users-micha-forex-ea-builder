import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  maxDrawdownPct: z.number().min(0.1).max(100).nullable(),
});

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid value. Must be between 0.1 and 100, or null to disable." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { maxDrawdownPct: parsed.data.maxDrawdownPct },
    });

    return NextResponse.json({ success: true, maxDrawdownPct: parsed.data.maxDrawdownPct });
  } catch {
    return NextResponse.json({ error: "Failed to save drawdown limit" }, { status: 500 });
  }
}
