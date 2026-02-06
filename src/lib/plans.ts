// Subscription plans configuration
import { env, features } from "./env";

// Display prices (always available for showing on pricing page)
const DISPLAY_PRICES = {
  starter: {
    monthly: {
      amount: 1900, // €19 in cents
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: 20900, // €209 (11 months)
      currency: "eur",
      interval: "year" as const,
    },
  },
  pro: {
    monthly: {
      amount: 4900, // €49 in cents
      currency: "eur",
      interval: "month" as const,
    },
    yearly: {
      amount: 53900, // €539 (11 months)
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
      "Unlimited projects",
      "Visual strategy builder",
      "Build and test your strategies",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: 0,
      canExportMQL5: false,
      canUseTradeManagement: false,
    },
    prices: null,
  },
  STARTER: {
    name: "Starter",
    tier: "STARTER" as const,
    features: [
      "Up to 3 projects",
      "5 exports per month",
      "MQL5 source code export",
      "Email support",
    ],
    limits: {
      maxProjects: 3,
      maxExportsPerMonth: 5,
      canExportMQL5: true,
      canUseTradeManagement: false,
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
