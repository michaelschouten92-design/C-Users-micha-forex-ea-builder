import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { matchesSegmentFilters } from "@/lib/segment-filter";
import {
  publicApiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
  getClientIp,
} from "@/lib/rate-limit";

// GET /api/announcements - Public: active, non-expired announcements
export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `announcements:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  try {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [{ active: true }, { active: false, scheduledAt: { lte: now } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        createdAt: true,
        segmentId: true,
        segment: {
          select: { filters: true },
        },
      },
    });

    // Try to get current user for segment filtering
    let currentUser: {
      email: string;
      lastLoginAt: Date | null;
      subscription: { tier: string; status: string; currentPeriodEnd: Date | null } | null;
    } | null = null;

    try {
      const session = await auth();
      if (session?.user?.id) {
        currentUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            email: true,
            lastLoginAt: true,
            subscription: {
              select: { tier: true, status: true, currentPeriodEnd: true },
            },
          },
        });
      }
    } catch {
      // Auth may not be available in all contexts
    }

    // Filter by segment if applicable
    const filtered = announcements.filter((ann) => {
      // No segment = show to everyone
      if (!ann.segmentId || !ann.segment) return true;

      // If we can't identify the user, don't show segmented announcements
      if (!currentUser) return false;

      try {
        const filters = JSON.parse(ann.segment.filters);
        return matchesSegmentFilters(currentUser, filters);
      } catch {
        return true; // If we can't parse filters, show it
      }
    });

    // Fire-and-forget: activate scheduled announcements for future consumers (idempotent)
    prisma.announcement
      .updateMany({
        where: { scheduledAt: { lte: now }, active: false },
        data: { active: true },
      })
      .catch(() => {});

    return NextResponse.json({
      data: filtered.map(({ segment, segmentId, ...rest }) => rest),
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch public announcements");
    return NextResponse.json({ data: [] });
  }
}
