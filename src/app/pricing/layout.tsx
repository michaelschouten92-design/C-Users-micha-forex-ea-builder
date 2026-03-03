import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Choose Your Governance Depth",
  description:
    "From validation to full lifecycle authority. Compare Baseline, Control, and Authority tiers. No hidden fees. Cancel anytime.",
  alternates: { canonical: "/pricing" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "AlgoStudio Pricing",
  description: "Governance depth tiers for AlgoStudio. Baseline, Control, and Authority.",
  mainEntity: {
    "@type": "SoftwareApplication",
    name: "AlgoStudio",
    applicationCategory: "FinanceApplication",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "EUR",
        description:
          "All 6 strategy templates, full builder access, 1 project, 1 MQL5 export per month",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "39",
        priceCurrency: "EUR",
        description: "Unlimited projects, unlimited MQL5 exports, priority support",
      },
      {
        "@type": "Offer",
        name: "Elite",
        price: "79",
        priceCurrency: "EUR",
        description:
          "Everything in Pro plus early feature access, prop firm presets, direct developer support",
      },
    ],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
