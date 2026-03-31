import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — MT5 Strategy Monitoring Plans | AlgoStudio",
  description:
    "Monitor MetaTrader 5 strategies from €0/month. Baseline (free, 1 account), Control (€39, 3 accounts), Authority (€79, 10 accounts). All features included. No hidden fees.",
  alternates: { canonical: "/pricing" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "AlgoStudio Pricing",
  description: "MT5 strategy monitoring plans. Baseline, Control, and Authority tiers.",
  mainEntity: {
    "@type": "SoftwareApplication",
    name: "AlgoStudio",
    applicationCategory: "FinanceApplication",
    offers: [
      {
        "@type": "Offer",
        name: "Baseline",
        price: "0",
        priceCurrency: "EUR",
        description: "All features included, 1 monitored trading account",
      },
      {
        "@type": "Offer",
        name: "Control",
        price: "39",
        priceCurrency: "EUR",
        description: "All features included, up to 3 monitored trading accounts, priority support",
      },
      {
        "@type": "Offer",
        name: "Authority",
        price: "79",
        priceCurrency: "EUR",
        description:
          "All features included, up to 10 monitored trading accounts, early feature access, direct developer support",
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
