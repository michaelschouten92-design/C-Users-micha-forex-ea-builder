import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "AlgoStudio pricing plans. Start free, upgrade to export MetaTrader 5 Expert Advisors. Simple, transparent pricing for every trader.",
  alternates: { canonical: "/pricing" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "AlgoStudio Pricing",
  description: "Pricing plans for AlgoStudio EA builder",
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
        description: "Visual strategy builder, up to 3 projects, 2 exports per month",
      },
      {
        "@type": "Offer",
        name: "Starter",
        price: "24",
        priceCurrency: "EUR",
        description: "Up to 15 projects, 10 exports/month, trade management, MQL5 source code",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "59",
        priceCurrency: "EUR",
        description: "Unlimited projects and exports, MQL5 source code, priority support",
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
