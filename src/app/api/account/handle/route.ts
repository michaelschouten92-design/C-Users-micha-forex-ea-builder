import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const handleSchema = z.object({
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Handle can only contain letters, numbers, hyphens, and underscores")
    .transform((val) => val.toLowerCase()),
});

const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "app",
  "proof",
  "hub",
  "verified",
  "login",
  "register",
  "settings",
  "pricing",
  "about",
  "contact",
  "docs",
  "blog",
  "support",
  "strategy",
  "shared",
  "embed",
  "u",
  "trader",
  "top-robust",
  "rising",
  "low-drawdown",
  "status",
  "terms",
  "privacy",
  "faq",
]);

/** GET /api/account/handle — get current handle */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { handle: true, email: true },
  });

  return NextResponse.json({
    handle: user?.handle ?? null,
    suggestedHandle:
      user?.email
        ?.split("@")[0]
        ?.replace(/[^a-zA-Z0-9_-]/g, "")
        .toLowerCase()
        .slice(0, 30) ?? null,
  });
}

/** PUT /api/account/handle — set or update handle */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = handleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Invalid handle" },
      { status: 400 }
    );
  }

  const { handle } = validation.data;

  if (RESERVED_HANDLES.has(handle)) {
    return NextResponse.json({ error: "This handle is reserved" }, { status: 409 });
  }

  // Check uniqueness
  const existing = await prisma.user.findUnique({
    where: { handle },
    select: { id: true },
  });

  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: "This handle is already taken" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { handle },
  });

  return NextResponse.json({ handle });
}
