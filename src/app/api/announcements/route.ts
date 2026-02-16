import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// GET /api/announcements - Public: active, non-expired announcements
export async function GET() {
  try {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: announcements });
  } catch (error) {
    logger.error({ error }, "Failed to fetch public announcements");
    return NextResponse.json({ data: [] });
  }
}
