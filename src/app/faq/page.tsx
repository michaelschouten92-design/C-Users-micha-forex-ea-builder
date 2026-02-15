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
    "Answers to common questions about AlgoStudio: how it works, pricing, templates, MT5 export, code quality, and more.",
  alternates: { canonical: "/faq" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "FAQ", href: "/faq" },
];

const faqItems = [
  {
    q: "What is AlgoStudio?",
    a: "AlgoStudio is the simplest way to build an MT5 Expert Advisor. Pick a strategy template, adjust a few settings, and export clean MQL5 code. No coding required.",
    category: "General" as const,
  },
  {
    q: "Do I need coding experience?",
    a: "No. You pick a strategy template, adjust the settings you want, and export. No MQL5, Python, or any other programming knowledge required.",
    category: "General" as const,
  },
  {
    q: "How is AlgoStudio different from other EA builders?",
    a: "Most EA builders give you a blank canvas with hundreds of options. AlgoStudio starts you with a working strategy template — you only adjust what matters. Pre-configured blocks with sensible defaults instead of complex logic wiring and 50-field forms.",
    category: "General" as const,
  },
  {
    q: "What strategy templates are available?",
    a: "AlgoStudio includes 5 templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover. Each produces a fully functional Expert Advisor with built-in risk management.",
    category: "Templates & Builder" as const,
  },
  {
    q: "How long does it take to build an EA?",
    a: "Most users export their first EA in under 5 minutes. Choose a template, adjust a few settings, and export. That's it.",
    category: "Templates & Builder" as const,
  },
  {
    q: "Can I use the exported EA in live trading?",
    a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. Backtest it in Strategy Tester and run it on any MT5 broker.",
    category: "Technical" as const,
  },
  {
    q: "Is the generated code editable?",
    a: "Yes. You get clean, well-commented MQL5 source code that you can open and modify in MetaEditor or any text editor. The code is yours.",
    category: "Technical" as const,
  },
  {
    q: "What file format does AlgoStudio export?",
    a: "AlgoStudio exports a single .mq5 file — the standard source code format for MetaTrader 5 Expert Advisors. No external dependencies, no proprietary formats.",
    category: "Technical" as const,
  },
  {
    q: "Which brokers are supported?",
    a: "The exported EA runs on any broker that supports MetaTrader 5. The output uses standard MQL5 functions — no broker-specific code.",
    category: "Technical" as const,
  },
  {
    q: "What do I get with the free plan?",
    a: "Full access to all templates and the builder. 1 project and 1 MQL5 export per month. No credit card required.",
    category: "Pricing" as const,
  },
  {
    q: "What does the Pro plan include?",
    a: "Unlimited projects, unlimited exports, all strategy templates, and priority support. Cancel anytime from your account settings.",
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
        title="Ready to get started?"
        description="Pick a template and export your first MT5 Expert Advisor. Free — no credit card required."
      />

      <Footer />
    </div>
  );
}
