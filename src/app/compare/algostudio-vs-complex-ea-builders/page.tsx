import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AlgoStudio vs Complex EA Builders — Comparison | AlgoStudio",
  description:
    "Compare AlgoStudio with complex EA builders. See the differences in speed, complexity, output quality, and pricing. Find the right EA builder for your needs.",
  alternates: { canonical: "/compare/algostudio-vs-complex-ea-builders" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Compare", href: "/compare/algostudio-vs-complex-ea-builders" },
  { name: "AlgoStudio vs Complex EA Builders", href: "/compare/algostudio-vs-complex-ea-builders" },
];

const faqItems = [
  {
    q: "Is AlgoStudio better than other EA builders?",
    a: "It depends on your goal. If you want the fastest way to build a working MT5 EA without coding, AlgoStudio is the better choice. If you need a fully custom strategy with unique logic not covered by templates, a more flexible builder may be needed.",
  },
  {
    q: "Can I switch from another EA builder to AlgoStudio?",
    a: "Yes. AlgoStudio doesn't require migration — you start fresh with a template. If you already have a strategy in mind, you can recreate it in minutes.",
  },
  {
    q: "Does AlgoStudio support custom indicators?",
    a: "AlgoStudio focuses on built-in indicators (EMA, RSI, MACD, ATR). For custom indicators, export your EA and add them in MetaEditor using the clean MQL5 code.",
  },
  {
    q: "Why doesn't AlgoStudio have drag-and-drop blocks?",
    a: "By design. Drag-and-drop block editors create the illusion of simplicity but often require hours of wiring and configuration. AlgoStudio's template approach is genuinely simpler.",
  },
];

export default function ComparePage() {
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
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              AlgoStudio vs Complex EA Builders
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Not all EA builders are the same. Here&apos;s how AlgoStudio&apos;s template-based
              approach compares to traditional complex EA builders.
            </p>
          </section>

          {/* Main comparison table */}
          <section className="mb-20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(79,70,229,0.2)]">
                    <th className="text-left py-4 px-4 text-[#64748B] font-medium w-1/3">
                      Feature
                    </th>
                    <th className="text-center py-4 px-4 text-[#A78BFA] font-medium w-1/3">
                      AlgoStudio
                    </th>
                    <th className="text-center py-4 px-4 text-[#64748B] font-medium w-1/3">
                      Complex EA Builders
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Approach", "Template-based", "Blank canvas / node editor"],
                    ["Time to first EA", "< 5 minutes", "Hours to days"],
                    ["Coding required", "None", "Often required"],
                    ["Learning curve", "Minimal", "Steep"],
                    ["Settings per strategy", "3-5 basic settings", "50+ fields"],
                    ["Starting point", "Working strategy", "Empty project"],
                    ["Output format", "Clean .mq5 source code", "Varies (some proprietary)"],
                    [
                      "Code readability",
                      "Well-commented, clean",
                      "Often auto-generated, hard to read",
                    ],
                    ["Risk management", "Built-in (ATR SL, position sizing)", "Manual setup"],
                    ["Custom indicators", "Via MQL5 code editing", "Built-in editor"],
                    ["Backtesting", "Via MT5 Strategy Tester", "Some have built-in"],
                    ["Free tier", "Yes — all templates, 1 export/month", "Rarely"],
                    ["Target user", "Traders who want to automate", "Developers and quant traders"],
                  ].map(([feature, algo, others]) => (
                    <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1] font-medium">{feature}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* When to choose AlgoStudio */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">When to choose AlgoStudio</h2>
            <div className="space-y-4">
              {[
                "You want to automate a standard strategy (trend following, mean reversion, breakout) without coding",
                "You value speed — export a working EA in minutes, not days",
                "You want clean MQL5 code that you own and can edit",
                "You're new to algorithmic trading and want the simplest starting point",
                "You want to quickly test strategy variations in the MT5 Strategy Tester",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[#22D3EE] mt-0.5 flex-shrink-0">&#10003;</span>
                  <p className="text-[#94A3B8]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* When a complex builder might be better */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">
              When a complex builder might be better
            </h2>
            <div className="space-y-4">
              {[
                "You need highly custom logic that can't be expressed through templates",
                "You want to use custom indicators not supported by AlgoStudio's templates",
                "You need built-in backtesting without leaving the builder",
                "You're a developer comfortable with visual programming environments",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[#64748B] mt-0.5 flex-shrink-0">&#8226;</span>
                  <p className="text-[#94A3B8]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom line */}
          <section className="mb-20 bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">The bottom line</h2>
            <p className="text-[#94A3B8] leading-relaxed">
              AlgoStudio isn&apos;t trying to replace complex EA builders. It&apos;s an alternative
              for traders who want a faster, simpler path to a working Expert Advisor. If your
              strategy fits one of our 5 templates, you can go from idea to backtest in under 5
              minutes — with clean code you own and can customize.
            </p>
            <div className="mt-6">
              <Link
                href="/login?mode=register"
                className="inline-block bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
              >
                Try AlgoStudio Free
              </Link>
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="See the difference for yourself"
        description="Pick a template and export your first EA in minutes. No credit card required."
      />

      <Footer />
    </div>
  );
}
