// Subscription plans configuration
import { env, features } from "./env";

// Display prices — override via env vars (amounts in cents), fallback to defaults
const parsePrice = (envVal: string | undefined, fallback: number) => {
  const parsed = parseInt(envVal ?? "", 10);
  return isNaN(parsed) ? fallback : parsed;
};

const DISPLAY_PRICES = {
  pro: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY, 3900),
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_PRO_YEARLY, 39900),
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
  };
}

const priceConfig = getPriceConfigWithIds();

export const PLANS = {
  FREE: {
    name: "Free",
    tier: "FREE" as const,
    features: ["1 project", "Visual strategy builder", "3 MQL5 exports per month"],
    limits: {
      maxProjects: 1,
      maxExportsPerMonth: 3,
      canExportMQL5: true,
      canExportMQL4: false,
    },
    prices: null,
  },
  PRO: {
    name: "Pro",
    tier: "PRO" as const,
    features: [
      "Unlimited projects",
      "Unlimited MQL5 + MQL4 exports",
      "MQL5 & MQL4 source code export",
      "Priority support",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      canExportMQL4: true,
    },
    prices: priceConfig.pro,
  },
  ELITE: {
    name: "Elite",
    tier: "ELITE" as const,
    features: [
      "Everything in Pro",
      "MQL5 & MQL4 exports",
      "Priority feature requests",
      "1-on-1 strategy review session",
      "Direct developer support",
      "Weekly Elite members call",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      canExportMQL4: true,
    },
    prices: priceConfig.elite,
  },
} as const;

export type PlanTier = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanTier];

export function getPlan(tier: PlanTier): Plan {
  return PLANS[tier];
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
  canExportMQL4: boolean;
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
        canExportMQL4: c.canExportMQL4,
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
