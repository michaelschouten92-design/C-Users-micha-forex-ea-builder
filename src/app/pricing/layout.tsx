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
        description: "All features included, 1 monitored trading account",
      },
      {
        "@type": "Offer",
        name: "Control",
        price: "39",
        priceCurrency: "EUR",
        description: "All features included, up to 5 monitored trading accounts, priority support",
      },
      {
        "@type": "Offer",
        name: "Authority",
        price: "79",
        priceCurrency: "EUR",
        description:
          "All features included, up to 15 monitored trading accounts, early feature access, direct developer support",
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
