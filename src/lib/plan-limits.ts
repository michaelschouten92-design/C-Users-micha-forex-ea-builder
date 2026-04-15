import { prisma } from "./prisma";
import {
  PLANS,
  type PlanTier,
  getMaxMonitoredAccounts,
  getMaxPublicShares,
  getTierDisplayName,
  TIER_ALERT_CHANNELS,
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

/**
 * Statuses that grant tier access:
 *   - `active` / `trialing`  → fully entitled
 *   - `past_due`             → grace window (Stripe retries up to ~7 days)
 *   - `incomplete`           → initial-payment window (3DS / SCA, ~24h)
 *
 * `unpaid`, `cancelled`, `paused`, `expired`, `incomplete_expired` do NOT
 * grant access. The `currentPeriodEnd` check below still kicks in for grace
 * statuses — once the period has actually ended, tier drops to FREE
 * regardless of status.
 */
const TIER_GRANTING_STATUSES = new Set(["active", "trialing", "past_due", "incomplete"]);

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
    const isEntitled = subscription ? TIER_GRANTING_STATUSES.has(subscription.status) : false;
    const now = new Date();
    const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < now;
    // Admin-granted extension overrides Stripe expiry
    const hasManualExtension = subscription?.manualPeriodEnd && subscription.manualPeriodEnd > now;
    if (!isEntitled || (isExpired && !hasManualExtension)) {
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

// ============================================
// DOWNGRADE IMPACT CHECK
// ============================================

/**
 * Inspect the user's current resources against the target tier's limits and
 * return human-readable warnings for anything that will become unusable or
 * capped after the downgrade takes effect.
 *
 * Does NOT block the downgrade — these are advisory messages surfaced to the
 * user before they confirm. Monitored account limit is enforced separately
 * (blocking) in the change-plan route.
 */
export async function checkDowngradeImpact(
  userId: string,
  targetTier: PlanTier
): Promise<string[]> {
  const warnings: string[] = [];

  // Public track record shares
  const maxShares = getMaxPublicShares(targetTier);
  if (maxShares !== Infinity) {
    const currentShares = await prisma.accountTrackRecordShare.count({
      where: { userId, isPublic: true },
    });
    if (currentShares > maxShares) {
      warnings.push(
        `You have ${currentShares} public track record share${currentShares !== 1 ? "s" : ""}. The ${getTierDisplayName(targetTier)} plan allows ${maxShares}. Existing shares will be auto-hidden beyond the limit.`
      );
    }
  }

  // Alert channels: check if user has configured channels that the target tier doesn't support
  const allowedChannels = TIER_ALERT_CHANNELS[targetTier];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true, webhookUrl: true },
  });

  if (user?.telegramChatId && !allowedChannels.includes("TELEGRAM")) {
    warnings.push(
      `Telegram alerts are not available on the ${getTierDisplayName(targetTier)} plan — they will stop working after downgrade.`
    );
  }

  if (user?.webhookUrl && !allowedChannels.includes("WEBHOOK")) {
    warnings.push(
      `Custom webhook alerts are not available on the ${getTierDisplayName(targetTier)} plan — your webhook URL will stop receiving alerts after downgrade.`
    );
  }

  return warnings;
}
