import type { Metadata } from "next";
import Link from "next/link";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Free Expert Advisor Templates — Pre-Built MT5 EA Strategies",
  description:
    "Start with proven Expert Advisor templates. Free MA Crossover, RSI Mean Reversion, and Breakout strategy templates for MetaTrader 5. Customize and export in minutes.",
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "Free Expert Advisor Templates — Pre-Built MT5 EA Strategies",
    description:
      "Start with proven EA templates. MA Crossover, RSI Mean Reversion, and Breakout strategies ready to customize.",
    url: "/templates",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
];

const templates = [
  {
    name: "Moving Average Crossover EA",
    type: "Trend Following",
    description:
      "Classic trend-following strategy using fast and slow EMA crossovers. Best for trending markets on H1 and H4 timeframes.",
    href: "/templates/moving-average-crossover-ea",
    color: "#A78BFA",
  },
  {
    name: "RSI Mean Reversion EA",
    type: "Mean Reversion",
    description:
      "Buy oversold, sell overbought. RSI-based strategy with EMA trend filter and London session timing for high-probability setups.",
    href: "/templates/rsi-ea-template",
    color: "#22D3EE",
  },
  {
    name: "Breakout EA",
    type: "Breakout",
    description:
      "Trade the Asian range breakout at the London open. ATR-based stops and a 1.5:1 risk-reward ratio for momentum trades.",
    href: "/templates/breakout-ea-template",
    color: "#F59E0B",
  },
];

export default function TemplatesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Expert Advisor Templates",
    description:
      "Pre-built MetaTrader 5 Expert Advisor templates. MA Crossover, RSI Mean Reversion, and Breakout strategies.",
    url: `${process.env.AUTH_URL || "https://algo-studio.com"}/templates`,
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <SiteNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#10B981] font-medium">FREE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Free Expert Advisor Templates
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Don&apos;t start from scratch. Choose a proven strategy template, customize the
            parameters, and export your EA in minutes. Each template is built with best practices —
            proper risk management, session timing, and optimizable parameters.
          </p>
        </header>

        {/* Template Grid */}
        <section className="mb-16">
          <div className="space-y-6">
            {templates.map((template) => (
              <Link
                key={template.href}
                href={template.href}
                className="block bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: template.color }}
                  />
                  <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    {template.type}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{template.name}</h2>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
                  {template.description}
                </p>
                <span className="text-sm text-[#A78BFA] font-medium">View Template &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        {/* How templates work */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How Templates Work</h2>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Choose a template",
                desc: "Pick the strategy type that matches your trading style — trend following, mean reversion, or breakout.",
              },
              {
                step: "2",
                title: "Review the parameters",
                desc: "Each template comes with default settings that work well on major forex pairs. Adjust to fit your preferences.",
              },
              {
                step: "3",
                title: "Build it in AlgoStudio",
                desc: "Create a new project and replicate the template using the visual builder. Or use the parameters as a starting point for your own variation.",
              },
              {
                step: "4",
                title: "Backtest and go live",
                desc: "Export the EA, backtest in MetaTrader 5, demo trade for 1-3 months, then start live with small positions.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <CTASection
        title="Build your own strategy"
        description="Use a template as a starting point, or create something entirely new. Free to start."
      />
    </div>
  );
}
