import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import type { Prisma } from "@prisma/client";

/**
 * Mask an email address for public display.
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***@***.com";
  const visible = localPart.substring(0, 3);
  return `${visible}***@${domain}`;
}

const VALID_SORT_OPTIONS = ["newest", "popular", "rating"] as const;
type SortOption = (typeof VALID_SORT_OPTIONS)[number];

const VALID_CATEGORIES = [
  "scalping",
  "trend-following",
  "breakout",
  "mean-reversion",
  "grid",
  "martingale",
  "hedging",
  "news-trading",
  "other",
] as const;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20)
    );
    const skip = (page - 1) * limit;

    const query = url.searchParams.get("q")?.trim() ?? "";
    const category = url.searchParams.get("category") ?? "";
    const tag = url.searchParams.get("tag") ?? "";
    const sortParam = url.searchParams.get("sort") ?? "newest";
    const sort: SortOption = VALID_SORT_OPTIONS.includes(sortParam as SortOption)
      ? (sortParam as SortOption)
      : "newest";

    // Build where clause
    const where: Prisma.UserTemplateWhereInput = { isPublic: true };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    if (category && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      where.category = category;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    // Build orderBy
    let orderBy: Prisma.UserTemplateOrderByWithRelationInput;
    if (sort === "popular") {
      orderBy = { downloads: "desc" };
    } else {
      // "newest" and "rating" both fall back to createdAt desc
      // Rating sort is handled post-query since it's a computed field
      orderBy = { createdAt: "desc" };
    }

    const [templates, total] = await Promise.all([
      prisma.userTemplate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { email: true } },
          ratings: { select: { rating: true } },
        },
      }),
      prisma.userTemplate.count({ where }),
    ]);

    const data = templates.map((t) => {
      const ratingSum = t.ratings.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = t.ratings.length > 0 ? ratingSum / t.ratings.length : 0;

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        buildJson: t.buildJson,
        authorEmail: maskEmail(t.user.email),
        downloads: t.downloads,
        tags: t.tags,
        category: t.category,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount: t.ratings.length,
        createdAt: t.createdAt.toISOString(),
      };
    });

    // Post-sort by rating if requested
    if (sort === "rating") {
      data.sort((a, b) => b.avgRating - a.avgRating);
    }

    return NextResponse.json({
      data,
      categories: VALID_CATEGORIES,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error({ error }, "Failed to search marketplace templates");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
