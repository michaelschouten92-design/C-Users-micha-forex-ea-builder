import { prisma } from "./prisma";
import {
  PLANS,
  type PlanTier,
  getMaxMonitoredAccounts,
  getTierDisplayName,
  TIER_DISPLAY_NAMES,
} from "./plans";

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

// Periodic eviction of expired entries to prevent unbounded memory growth
const EVICTION_INTERVAL_MS = 60 * 1000; // every 60 seconds
const evictionTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tierCache) {
    if (entry.expiresAt <= now) tierCache.delete(key);
  }
}, EVICTION_INTERVAL_MS);
if (typeof evictionTimer === "object" && "unref" in evictionTimer) {
  evictionTimer.unref();
}

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

export async function getUserPlanLimits(userId: string) {
  const [tier, subscription] = await Promise.all([
    getCachedTier(userId),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);
  const plan = PLANS[tier];

  return {
    tier, // Always reflects actual active tier (expired/cancelled → FREE)
    plan: plan.name,
    displayName: getTierDisplayName(tier),
    limits: plan.limits,
    subscription: subscription ?? null,
  };
}

// ============================================
// MONITORED TRADING ACCOUNT ENFORCEMENT
// ============================================

/**
 * Count actively monitored trading accounts for a user.
 * Only counts TerminalConnections that have at least one
 * non-deleted EA instance — idle/unused terminals don't count.
 */
export async function getMonitoredTradingAccountUsage(userId: string): Promise<number> {
  return prisma.terminalConnection.count({
    where: {
      userId,
      deletedAt: null,
      instances: { some: { deletedAt: null } },
    },
  });
}

/**
 * Advisory pre-check: can the user add another monitored trading account?
 * Uses cached tier (15s TTL). For authoritative checks at mutation points,
 * use checkMonitoredAccountLimitTx() within a transaction.
 */
export async function canMonitorAdditionalTradingAccount(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  tier: PlanTier;
  tierDisplayName: string;
}> {
  const [tier, current] = await Promise.all([
    getCachedTier(userId),
    getMonitoredTradingAccountUsage(userId),
  ]);

  const max = getMaxMonitoredAccounts(tier);

  return {
    allowed: current < max,
    current,
    max: max === Infinity ? -1 : max,
    tier,
    tierDisplayName: getTierDisplayName(tier),
  };
}

/**
 * Full plan usage summary for UI display.
 * Includes tier info, account usage, and next tier suggestion.
 */
export async function getPlanUsageSummary(userId: string) {
  const [tier, subscription, accountCount] = await Promise.all([
    getCachedTier(userId),
    prisma.subscription.findUnique({ where: { userId } }),
    getMonitoredTradingAccountUsage(userId),
  ]);

  const max = getMaxMonitoredAccounts(tier);
  const atLimit = max !== Infinity && accountCount >= max;

  // Determine next upgrade tier
  const tierOrder: PlanTier[] = ["FREE", "PRO", "ELITE", "INSTITUTIONAL"];
  const currentIndex = tierOrder.indexOf(tier);
  const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

  return {
    tier,
    tierDisplayName: getTierDisplayName(tier),
    monitoredAccounts: {
      current: accountCount,
      max: max === Infinity ? -1 : max,
      atLimit,
      unlimited: max === Infinity,
    },
    subscription: subscription ?? null,
    upgrade: nextTier
      ? {
          tier: nextTier,
          displayName: getTierDisplayName(nextTier),
          maxAccounts: getMaxMonitoredAccounts(nextTier),
        }
      : null,
  };
}
