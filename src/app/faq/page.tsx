import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { FAQContent } from "./faq-content";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions | AlgoStudio",
  description:
    "Common questions about AlgoStudio: strategy monitoring, verification, Monte Carlo analysis, verified track records, health monitoring, pricing, and technical details.",
  alternates: { canonical: "/faq" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "FAQ", href: "/faq" },
];

const faqItems = [
  // General
  {
    q: "What is AlgoStudio?",
    a: "AlgoStudio is a monitoring and governance platform for algorithmic trading strategies. It monitors live strategy performance against validated baselines, detects structural deviation, verifies track records with cryptographic proof, and provides lifecycle governance for deployed strategies.",
    category: "General" as const,
  },
  {
    q: "What is strategy verification?",
    a: "Strategy verification is the process of objectively measuring whether a trading strategy operates within its validated parameters. AlgoStudio combines Monte Carlo risk analysis, verified track records, and live health monitoring to give you a complete picture of strategy integrity.",
    category: "General" as const,
  },
  {
    q: "Does AlgoStudio place trades?",
    a: "No. AlgoStudio does not place trades, generate signals, or manage positions. It monitors and verifies strategy performance. Trading decisions remain with you and your strategy.",
    category: "General" as const,
  },
  {
    q: "How is AlgoStudio different from a trading dashboard?",
    a: "Dashboards show you what happened. AlgoStudio measures whether your strategy is still operating within the statistical bounds that justified running it. It combines Monte Carlo analysis, verified track records (tamper-resistant hash chain), strategy identity (permanent versioned IDs), and health monitoring (live vs. baseline comparison).",
    category: "General" as const,
  },

  // Verification
  {
    q: "What is Monte Carlo simulation?",
    a: "Monte Carlo simulation randomizes your trade sequence thousands of times to reveal the probability distribution of outcomes. Instead of relying on one backtest result, you see the realistic range \u2014 best case, worst case, and everything in between. This separates luck from genuine edge.",
    category: "Verification" as const,
  },
  {
    q: "How does the Monte Carlo risk calculator work?",
    a: "The Monte Carlo risk calculator randomizes your trade sequence thousands of times to reveal the probability distribution of outcomes. Instead of relying on a single test, you see the realistic range \u2014 best case, worst case, and everything in between. This separates luck from genuine edge.",
    category: "Verification" as const,
  },
  {
    q: "How do I get my strategy evaluated?",
    a: "Upload a backtest report from MetaTrader 5 or connect your trading account. AlgoStudio analyzes the trade history, scores strategy health, and runs Monte Carlo validation automatically.",
    category: "Verification" as const,
  },

  // Track Record & Monitoring
  {
    q: "What is a Verified Track Record?",
    a: "Every trade is recorded in a tamper-resistant hash chain \u2014 similar to how blockchain works. Each event is linked to the previous one with a cryptographic hash, creating an auditable history that proves results are genuine. No manipulation, no cherry-picking.",
    category: "Track Record & Monitoring" as const,
  },
  {
    q: "What is the Strategy Health Monitor?",
    a: "The Health Monitor continuously compares live trading performance against the backtest baseline across 5 key metrics: return, volatility, drawdown, win rate, and trade frequency. It detects when a strategy's edge begins to degrade \u2014 before a drawdown becomes critical.",
    category: "Track Record & Monitoring" as const,
  },
  {
    q: "What is Strategy Identity?",
    a: "Each strategy gets a permanent, unique identifier (AS-xxxx) and version history. When you change parameters or logic, a new version is created with its own fingerprint. This lets you track exactly what's deployed, what changed, and when.",
    category: "Track Record & Monitoring" as const,
  },

  // Technical
  {
    q: "How do strategies enter AlgoStudio?",
    a: "Strategies can enter through broker connection, backtest report upload, or the optional built-in EA builder. The EA builder exports standard .mq5 files for MetaTrader 5, but it is one input method \u2014 not the core of the platform.",
    category: "Technical" as const,
  },
  {
    q: "Which brokers are supported?",
    a: "AlgoStudio supports any broker that provides MetaTrader 5 trade history. Compatible with prop firms like FTMO, E8 Markets, and FundingPips.",
    category: "Technical" as const,
  },

  // Pricing
  {
    q: "What do I get with the free plan?",
    a: "Access to basic monitoring, 1 project, backtest health scoring, and Monte Carlo risk analysis. No credit card required.",
    category: "Pricing" as const,
  },
  {
    q: "What's included in Pro?",
    a: "Unlimited projects, Strategy Identity, Verified Track Record, live monitoring, and priority support. Everything you need to monitor strategies with confidence.",
    category: "Pricing" as const,
  },
  {
    q: "What's included in Elite?",
    a: "Everything in Pro, plus Strategy Health Monitor, edge degradation alerts, and public Verified Strategy Pages. Designed for traders who run strategies with real capital and need ongoing monitoring.",
    category: "Pricing" as const,
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time. Your access continues until the end of your billing period.",
    category: "Pricing" as const,
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#09090B]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-[#FAFAFA] leading-tight mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-[#A1A1AA]">Everything you need to know about AlgoStudio.</p>
          </section>

          <FAQContent items={faqItems} />
        </div>
      </main>

      <CTASection
        title="Monitor your trading strategies"
        description="Continuous performance tracking, verification, and governance for algorithmic strategies."
      />

      <Footer />
    </div>
  );
}
