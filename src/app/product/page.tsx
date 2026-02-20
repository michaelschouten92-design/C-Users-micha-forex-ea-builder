import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Product — The Simplest Way to Build an MT5 & MT4 Expert Advisor | AlgoStudio",
  description:
    "AlgoStudio is the simplest way to build an MT5 or MT4 Expert Advisor. Pick a strategy template, adjust a few settings, and export clean MQL5 & MQL4 code. No coding required.",
  alternates: { canonical: "/product" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Product", href: "/product" },
];

export default function ProductPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              The Simplest Way to Build an MT5 & MT4 Expert Advisor
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              AlgoStudio lets you turn a trading idea into a working MetaTrader bot — without
              writing a single line of code. Pick a template, adjust a few settings, export clean
              MQL5 or MQL4.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?mode=register"
                className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
              >
                Start Free
              </Link>
              <Link
                href="/product/how-it-works"
                className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                See How It Works
              </Link>
            </div>
          </section>

          {/* Quick links to product sections */}
          <section className="mb-20">
            <div className="grid md:grid-cols-3 gap-8">
              <Link
                href="/product/how-it-works"
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors"
              >
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">How It Works</h3>
                <p className="text-sm text-[#94A3B8]">
                  See the 3-step process: choose a template, customize, and export clean MQL5/MQL4
                  code.
                </p>
              </Link>
              <Link
                href="/templates"
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors"
              >
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Strategy Templates</h3>
                <p className="text-sm text-[#94A3B8]">
                  6 proven templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback,
                  MACD, and Divergence.
                </p>
              </Link>
              <Link
                href="/product/mt5-export"
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors"
              >
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Clean MQL5 & MQL4 Export</h3>
                <p className="text-sm text-[#94A3B8]">
                  Readable, well-commented source code. Standard .mq5/.mq4 format compatible with
                  any broker.
                </p>
              </Link>
            </div>
          </section>

          {/* Why AlgoStudio — concise */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Why traders choose AlgoStudio
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Most EA builders give you a blank canvas with hundreds of blocks and wires. You spend
              hours figuring out logic flows — before you even test your idea. AlgoStudio takes the
              opposite approach.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Fast</h3>
                <p className="text-sm text-[#94A3B8]">
                  Export your first EA in under 5 minutes. No learning curve, no tutorials needed.
                  Pick a template and go.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Simple</h3>
                <p className="text-sm text-[#94A3B8]">
                  Sensible defaults for every strategy. No 50-field forms, no complex logic wiring.
                  Only the controls that matter.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Clean output</h3>
                <p className="text-sm text-[#94A3B8]">
                  Readable, well-commented MQL5 & MQL4 source code. Load it in MetaTrader, backtest
                  it, edit it. The code is yours.
                </p>
              </div>
            </div>
          </section>

          {/* Comparison */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              How AlgoStudio compares
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-10">
              AlgoStudio isn&apos;t trying to be the most powerful EA builder. It&apos;s trying to
              be the simplest one that still produces real, working Expert Advisors.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(79,70,229,0.2)]">
                    <th className="text-left py-3 px-4 text-[#64748B] font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                    <th className="text-center py-3 px-4 text-[#64748B] font-medium">
                      Complex EA Builders
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Time to first EA", "< 5 minutes", "Hours to days"],
                    ["Coding required", "None", "Often required"],
                    ["Starting point", "Working templates", "Blank canvas"],
                    ["Settings per strategy", "Key settings with defaults", "50+ fields"],
                    ["Output format", "Clean MQL5/MQL4", "Varies"],
                    ["Risk management", "Built-in", "Manual setup"],
                    ["Free tier", "Yes", "Rarely"],
                  ].map(([feature, algo, others]) => (
                    <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1]">{feature}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center mt-8">
              <Link
                href="/compare/algostudio-vs-complex-ea-builders"
                className="text-sm text-[#A78BFA] font-medium hover:underline"
              >
                See full comparison &rarr;
              </Link>
            </p>
          </section>
        </div>
      </main>

      <CTASection
        title="Start building your Expert Advisor today"
        description="Pick a template, adjust a few settings, and export clean MQL5 or MQL4 code. No credit card required."
      />

      <Footer />
    </div>
  );
}
