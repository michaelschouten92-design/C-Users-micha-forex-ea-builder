import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AlgoStudio vs FXDreema — Detailed Comparison",
  description:
    "Compare AlgoStudio and FXDreema for building MT5 and MT4 Expert Advisors. Feature comparison, pricing, usability, and which platform fits your needs.",
  alternates: { canonical: "/compare-platforms/vs-fxdreema" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Compare Platforms", href: "/compare-platforms" },
  { name: "AlgoStudio vs FXDreema", href: "/compare-platforms/vs-fxdreema" },
];

const faqItems = [
  {
    q: "Is FXDreema really free?",
    a: "FXDreema offers a free tier with basic functionality. Some advanced features and export options may require a paid plan. AlgoStudio also offers a free tier with all templates and 1 export per month.",
  },
  {
    q: "Which is easier to learn?",
    a: "AlgoStudio is easier to learn because you start with a working strategy template and only adjust parameters. FXDreema requires you to build the entire logic flow from scratch using a flowchart editor, which takes more time to learn.",
  },
  {
    q: "Can FXDreema do everything AlgoStudio can?",
    a: "FXDreema is more flexible in terms of strategy logic since it uses a flowchart approach. However, AlgoStudio's templates include optimized risk management and code output that would take significantly longer to build in FXDreema's editor.",
  },
  {
    q: "Which has better MQL5 support?",
    a: "AlgoStudio was built with MQL5 as the primary output format. FXDreema has historically focused on MQL4, with MQL5 support added later. AlgoStudio's MQL5 code tends to be cleaner and more optimized for modern MetaTrader 5.",
  },
];

export default function VsFxdreemaPage() {
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
              AlgoStudio vs FXDreema
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              FXDreema uses a visual flowchart editor to build EAs. AlgoStudio uses pre-built
              templates. Both are no-code tools — here is how they differ.
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
                      FXDreema
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Approach", "Template-based builder", "Visual flowchart editor"],
                    ["Time to first EA", "Under 5 minutes", "30-60 minutes"],
                    ["Learning curve", "Minimal", "Moderate — learn flowchart system"],
                    ["Starting point", "Working strategy template", "Blank flowchart"],
                    ["MQL5 output", "Clean, commented source", "Generated from flowchart"],
                    ["MQL4 output", "Pro and Elite plans", "Yes"],
                    ["Strategy flexibility", "Template-based", "Unlimited flowchart logic"],
                    [
                      "Risk management",
                      "Built-in (ATR SL, sizing, limits)",
                      "Manual flowchart setup",
                    ],
                    ["Session filters", "Built-in toggle", "Manual flowchart setup"],
                    ["Custom indicators", "Via MQL5 editing", "Via flowchart blocks"],
                    ["Web-based", "Yes", "Yes"],
                    [
                      "Code readability",
                      "Well-structured, easy to modify",
                      "Auto-generated from flow",
                    ],
                    ["Free tier", "Yes — all templates, 1 export/month", "Yes — basic features"],
                  ].map(([feature, algo, fx]) => (
                    <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1] font-medium">{feature}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{fx}</td>
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
                    Free tier with all templates
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    Pro: unlimited exports, monthly subscription
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    Cancel anytime
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    MQL4 export on Pro+
                  </li>
                </ul>
              </div>
              <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#94A3B8] mb-4">FXDreema</h3>
                <ul className="space-y-3 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Free tier with basic features
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Paid plans for advanced features
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Subscription-based pricing
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    MQL4 and MQL5 export
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
                    <li>Start with a working strategy, not a blank canvas</li>
                    <li>Built-in risk management requires zero setup</li>
                    <li>Cleaner, more readable MQL5 output</li>
                    <li>Fastest path from idea to exported EA</li>
                    <li>Sensible defaults for every parameter</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wider mb-2">
                    Cons
                  </p>
                  <ul className="space-y-2 text-sm text-[#94A3B8]">
                    <li>Less flexible than flowchart approach</li>
                    <li>Cannot build arbitrary strategy logic</li>
                    <li>Fewer total blocks and nodes available</li>
                  </ul>
                </div>
              </div>
              <div className="bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#94A3B8] mb-4">FXDreema</h3>
                <div className="mb-4">
                  <p className="text-xs text-[#22D3EE] font-medium uppercase tracking-wider mb-2">
                    Pros
                  </p>
                  <ul className="space-y-2 text-sm text-[#CBD5E1]">
                    <li>Unlimited strategy flexibility</li>
                    <li>Visual flowchart is intuitive once learned</li>
                    <li>Large library of available blocks</li>
                    <li>Web-based like AlgoStudio</li>
                    <li>Strong MQL4 support</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wider mb-2">
                    Cons
                  </p>
                  <ul className="space-y-2 text-sm text-[#94A3B8]">
                    <li>Starts from blank — no templates</li>
                    <li>Risk management must be built manually</li>
                    <li>Generated code can be hard to read</li>
                    <li>Longer time to first working EA</li>
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
                    Want to automate a common strategy type quickly
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Value clean, maintainable MQL5 source code
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Want professional risk management built in
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Prefer starting with a working strategy rather than building from scratch
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#94A3B8] mb-3">
                  Choose FXDreema if you:
                </h3>
                <ul className="space-y-2 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Need completely custom strategy logic
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Enjoy visual programming and flowcharts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Need MQL4 as your primary output format
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Are willing to invest more time for more flexibility
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
