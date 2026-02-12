import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — MT5 Bot Builder Plans",
  description:
    "Build MT5 Expert Advisors from free. Compare Free, Pro, and Elite plans. No hidden fees. Cancel anytime. Cheaper than hiring an MQL5 developer.",
  alternates: { canonical: "/pricing" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "AlgoStudio Pricing",
  description:
    "Pricing plans for AlgoStudio no-code MT5 Expert Advisor builder. Free, Pro, and Elite tiers.",
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
          "All 5 strategy templates, full builder access, 1 project, 1 MQL5 export per month",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "39",
        priceCurrency: "EUR",
        description:
          "Unlimited projects, unlimited exports, private Discord community, priority support",
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
