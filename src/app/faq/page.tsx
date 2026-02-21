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
    "Common questions about AlgoStudio: strategy validation, Monte Carlo risk analysis, verified track records, health monitoring, pricing, and technical details.",
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
    a: "AlgoStudio is a strategy validation platform for algorithmic traders. It helps you determine whether a trading strategy has a real edge \u2014 before you risk capital. Build strategies with proven templates, validate with Monte Carlo risk analysis, verify performance with immutable track records, and monitor strategy health in production.",
    category: "General" as const,
  },
  {
    q: "What is strategy validation?",
    a: "Strategy validation is the process of objectively determining whether a trading strategy has a real, repeatable edge. AlgoStudio combines Monte Carlo risk analysis, verified track records, and live health monitoring to give you a complete picture of strategy viability.",
    category: "General" as const,
  },
  {
    q: "Do I need coding experience?",
    a: "No. AlgoStudio is a no-code platform. Pick a strategy template, adjust settings like risk percentage and stop loss, and export a ready-to-use .mq5 file. No MQL5, Python, or programming knowledge required.",
    category: "General" as const,
  },
  {
    q: "How is AlgoStudio different from other EA builders?",
    a: "Most EA builders give you a builder and stop. AlgoStudio goes further with Monte Carlo risk analysis, verified track records (tamper-resistant hash chain), strategy identity (permanent versioned IDs), and health monitoring (live vs. baseline comparison). It's not just building \u2014 it's knowing if your strategy works.",
    category: "General" as const,
  },

  // Validation
  {
    q: "What is Monte Carlo simulation?",
    a: "Monte Carlo simulation randomizes your trade sequence thousands of times to reveal the probability distribution of outcomes. Instead of relying on one backtest result, you see the realistic range — best case, worst case, and everything in between. This separates luck from genuine edge.",
    category: "Validation" as const,
  },
  {
    q: "How does the Monte Carlo risk calculator work?",
    a: "The Monte Carlo risk calculator randomizes your trade sequence thousands of times to reveal the probability distribution of outcomes. Instead of relying on a single test, you see the realistic range \u2014 best case, worst case, and everything in between. This separates luck from genuine edge.",
    category: "Validation" as const,
  },
  {
    q: "How do I test my EA?",
    a: "Export your EA as an MQL5 file and load it into MetaTrader 5's Strategy Tester. AlgoStudio generates clean, optimizable code that works directly with the MT5 backtester. Use the built-in optimization support to test different parameter combinations.",
    category: "Validation" as const,
  },

  // Track Record & Monitoring
  {
    q: "What is a Verified Track Record?",
    a: "Every trade your EA makes is recorded in a tamper-resistant hash chain — similar to how blockchain works. Each event is linked to the previous one with a cryptographic hash, creating an auditable history that proves your results are genuine. No manipulation, no cherry-picking.",
    category: "Track Record & Monitoring" as const,
  },
  {
    q: "What is the Strategy Health Monitor?",
    a: "The Health Monitor continuously compares your live trading performance against your backtest baseline across 5 key metrics: return, volatility, drawdown, win rate, and trade frequency. It alerts you when your strategy's edge begins to degrade — before a drawdown becomes a disaster.",
    category: "Track Record & Monitoring" as const,
  },
  {
    q: "What is Strategy Identity?",
    a: "Each strategy gets a permanent, unique identifier (AS-xxxx) and version history. When you change parameters or logic, a new version is created with its own fingerprint. This lets you track exactly what's deployed, what changed, and when.",
    category: "Track Record & Monitoring" as const,
  },

  // Technical
  {
    q: "What file format does AlgoStudio export?",
    a: "AlgoStudio exports standard .mq5 files for MetaTrader 5. Clean, well-commented source code with no external dependencies or proprietary formats. The code is yours.",
    category: "Technical" as const,
  },
  {
    q: "Which brokers are supported?",
    a: "The exported EA runs on any broker that supports MetaTrader 5. Compatible with prop firms like FTMO, E8 Markets, and FundingPips. The output uses standard MQL5 functions — no broker-specific code.",
    category: "Technical" as const,
  },
  {
    q: "Can I edit the exported code?",
    a: "Yes. You get clean, well-commented MQL5 source code that you can open and modify in MetaEditor or any text editor. The code is yours to customize, optimize, or extend.",
    category: "Technical" as const,
  },

  // Pricing
  {
    q: "What do I get with the free plan?",
    a: "Full access to the strategy builder and all templates. 1 project and 3 MQL5 exports per month. Monte Carlo risk calculator and AI strategy generator included. No credit card required.",
    category: "Pricing" as const,
  },
  {
    q: "What's included in Pro?",
    a: "Unlimited projects and exports. Strategy Identity, Verified Track Record, live EA monitoring, and priority support. Everything you need to build and run strategies with confidence.",
    category: "Pricing" as const,
  },
  {
    q: "What's included in Elite?",
    a: "Everything in Pro, plus Strategy Health Monitor, edge degradation alerts, and public Verified Strategy Pages. Designed for traders who run strategies with real capital and need ongoing protection.",
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
    <div className="min-h-screen flex flex-col overflow-x-hidden">
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
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-[#94A3B8]">Everything you need to know about AlgoStudio.</p>
          </section>

          <FAQContent items={faqItems} />
        </div>
      </main>

      <CTASection
        title="Ready to validate your strategy?"
        description="Build, verify, and monitor your trading strategy with objective data. Free — no credit card required."
        ctaText="Start Validating — Free"
      />

      <Footer />
    </div>
  );
}
