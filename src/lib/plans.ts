// Subscription plans configuration
// DB enum: FREE | PRO | ELITE | INSTITUTIONAL
// Display names: Baseline | Control | Authority | Institutional
// Billing metric: monitored trading accounts (TerminalConnection)
import { env, features } from "./env";

// Display prices — override via env vars (amounts in cents), fallback to defaults
const parsePrice = (envVal: string | undefined, fallback: number) => {
  const parsed = parseInt(envVal ?? "", 10);
  return isNaN(parsed) ? fallback : parsed;
};

const DISPLAY_PRICES = {
  pro: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY, 2900),
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_PRO_YEARLY, 29900),
      currency: "eur",
      interval: "year" as const,
    },
  },
  elite: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_ELITE_MONTHLY, 7900),
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_ELITE_YEARLY, 79900),
      currency: "eur",
      interval: "year" as const,
    },
  },
  institutional: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_INSTITUTIONAL_MONTHLY, 19900),
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_INSTITUTIONAL_YEARLY, 199900),
      currency: "eur",
      interval: "year" as const,
    },
  },
};

// Helper to get price config with Stripe price IDs (only on server when Stripe is enabled)
function getPriceConfigWithIds() {
  // On client side or when Stripe is not enabled, return display prices without IDs
  if (typeof window !== "undefined" || !features.stripe) {
    return {
      pro: {
        monthly: { ...DISPLAY_PRICES.pro.monthly, priceId: "" },
        yearly: { ...DISPLAY_PRICES.pro.yearly, priceId: "" },
      },
      elite: {
        monthly: { ...DISPLAY_PRICES.elite.monthly, priceId: "" },
        yearly: { ...DISPLAY_PRICES.elite.yearly, priceId: "" },
      },
      institutional: {
        monthly: { ...DISPLAY_PRICES.institutional.monthly, priceId: "" },
        yearly: { ...DISPLAY_PRICES.institutional.yearly, priceId: "" },
      },
    };
  }

  // On server with Stripe enabled, include price IDs
  return {
    pro: {
      monthly: {
        ...DISPLAY_PRICES.pro.monthly,
        priceId: env.STRIPE_PRO_MONTHLY_PRICE_ID!.trim(),
      },
      yearly: {
        ...DISPLAY_PRICES.pro.yearly,
        priceId: env.STRIPE_PRO_YEARLY_PRICE_ID!.trim(),
      },
    },
    elite: {
      monthly: {
        ...DISPLAY_PRICES.elite.monthly,
        priceId: env.STRIPE_ELITE_MONTHLY_PRICE_ID!.trim(),
      },
      yearly: {
        ...DISPLAY_PRICES.elite.yearly,
        priceId: env.STRIPE_ELITE_YEARLY_PRICE_ID!.trim(),
      },
    },
    institutional: {
      monthly: {
        ...DISPLAY_PRICES.institutional.monthly,
        priceId:
          (
            env as unknown as Record<string, string | undefined>
          ).STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID?.trim() ?? "",
      },
      yearly: {
        ...DISPLAY_PRICES.institutional.yearly,
        priceId:
          (
            env as unknown as Record<string, string | undefined>
          ).STRIPE_INSTITUTIONAL_YEARLY_PRICE_ID?.trim() ?? "",
      },
    },
  };
}

const priceConfig = getPriceConfigWithIds();

// ============================================
// TIER DISPLAY NAMES
// DB enum values → user-facing names
// ============================================

export const TIER_DISPLAY_NAMES: Record<PlanTier, string> = {
  FREE: "Baseline",
  PRO: "Control",
  ELITE: "Authority",
  INSTITUTIONAL: "Institutional",
};

// ============================================
// MONITORED TRADING ACCOUNT LIMITS
// The single billing metric. null = unlimited.
// ============================================

export const TIER_ACCOUNT_LIMITS: Record<PlanTier, number | null> = {
  FREE: 1,
  PRO: 3,
  ELITE: 10,
  INSTITUTIONAL: null, // unlimited
};

// ============================================
// PLAN DEFINITIONS
// All features are included in every tier.
// Tiers differ only by number of monitored trading accounts.
// ============================================

