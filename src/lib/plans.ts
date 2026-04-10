// Subscription plans configuration
// DB enum: FREE | PRO | ELITE | INSTITUTIONAL
// Display names: Baseline | Control | Authority | Institutional
// Billing metric: monitored trading accounts (TerminalConnection)
import { env, features } from "./env";

export type PlanTier = "FREE" | "PRO" | "ELITE" | "INSTITUTIONAL";

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
  },
  elite: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_ELITE_MONTHLY, 7900),
      currency: "eur",
      interval: "month" as const,
    },
  },
  institutional: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_INSTITUTIONAL_MONTHLY, 19900),
      currency: "eur",
      interval: "month" as const,
    },
  },
};

// Helper to get price config with Stripe price IDs (only on server when Stripe is enabled)
function getPriceConfigWithIds() {
  // On client side or when Stripe is not enabled, return display prices without IDs
  if (typeof window !== "undefined" || !features.stripe) {
    return {
      pro: { monthly: { ...DISPLAY_PRICES.pro.monthly, priceId: "" } },
      elite: { monthly: { ...DISPLAY_PRICES.elite.monthly, priceId: "" } },
      institutional: { monthly: { ...DISPLAY_PRICES.institutional.monthly, priceId: "" } },
    };
  }

  // On server with Stripe enabled, include price IDs
  return {
    pro: {
      monthly: {
        ...DISPLAY_PRICES.pro.monthly,
        priceId: env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim() ?? "",
      },
    },
    elite: {
      monthly: {
        ...DISPLAY_PRICES.elite.monthly,
        priceId: env.STRIPE_ELITE_MONTHLY_PRICE_ID?.trim() ?? "",
      },
    },
    institutional: {
      monthly: {
        ...DISPLAY_PRICES.institutional.monthly,
        priceId: env.STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID?.trim() ?? "",
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

/** DB integer sentinel for "unlimited" — DB integers can't store Infinity */
export const UNLIMITED_SENTINEL = 999999;

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
      "Browser push alerts",
    ],
    limits: {
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
      "Telegram alerts",
      "5 public track record shares",
      "Unlimited strategy baselines",
      "Priority support",
    ],
    limits: {
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
      "Telegram + Slack + webhook alerts",
      "Unlimited public track record shares",
      "Embeddable proof widget",
      "1-on-1 strategy review (1/month)",
      "Priority support",
    ],
    mostPopular: true,
    limits: {
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
      "All alert channels",
      "Custom onboarding",
      "Dedicated support channel",
      "SLA-backed uptime guarantee",
    ],
    limits: {
      maxMonitoredTradingAccounts: Infinity,
    },
    prices: priceConfig.institutional,
  },
} as const;

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
  PRO: 39,
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
// TIER FEATURE GATES
// ============================================

/** Alert channels available per tier. */
export const TIER_ALERT_CHANNELS: Record<PlanTier, readonly string[]> = {
  FREE: ["BROWSER_PUSH"],
  PRO: ["BROWSER_PUSH", "TELEGRAM"],
  ELITE: ["BROWSER_PUSH", "TELEGRAM", "SLACK", "WEBHOOK", "EMAIL"],
  INSTITUTIONAL: ["BROWSER_PUSH", "TELEGRAM", "SLACK", "WEBHOOK", "EMAIL"],
};

/** Maximum number of public track record shares per tier. Infinity = unlimited. */
export const TIER_MAX_PUBLIC_SHARES: Record<PlanTier, number> = {
  FREE: 1,
  PRO: 5,
  ELITE: Infinity,
  INSTITUTIONAL: Infinity,
};

/** Maximum distinct baselines per strategy identity per tier. Infinity = unlimited. */
export const TIER_MAX_BASELINES_PER_STRATEGY: Record<PlanTier, number> = {
  FREE: 1,
  PRO: Infinity,
  ELITE: Infinity,
  INSTITUTIONAL: Infinity,
};

export function isAlertChannelAllowed(tier: PlanTier, channel: string): boolean {
  return TIER_ALERT_CHANNELS[tier].includes(channel);
}

export function getMaxPublicShares(tier: PlanTier): number {
  return TIER_MAX_PUBLIC_SHARES[tier];
}

export function getMaxBaselinesPerStrategy(tier: PlanTier): number {
  return TIER_MAX_BASELINES_PER_STRATEGY[tier];
}
