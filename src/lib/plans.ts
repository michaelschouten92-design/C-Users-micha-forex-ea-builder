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
        priceId: env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      },
      yearly: {
        ...DISPLAY_PRICES.pro.yearly,
        priceId: env.STRIPE_PRO_YEARLY_PRICE_ID!,
      },
    },
    elite: {
      monthly: {
        ...DISPLAY_PRICES.elite.monthly,
        priceId: env.STRIPE_ELITE_MONTHLY_PRICE_ID || "",
      },
      yearly: {
        ...DISPLAY_PRICES.elite.yearly,
        priceId: env.STRIPE_ELITE_YEARLY_PRICE_ID || "",
      },
    },
  };
}

const priceConfig = getPriceConfigWithIds();

export const PLANS = {
  FREE: {
    name: "Free",
    tier: "FREE" as const,
    features: ["1 project", "Visual strategy builder", "1 export per month"],
    limits: {
      maxProjects: 1,
      maxExportsPerMonth: 1,
      canExportMQL5: true,
    },
    prices: null,
  },
  PRO: {
    name: "Pro",
    tier: "PRO" as const,
    features: [
      "Unlimited projects",
      "Unlimited exports",
      "MQL5 source code export",
      "Priority support",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
    },
    prices: priceConfig.pro,
  },
  ELITE: {
    name: "Elite",
    tier: "ELITE" as const,
    features: [
      "Everything in Pro",
      "Priority feature requests",
      "1-on-1 strategy review session",
      "Direct developer support",
      "Weekly Elite members call",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
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
