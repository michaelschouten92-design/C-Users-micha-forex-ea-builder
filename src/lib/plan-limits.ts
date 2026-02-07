import { prisma } from "./prisma";
import { PLANS, type PlanTier } from "./plans";

// ============================================
// SUBSCRIPTION TIER CACHE (60s TTL)
// ============================================

interface CacheEntry {
  tier: PlanTier;
  expiresAt: number;
}

const tierCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

async function getCachedTier(userId: string): Promise<PlanTier> {
  const cached = tierCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tier;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true },
  });

  const tier = (subscription?.tier ?? "FREE") as PlanTier;
  tierCache.set(userId, { tier, expiresAt: Date.now() + CACHE_TTL_MS });
  return tier;
}

/** Invalidate cache for a user (call after subscription changes) */
export function invalidateSubscriptionCache(userId: string) {
  tierCache.delete(userId);
}

export async function checkProjectLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
}> {
  const [tier, projectCount] = await Promise.all([
    getCachedTier(userId),
    prisma.project.count({ where: { userId, deletedAt: null } }),
  ]);

  const plan = PLANS[tier];
  const max = plan.limits.maxProjects;

  return {
    allowed: projectCount < max,
    current: projectCount,
    max: max === Infinity ? -1 : max,
  };
}

export async function checkExportLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
}> {
  const tier = await getCachedTier(userId);
  const plan = PLANS[tier];
  const max = plan.limits.maxExportsPerMonth;

  // Count exports this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const exportCount = await prisma.exportJob.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  return {
    allowed: exportCount < max,
    current: exportCount,
    max: max === Infinity ? -1 : max,
  };
}

export async function canExportMQL5(userId: string): Promise<boolean> {
  const tier = await getCachedTier(userId);
  return PLANS[tier].limits.canExportMQL5;
}

export async function canUseTradeManagement(userId: string): Promise<boolean> {
  const tier = await getCachedTier(userId);
  return PLANS[tier].limits.canUseTradeManagement;
}

export async function getUserPlanLimits(userId: string) {
  const tier = await getCachedTier(userId);
  const plan = PLANS[tier];

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  return {
    tier,
    plan: plan.name,
    limits: plan.limits,
    subscription,
  };
}
