import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { formatZodErrors, checkBodySize, checkContentType } from "@/lib/validations";

const MAX_TEMPLATES = 20;

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  buildJson: z.record(z.unknown()),
});

// GET /api/templates - List user's saved templates
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.userTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, buildJson: true, createdAt: true },
  });

  return NextResponse.json(templates);
}

// POST /api/templates - Save current strategy as template
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const body = await request.json();
  const validation = createTemplateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: formatZodErrors(validation.error) },
      { status: 400 }
    );
  }

  // Check template limit
  const count = await prisma.userTemplate.count({
    where: { userId: session.user.id },
  });

  if (count >= MAX_TEMPLATES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_TEMPLATES} templates allowed. Delete an existing template first.` },
      { status: 400 }
    );
  }

  const template = await prisma.userTemplate.create({
    data: {
      userId: session.user.id,
      name: validation.data.name,
      buildJson: validation.data.buildJson as object,
    },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json(template, { status: 201 });
}

// DELETE /api/templates - Delete a template by ID (via query param)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Template ID required" }, { status: 400 });
  }

  const template = await prisma.userTemplate.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.userTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
