import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Simple Plans for Every Trader",
  description:
    "Simple pricing. Start free with all 6 strategy templates. Upgrade to Pro for unlimited projects and exports. No hidden complexity.",
  alternates: { canonical: "/pricing" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "AlgoStudio Pricing",
  description: "Simple pricing for AlgoStudio MT5 EA builder",
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
        description:
          "Unlimited projects, unlimited exports, trade management blocks, community access, priority support",
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
