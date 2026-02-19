import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AlgoStudio vs EA Builder — Detailed Comparison",
  description:
    "Compare AlgoStudio and EA Builder side by side. Feature comparison, pricing, code quality, and ease of use for building MT5 Expert Advisors.",
  alternates: { canonical: "/compare-platforms/vs-ea-builder" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Compare Platforms", href: "/compare-platforms" },
  { name: "AlgoStudio vs EA Builder", href: "/compare-platforms/vs-ea-builder" },
];

const faqItems = [
  {
    q: "Is EA Builder completely free?",
    a: "EA Builder offers a free version with limited features. The full version is a one-time purchase. AlgoStudio offers a free tier with all templates and 1 export per month, with Pro starting at a monthly subscription for unlimited use.",
  },
  {
    q: "Can I switch from EA Builder to AlgoStudio?",
    a: "Yes. AlgoStudio does not require migration — you build from templates, so you can recreate any strategy quickly. If you already know your strategy logic, you can have a working EA in under 5 minutes.",
  },
  {
    q: "Which produces better MQL5 code?",
    a: "AlgoStudio's code is hand-crafted from optimized templates, resulting in clean, well-commented source code. EA Builder generates code from visual blocks, which can be harder to read and modify manually.",
  },
  {
    q: "Does EA Builder support MT5?",
    a: "EA Builder primarily targets MT4 with MQL4 output. MT5 support varies by version. AlgoStudio focuses on MQL5 as the primary output format, with MQL4 available on Pro and Elite plans.",
  },
];

export default function VsEaBuilderPage() {
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
              AlgoStudio vs EA Builder
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Both platforms let you build Expert Advisors without coding. Here is an honest
              comparison of their approaches, features, and trade-offs.
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
                      EA Builder
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Approach", "Template-based visual builder", "Drag-and-drop block editor"],
                    ["Time to first EA", "Under 5 minutes", "30-60 minutes"],
                    [
                      "Learning curve",
                      "Minimal — start with a working strategy",
                      "Moderate — learn the block system",
                    ],
                    ["MQL5 output", "Clean, commented source code", "Auto-generated code"],
                    ["MQL4 output", "Pro and Elite plans", "Primary focus"],
                    ["Strategy templates", "6 pre-built templates with defaults", "Blank canvas"],
                    [
                      "Risk management",
                      "Built-in (ATR SL, position sizing, daily limits)",
                      "Manual configuration",
                    ],
                    ["Session filters", "Built-in", "Manual setup"],
                    ["Custom indicators", "Via MQL5 code editing", "Built-in indicator builder"],
                    ["Backtesting", "Via MT5 Strategy Tester", "Not included"],
                    [
                      "Code readability",
                      "Well-structured, easy to modify",
                      "Machine-generated, harder to edit",
                    ],
                    ["Web-based", "Yes — works in browser", "Desktop application"],
                    ["Updates", "Automatic, always latest version", "Manual download"],
                  ].map(([feature, algo, ea]) => (
                    <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1] font-medium">{feature}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{ea}</td>
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
                    Free tier: all templates, 1 project, 1 export/month
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    Pro: unlimited projects and exports
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    Monthly subscription — cancel anytime
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#22D3EE] flex-shrink-0">&#10003;</span>
                    No upfront cost to get started
                  </li>
                </ul>
              </div>
              <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#94A3B8] mb-4">EA Builder</h3>
                <ul className="space-y-3 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Free version with limited features
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Full version: one-time purchase
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    No ongoing cost after purchase
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#64748B] flex-shrink-0">&#8226;</span>
                    Updates may require additional purchase
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
                    <li>Fastest path from idea to working EA</li>
                    <li>Clean, readable MQL5 source code</li>
                    <li>Built-in risk management and session filters</li>
                    <li>Web-based — no software to install</li>
                    <li>Generous free tier to evaluate</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wider mb-2">
                    Cons
                  </p>
                  <ul className="space-y-2 text-sm text-[#94A3B8]">
                    <li>Limited to template-based strategies</li>
                    <li>No custom indicator builder</li>
                    <li>Requires MT5 for backtesting</li>
                  </ul>
                </div>
              </div>
              <div className="bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#94A3B8] mb-4">EA Builder</h3>
                <div className="mb-4">
                  <p className="text-xs text-[#22D3EE] font-medium uppercase tracking-wider mb-2">
                    Pros
                  </p>
                  <ul className="space-y-2 text-sm text-[#CBD5E1]">
                    <li>More flexible strategy building</li>
                    <li>Custom indicator support</li>
                    <li>One-time purchase (no recurring fees)</li>
                    <li>Large existing user community</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wider mb-2">
                    Cons
                  </p>
                  <ul className="space-y-2 text-sm text-[#94A3B8]">
                    <li>Steeper learning curve</li>
                    <li>Code output harder to read and modify</li>
                    <li>Desktop-only (no web version)</li>
                    <li>Risk management requires manual setup</li>
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
                    Want the fastest path to a working EA
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Value clean, editable MQL5 source code
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Want built-in risk management without setup
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] flex-shrink-0 mt-0.5">&#10003;</span>
                    Prefer a web-based tool with no installation
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#94A3B8] mb-3">
                  Choose EA Builder if you:
                </h3>
                <ul className="space-y-2 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Need custom indicators not in templates
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Prefer a one-time purchase over subscription
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Want maximum flexibility in strategy logic
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] flex-shrink-0 mt-0.5">&#8226;</span>
                    Are comfortable with a longer learning curve
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
