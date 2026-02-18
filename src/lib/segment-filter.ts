import { prisma } from "./prisma";

interface SegmentFilters {
  tierFilter?: string;
  loginFilter?: string;
  activityFilter?: string;
  churnFilter?: boolean;
  searchQuery?: string;
}

interface UserForFilter {
  email: string;
  lastLoginAt: Date | null;
  subscription: { tier: string; status: string; currentPeriodEnd: Date | null } | null;
  _activityCount?: number;
}

/**
 * Check if a user matches segment filters (server-side version of users-tab filter logic)
 */
export function matchesSegmentFilters(user: UserForFilter, filters: SegmentFilters): boolean {
  const now = Date.now();

  // Tier filter
  if (filters.tierFilter && filters.tierFilter !== "ALL") {
    if ((user.subscription?.tier || "FREE") !== filters.tierFilter) return false;
  }

  // Login filter
  if (filters.loginFilter && filters.loginFilter !== "ALL") {
    if (filters.loginFilter === "NEVER") {
      if (user.lastLoginAt) return false;
    } else if (filters.loginFilter === "7d") {
      if (!user.lastLoginAt || now - user.lastLoginAt.getTime() > 7 * 86_400_000) return false;
    } else if (filters.loginFilter === "30d") {
      if (!user.lastLoginAt || now - user.lastLoginAt.getTime() > 30 * 86_400_000) return false;
    }
  }

  // Activity filter
  if (filters.activityFilter && filters.activityFilter !== "ALL") {
    const activityStatus = (user._activityCount ?? 0) >= 3 ? "active" : "inactive";
    if (activityStatus !== filters.activityFilter) return false;
  }

  // Churn filter
  if (filters.churnFilter) {
    const tier = user.subscription?.tier || "FREE";
    const status = user.subscription?.status || "active";
    if (tier === "FREE" || status !== "active") return false;

    const periodEnd = user.subscription?.currentPeriodEnd;
    const thirtyDaysAgo = new Date(now - 30 * 86_400_000);
    const sevenDaysFromNow = new Date(now + 7 * 86_400_000);
    const expiresWithin7d = periodEnd && periodEnd <= sevenDaysFromNow;
    const noRecentLogin = !user.lastLoginAt || user.lastLoginAt < thirtyDaysAgo;
    if (!expiresWithin7d && !noRecentLogin) return false;
  }

  // Search query
  if (filters.searchQuery) {
    if (!user.email.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
  }

  return true;
}

/**
 * Get all user emails that match a given segment's filters
 */
export async function getUserEmailsBySegment(segmentId: string): Promise<string[]> {
  const segment = await prisma.userSegment.findUnique({
    where: { id: segmentId },
  });

  if (!segment) return [];

  let filters: SegmentFilters;
  try {
    filters = JSON.parse(segment.filters);
  } catch {
    return [];
  }

  return getUserEmailsByFilters(filters);
}

/**
 * Get all user emails that match the given filters
 */
export async function getUserEmailsByFilters(filters: SegmentFilters): Promise<string[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [users, activityCounts] = await Promise.all([
    prisma.user.findMany({
      select: {
        email: true,
        lastLoginAt: true,
        subscription: {
          select: { tier: true, status: true, currentPeriodEnd: true },
        },
      },
    }),
    // Activity counts for the activity filter
    filters.activityFilter && filters.activityFilter !== "ALL"
      ? prisma.auditLog.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  const activityMap = new Map<string, number>();
  for (const entry of activityCounts as { userId: string | null; _count: number }[]) {
    if (entry.userId) activityMap.set(entry.userId, entry._count);
  }

  return users
    .filter((u) =>
      matchesSegmentFilters(
        {
          ...u,
          _activityCount: activityMap.get(u.email) ?? 0,
        },
        filters
      )
    )
    .map((u) => u.email);
}
