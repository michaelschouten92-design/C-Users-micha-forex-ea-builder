import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AlgoStudio vs StrategyQuant — Detailed Comparison",
  description:
    "Compare AlgoStudio and StrategyQuant for building MT5 Expert Advisors. Feature comparison, pricing, complexity, and which platform is right for you.",
  alternates: { canonical: "/compare-platforms/vs-strategyquant" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Compare Platforms", href: "/compare-platforms" },
  { name: "AlgoStudio vs StrategyQuant", href: "/compare-platforms/vs-strategyquant" },
];

const faqItems = [
  {
    q: "Is StrategyQuant worth the price?",
    a: "StrategyQuant is a professional-grade quantitative platform. If you need AI-driven strategy generation, walk-forward analysis, and portfolio-level optimization, the price is justified. If you want to automate a known strategy quickly, AlgoStudio offers better value.",
  },
  {
    q: "Can StrategyQuant replace AlgoStudio?",
    a: "They serve different needs. StrategyQuant is for quant traders who want to discover new strategies through AI and data mining. AlgoStudio is for traders who already have a strategy idea and want the fastest path to a working EA.",
  },
  {
    q: "Do I need programming knowledge for StrategyQuant?",
    a: "StrategyQuant does not require coding, but its interface is complex. Understanding concepts like walk-forward optimization, Monte Carlo simulation, and statistical significance helps greatly. AlgoStudio requires no such background knowledge.",
  },
  {
    q: "Which produces better trading results?",
    a: "Neither platform guarantees profits. StrategyQuant can discover strategies you would not think of, but those strategies may be overfitted. AlgoStudio uses proven, well-understood templates. Success depends on your risk management and market conditions, not the tool.",
  },
];

export default function VsStrategyQuantPage() {
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
              AlgoStudio vs StrategyQuant
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              StrategyQuant is a powerful quantitative strategy development platform. AlgoStudio
              focuses on simplicity and speed. Here is how they compare.
            </p>
          </section>

          {/* Feature comparison table */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8">Feature Comparison</h2>
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
                      StrategyQuant
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Approach", "Template-based builder", "AI strategy generation + builder"],
                    ["Time to first EA", "Under 5 minutes", "Hours to days"],
                    ["Learning curve", "Minimal", "Steep — requires quant concepts"],
                    [
                      "Strategy discovery",
                      "Choose from 6 templates",
                      "AI generates thousands of strategies",
                    ],
                    ["Walk-forward analysis", "Not included (use MT5)", "Built-in"],
                    ["Monte Carlo simulation", "Not included", "Built-in"],
                    ["Portfolio building", "Not included", "Built-in"],
                    ["MQL5 output", "Clean, commented source", "Generated code"],
                    ["MQL4 output", "Not supported", "Yes"],
                    ["Risk management", "Built-in templates", "Advanced custom rules"],
                    ["Custom indicators", "Via MQL5 editing", "Built-in editor"],
                    ["Web-based", "Yes", "Desktop application"],
                    ["Target user", "Traders with strategy ideas", "Quant traders and developers"],
                  ].map(([feature, algo, sq]) => (
                    <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1] font-medium">{feature}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{sq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pricing comparison */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8">Pricing Comparison</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#A78BFA] mb-4">AlgoStudio</h3>
                <ul className="space-y-3 text-sm text-[#CBD5E1]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    Free tier available
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    Pro from ~$40/month
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    Cancel anytime — no long-term commitment
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    All updates included
                  </li>
                </ul>
              </div>
              <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#94A3B8] mb-4">StrategyQuant</h3>
                <ul className="space-y-3 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    No free tier
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    One-time license ~$500-$2,000+
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Annual maintenance fee for updates
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Significant upfront investment
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Pros and cons */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8">Pros and Cons</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#A78BFA] mb-4">AlgoStudio</h3>
                <div className="mb-4">
                  <p className="text-xs text-[#22D3EE] font-medium uppercase tracking-wider mb-2">
                    Pros
                  </p>
                  <ul className="space-y-2 text-sm text-[#CBD5E1]">
                    <li>Get a working EA in minutes, not hours</li>
                    <li>Zero learning curve for template-based building</li>
                    <li>Affordable — free tier and low monthly cost</li>
                    <li>Web-based, works on any device</li>
                    <li>Clean MQL5 source code you can modify</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wider mb-2">
                    Cons
                  </p>
                  <ul className="space-y-2 text-sm text-[#94A3B8]">
                    <li>No AI strategy discovery</li>
                    <li>No built-in backtesting or optimization</li>
                    <li>Limited to template strategies</li>
                  </ul>
                </div>
              </div>
              <div className="bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#94A3B8] mb-4">StrategyQuant</h3>
                <div className="mb-4">
                  <p className="text-xs text-[#22D3EE] font-medium uppercase tracking-wider mb-2">
                    Pros
                  </p>
                  <ul className="space-y-2 text-sm text-[#CBD5E1]">
                    <li>AI-powered strategy generation</li>
                    <li>Built-in backtesting and optimization</li>
                    <li>Walk-forward analysis and Monte Carlo testing</li>
                    <li>Portfolio-level strategy management</li>
                    <li>Highly customizable for advanced users</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wider mb-2">
                    Cons
                  </p>
                  <ul className="space-y-2 text-sm text-[#94A3B8]">
                    <li>Steep learning curve</li>
                    <li>Expensive upfront cost</li>
                    <li>Desktop-only application</li>
                    <li>Risk of overfitting with AI-generated strategies</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Best for */}
          <section className="mb-20 bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Who Should Use Which?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-base font-semibold text-[#A78BFA] mb-3">
                  Choose AlgoStudio if you:
                </h3>
                <ul className="space-y-2 text-sm text-[#CBD5E1]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Already know what strategy you want to automate
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Want results in minutes, not days
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Prefer simplicity over maximum flexibility
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Want to start free and scale up
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#94A3B8] mb-3">
                  Choose StrategyQuant if you:
                </h3>
                <ul className="space-y-2 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Want AI to discover strategies for you
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Need advanced statistical analysis tools
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Manage a portfolio of multiple strategies
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Have the budget and time for a professional tool
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Try AlgoStudio Free"
        description="Build your first EA in under 5 minutes. No credit card, no installation required."
        ctaText="Start Building Free"
      />

      <Footer />
    </div>
  );
}