export const PLANS = {
  FREE: {
    name: "Baseline",
    tier: "FREE" as const,
    features: [
      "All platform features included",
      "Backtest health scoring & Monte Carlo",
      "Strategy Identity & versioning",
      "Live EA monitoring dashboard",
      "Edge degradation detection",
      "Verified Track Record",
      "1 monitored trading account",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      maxMonitoredTradingAccounts: 1,
    },
    prices: null,
  },
  PRO: {
    name: "Control",
    tier: "PRO" as const,
    features: [
      "All platform features included",
      "3 monitored trading accounts",
      "Multi-strategy portfolio view",
      "Email, webhook & Telegram alerts",
      "Priority support",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      maxMonitoredTradingAccounts: 3,
    },
    prices: priceConfig.pro,
  },
  ELITE: {
    name: "Authority",
    tier: "ELITE" as const,
    features: [
      "All platform features included",
      "10 monitored trading accounts",
      "Embeddable proof widget",
      "1-on-1 strategy review (1/month)",
      "Direct developer channel",
    ],
    mostPopular: true,
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      maxMonitoredTradingAccounts: 10,
    },
    prices: priceConfig.elite,
  },
  INSTITUTIONAL: {
    name: "Institutional",
    tier: "INSTITUTIONAL" as const,
    features: [
      "All platform features included",
      "Unlimited monitored trading accounts",
      "Custom onboarding",
      "Dedicated support channel",
      "SLA-backed uptime guarantee",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      maxMonitoredTradingAccounts: Infinity,
    },
    prices: priceConfig.institutional,
  },
} as const;

export type PlanTier = "FREE" | "PRO" | "ELITE" | "INSTITUTIONAL";
export type Plan = (typeof PLANS)[PlanTier];

/**
 * Tier ordering for upgrade/downgrade comparison.
 * Higher number = higher tier.
 */
export const TIER_ORDER: Record<PlanTier, number> = {
  FREE: 0,
  PRO: 1,
  ELITE: 2,
  INSTITUTIONAL: 3,
};

/**
 * Monthly MRR prices per tier (in EUR, for revenue calculations).
 * Single source of truth — used by admin stats and cron reports.
 */
export const TIER_MRR_PRICES: Record<string, number> = {
  PRO: 29,
  ELITE: 79,
  INSTITUTIONAL: 199,
};

export function getPlan(tier: PlanTier): Plan {
  return PLANS[tier];
}

export function getTierDisplayName(tier: PlanTier): string {
  return TIER_DISPLAY_NAMES[tier];
}

export function getMaxMonitoredAccounts(tier: PlanTier): number {
  const limit = TIER_ACCOUNT_LIMITS[tier];
  return limit === null ? Infinity : limit;
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

// ============================================
// DYNAMIC PLAN LIMITS (DB overrides hardcoded)
// ============================================

interface PlanLimits {
  maxProjects: number;
  maxExportsPerMonth: number;
  canExportMQL5: boolean;
}

// In-memory cache for plan limits (60s TTL)
let limitsCache: { data: Map<string, PlanLimits>; expiresAt: number } | null = null;

/**
 * Get effective plan limits for a tier.
 * Checks DB PlanLimitConfig first (with 60s cache), falls back to hardcoded PLANS.
 */
export async function getEffectiveLimits(tier: PlanTier): Promise<PlanLimits> {
  const now = Date.now();

  // Return from cache if still valid
  if (limitsCache && limitsCache.expiresAt > now) {
    const cached = limitsCache.data.get(tier);
    if (cached) return cached;
  }

  // Refresh cache from DB (dynamic import to avoid bundling Prisma in client)
  try {
    const { prisma } = await import("./prisma");
    const configs = await prisma.planLimitConfig.findMany();
    const map = new Map<string, PlanLimits>();
    for (const c of configs) {
      map.set(c.tier, {
        maxProjects: c.maxProjects,
        maxExportsPerMonth: c.maxExportsPerMonth,
        canExportMQL5: c.canExportMQL5,
      });
    }
    limitsCache = { data: map, expiresAt: now + 60_000 };

    const cached = map.get(tier);
    if (cached) return cached;
  } catch {
    // DB unavailable — fall through to hardcoded
  }

  // Fallback to hardcoded limits
  return PLANS[tier].limits;
}
