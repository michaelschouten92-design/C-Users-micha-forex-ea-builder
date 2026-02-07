// Subscription plans configuration
import { env, features } from "./env";

// Display prices — override via env vars (amounts in cents), fallback to defaults
const parsePrice = (envVal: string | undefined, fallback: number) => {
  const parsed = parseInt(envVal ?? "", 10);
  return isNaN(parsed) ? fallback : parsed;
};

const DISPLAY_PRICES = {
  starter: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_STARTER_MONTHLY, 1900),
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_STARTER_YEARLY, 20900),
      currency: "eur",
      interval: "year" as const,
    },
  },
  pro: {
    monthly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY, 4900),
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: parsePrice(process.env.NEXT_PUBLIC_PRICE_PRO_YEARLY, 53900),
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
      starter: {
        monthly: { ...DISPLAY_PRICES.starter.monthly, priceId: "" },
        yearly: { ...DISPLAY_PRICES.starter.yearly, priceId: "" },
      },
      pro: {
        monthly: { ...DISPLAY_PRICES.pro.monthly, priceId: "" },
        yearly: { ...DISPLAY_PRICES.pro.yearly, priceId: "" },
      },
    };
  }

  // On server with Stripe enabled, include price IDs
  return {
    starter: {
      monthly: {
        ...DISPLAY_PRICES.starter.monthly,
        priceId: env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
      },
      yearly: {
        ...DISPLAY_PRICES.starter.yearly,
        priceId: env.STRIPE_STARTER_YEARLY_PRICE_ID!,
      },
    },
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
  };
}

const priceConfig = getPriceConfigWithIds();

export const PLANS = {
  FREE: {
    name: "Free",
    tier: "FREE" as const,
    features: [
      "Up to 5 projects",
      "Visual strategy builder",
      "2 exports per month",
    ],
    limits: {
      maxProjects: 5,
      maxExportsPerMonth: 2,
      canExportMQL5: true,
      canUseTradeManagement: false,
    },
    prices: null,
  },
  STARTER: {
    name: "Starter",
    tier: "STARTER" as const,
    features: [
      "Up to 25 projects",
      "10 exports per month",
      "MQL5 source code export",
      "Trade management blocks",
      "Email support",
    ],
    limits: {
      maxProjects: 25,
      maxExportsPerMonth: 10,
      canExportMQL5: true,
      canUseTradeManagement: true,
    },
    prices: priceConfig.starter,
  },
  PRO: {
    name: "Pro",
    tier: "PRO" as const,
    features: [
      "Unlimited projects",
      "Unlimited exports",
      "MQL5 source code export",
      "Trade management blocks",
      "Priority support",
      "Early access to new features",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      canUseTradeManagement: true,
    },
    prices: priceConfig.pro,
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
