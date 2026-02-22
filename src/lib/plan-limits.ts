import { prisma } from "./prisma";
import { PLANS, type PlanTier, getEffectiveLimits } from "./plans";

// ============================================
// SUBSCRIPTION TIER CACHE (15 second TTL)
// ============================================
// NOTE: This is an in-process cache. On multi-instance deployments (e.g. Vercel),
// cache invalidation only affects the current instance. The short 15s TTL ensures
// stale data is bounded. For authoritative checks, the export route uses a DB
// transaction — this cache is advisory only for pre-checks.

interface CacheEntry {
  tier: PlanTier;
  expiresAt: number;
}

const tierCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 1000; // 15 seconds — short TTL for quick tier change propagation

/** Resolve the effective tier from raw subscription data (pure logic, no DB call). */
export function resolveTier(
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: Date | null;
    manualPeriodEnd?: Date | null;
  } | null
): PlanTier {
  let tier = (subscription?.tier ?? "FREE") as PlanTier;
  if (tier !== "FREE") {
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const now = new Date();
    const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < now;
    // Admin-granted extension overrides Stripe expiry
    const hasManualExtension = subscription?.manualPeriodEnd && subscription.manualPeriodEnd > now;
    if (!isActive || (isExpired && !hasManualExtension)) {
      tier = "FREE";
    }
  }
  return tier;
}

export async function getCachedTier(userId: string): Promise<PlanTier> {
  const cached = tierCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tier;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true, currentPeriodEnd: true, manualPeriodEnd: true },
  });

  const tier = resolveTier(subscription);
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

  const limits = await getEffectiveLimits(tier);
  const max = limits.maxProjects;

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
  const limits = await getEffectiveLimits(tier);
  const max = limits.maxExportsPerMonth;

  // Count exports this month (use UTC for consistent month boundaries)
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const exportCount = await prisma.exportJob.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
      deletedAt: null,
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
  const limits = await getEffectiveLimits(tier);
  return limits.canExportMQL5;
}

/** Fetch all export-related permissions in a single cached tier lookup */
export async function getExportPermissions(userId: string) {
  const tier = await getCachedTier(userId);
  const limits = await getEffectiveLimits(tier);
  return {
    tier,
    canExportMQL5: limits.canExportMQL5,
  };
}

export async function getUserPlanLimits(userId: string) {
  const [tier, subscription] = await Promise.all([
    getCachedTier(userId),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);
  const plan = PLANS[tier];
  const limits = await getEffectiveLimits(tier);

  return {
    tier, // Always reflects actual active tier (expired/cancelled → FREE)
    plan: plan.name,
    limits,
    subscription: subscription ?? null,
  };
}
