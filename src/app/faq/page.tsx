import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { faqJsonLd } from "@/components/marketing/faq-section";
import { AnimateOnScroll } from "@/components/marketing/animate-on-scroll";
import { FAQContent } from "./faq-content";

export const metadata: Metadata = {
  title: "FAQ — MT5 EA Monitoring Questions Answered | Algo Studio",
  description:
    "Common questions about MT5 strategy monitoring, drift detection, backtest comparison, verified track records, pricing, and broker compatibility. Get answers about Algo Studio.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions — Algo Studio",
    description:
      "Everything you need to know about monitoring your MetaTrader 5 Expert Advisors with Algo Studio.",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "FAQ", href: "/faq" },
];

const faqItems = [
  // General
  {
    q: "What is Algo Studio?",
    a: "Algo Studio is a monitoring and governance platform for MetaTrader 5 Expert Advisors. It monitors live EA performance against backtest baselines, detects strategy drift with CUSUM statistics, and can automatically halt degrading strategies. It also provides verified track records with cryptographic proof.",
    category: "General" as const,
  },
  {
    q: "Does Algo Studio place trades or manage my account?",
    a: "No. Algo Studio is read-only. The Monitor EA observes trade events and account data but never places, modifies, or closes trades. Your strategies run exactly as before.",
    category: "General" as const,
  },
  {
    q: "How is this different from a trading dashboard?",
    a: "Dashboards show you what happened. Algo Studio measures whether your strategy still operates within the statistical bounds that justified running it — comparing every trade against your backtest baseline in real time.",
    category: "General" as const,
  },
  {
    q: "Does it work with any MT5 broker?",
    a: "Yes. Algo Studio works with any MetaTrader 5 broker — IC Markets, Pepperstone, FTMO, or any other. The Monitor EA runs alongside your existing strategies without interfering.",
    category: "General" as const,
  },

  // How It Works
  {
    q: "How does drift detection work?",
    a: "Algo Studio uses CUSUM (cumulative sum) statistical monitoring to detect persistent performance degradation. Unlike simple threshold alerts, CUSUM accumulates small deviations over time — distinguishing normal variance from meaningful directional shift. This catches degradation weeks before it shows on your equity curve.",
    category: "Verification" as const,
  },
  {
    q: "What is a Strategy Health Score?",
    a: "A composite 0-100% score comparing live trading results against your backtest baseline. Five weighted metrics — return, drawdown, win rate, volatility, and trade frequency — are each scored independently and combined into an overall health rating.",
    category: "Verification" as const,
  },
  {
    q: "What is Monte Carlo simulation?",
    a: "Monte Carlo randomizes your trade sequence 1,000 times to reveal the probability distribution of outcomes. Instead of relying on one backtest path, you see the realistic range — best case, worst case, survival probability, and everything in between.",
    category: "Verification" as const,
  },

  // Track Record
  {
    q: "What is a Verified Track Record?",
    a: "Every trade is recorded in a tamper-resistant hash chain — each event cryptographically linked to the previous one. The result is an auditable history that proves results are genuine. Shareable with a public link, independently verifiable by anyone.",
    category: "Track Record & Monitoring" as const,
  },
  {
    q: "Will the Monitor EA slow down my strategies?",
    a: "No. The Monitor EA is lightweight and read-only. It observes trade events and sends heartbeats without interfering with execution. It has no impact on trade speed or strategy performance.",
    category: "Track Record & Monitoring" as const,
  },
  {
    q: "Is my trading data secure?",
    a: "Yes. Algo Studio never has access to your broker credentials. The Monitor EA connects over HTTPS with an encrypted API key. Trade data is stored encrypted and never shared with third parties.",
    category: "Track Record & Monitoring" as const,
  },

  // Technical
  {
    q: "How do I connect my MT5 terminal?",
    a: "Install the AlgoStudio_Monitor EA on any MT5 chart. Enter your API key (generated in the Algo Studio dashboard). The EA starts streaming data automatically. Setup takes about 2 minutes.",
    category: "Technical" as const,
  },
  {
    q: "What if I don't have a backtest yet?",
    a: "You can still connect and start monitoring. Algo Studio tracks your live performance, detects anomalies, and builds your verified track record. Uploading a backtest baseline unlocks drift detection and health scoring.",
    category: "Technical" as const,
  },

  // Pricing
  {
    q: "What do I get on the free plan?",
    a: "Everything. All features — drift detection, health scoring, auto-halt, verified track records, Telegram alerts — are included on the free Baseline plan. The only limit is 1 monitored trading account. No credit card required.",
    category: "Pricing" as const,
  },
  {
    q: "What's the difference between the plans?",
    a: "Plans differ only by how many trading accounts you can monitor: Baseline (1), Control (3), Authority (10), Institutional (unlimited). All platform features are included on every plan.",
    category: "Pricing" as const,
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time. No contracts, no cancellation fees. Your subscription remains active until the end of the current billing period.",
    category: "Pricing" as const,
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#08080A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-0 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-16">
            <h1 className="text-[28px] md:text-[42px] font-extrabold text-[#FAFAFA] leading-tight tracking-tight mb-5">
              Frequently asked questions
            </h1>
            <p className="text-base text-[#A1A1AA]">
              Everything you need to know about monitoring your MT5 strategies with Algo Studio.
            </p>
          </section>

          <FAQContent items={faqItems} />

          {/* CTA */}
          <section className="py-20 text-center">
            <AnimateOnScroll>
              <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight mb-3">
                Still have questions?
              </h2>
              <p className="text-sm text-[#A1A1AA] mb-8">
                We respond within 24 hours on business days.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="px-7 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] transition-colors text-sm"
                >
                  Contact us
                </Link>
                <Link
                  href="/register"
                  className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-sm btn-primary-cta"
                >
                  Start monitoring free
                </Link>
              </div>
            </AnimateOnScroll>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
