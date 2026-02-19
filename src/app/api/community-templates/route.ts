import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Mask an email address for public display.
 * Shows first 3 characters of local part + "***@domain".
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***@***.com";
  const visible = localPart.substring(0, 3);
  return `${visible}***@${domain}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20)
  );
  const skip = (page - 1) * limit;

  const [templates, total] = await Promise.all([
    prisma.userTemplate.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true },
        },
      },
      skip,
      take: limit,
    }),
    prisma.userTemplate.count({
      where: { isPublic: true },
    }),
  ]);

  const data = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    buildJson: t.buildJson,
    authorEmail: maskEmail(t.user.email),
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
