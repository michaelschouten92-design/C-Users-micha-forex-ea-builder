import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  formatZodErrors,
  checkBodySize,
  checkContentType,
  buildJsonSchema,
} from "@/lib/validations";
import {
  templateCreateRateLimiter,
  checkRateLimit,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

const MAX_TEMPLATES = 20;

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  buildJson: buildJsonSchema,
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

  // Rate limit
  const rateLimit = await checkRateLimit(templateCreateRateLimiter, `template:${session.user.id}`);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimit) },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
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

  // Check template limit (atomic transaction to prevent race conditions)
  const template = await prisma.$transaction(async (tx) => {
    const count = await tx.userTemplate.count({
      where: { userId: session.user.id },
    });

    if (count >= MAX_TEMPLATES) {
      return null;
    }

    return tx.userTemplate.create({
      data: {
        userId: session.user.id,
        name: validation.data.name,
        buildJson: validation.data.buildJson as object,
      },
      select: { id: true, name: true, createdAt: true },
    });
  });

  if (!template) {
    return NextResponse.json(
      { error: `Maximum ${MAX_TEMPLATES} templates allowed. Delete an existing template first.` },
      { status: 400 }
    );
  }

  return NextResponse.json(template, { status: 201 });
}

// PATCH /api/templates - Rename a template
const updateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).trim(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const body = await request.json();
  const validation = updateTemplateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: formatZodErrors(validation.error) },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.userTemplate.update({
      where: { id: validation.data.id, userId: session.user.id },
      data: { name: validation.data.name },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}

// DELETE /api/templates - Delete a template by ID (via query param)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || id.length < 1 || id.length > 30) {
    return NextResponse.json({ error: "Valid template ID required" }, { status: 400 });
  }

  try {
    await prisma.userTemplate.delete({ where: { id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}
