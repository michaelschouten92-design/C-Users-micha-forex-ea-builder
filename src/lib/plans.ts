// Subscription plans configuration

export const PLANS = {
  FREE: {
    name: "Free",
    tier: "FREE" as const,
    features: [
      "Unlimited projects",
      "Visual strategy builder",
      "No export capability",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: 0,
      canExportMQL5: false,
      canExportEX5: false,
    },
    prices: null,
  },
  STARTER: {
    name: "Starter",
    tier: "STARTER" as const,
    features: [
      "Up to 3 projects",
      "5 exports per month",
      "EX5 export (compiled)",
      "Email support",
    ],
    limits: {
      maxProjects: 3,
      maxExportsPerMonth: 5,
      canExportMQL5: false,
      canExportEX5: true,
    },
    prices: {
      monthly: {
        amount: 1900, // in cents
        currency: "eur",
        interval: "month" as const,
        priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
      },
      yearly: {
        amount: 20900, // €209 (11 months)
        currency: "eur",
        interval: "year" as const,
        priceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
      },
    },
  },
  PRO: {
    name: "Pro",
    tier: "PRO" as const,
    features: [
      "Unlimited projects",
      "Unlimited exports",
      "MQL5 source code export",
      "EX5 export (compiled)",
      "Priority support",
    ],
    limits: {
      maxProjects: Infinity,
      maxExportsPerMonth: Infinity,
      canExportMQL5: true,
      canExportEX5: true,
    },
    prices: {
      monthly: {
        amount: 4900, // in cents
        currency: "eur",
        interval: "month" as const,
        priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      },
      yearly: {
        amount: 53900, // €539 (11 months)
        currency: "eur",
        interval: "year" as const,
        priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
      },
    },
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
