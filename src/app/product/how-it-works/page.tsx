import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "How It Works — Strategy Validation in 4 Steps | AlgoStudio",
  description:
    "From trading idea to validated, monitored strategy in 4 steps. Build with templates, test in MT5, verify with immutable track records, and monitor health in production.",
  alternates: { canonical: "/product/how-it-works" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
  { name: "How It Works", href: "/product/how-it-works" },
];

const templates = [
  { name: "EMA Crossover", desc: "Trend following with moving average crossovers" },
  { name: "RSI Reversal", desc: "Mean reversion based on RSI overbought/oversold" },
  { name: "Range Breakout", desc: "Breakout trading of price ranges" },
  { name: "Trend Pullback", desc: "Enter on pullbacks in trending markets" },
  { name: "MACD Crossover", desc: "Momentum-based entries on MACD signals" },
  { name: "RSI/MACD Divergence", desc: "Reversal entries based on indicator divergence" },
];

const typicalSettings = [
  { label: "Risk per trade", example: "1-2% of balance" },
  { label: "Stop loss", example: "ATR multiplier (e.g. 1.5x ATR)" },
  { label: "Take profit", example: "Risk-reward ratio (e.g. 2:1)" },
  { label: "Strategy parameters", example: "Periods, levels, thresholds" },
];

const validationMethods = [
  {
    title: "MT5 Strategy Tester",
    description:
      "Export optimization-ready MQL5 code. Test in MT5 Strategy Tester with full parameter optimization support.",
    badge: null,
  },
  {
    title: "Monte Carlo Risk Calculator",
    description:
      "Run 1,000 randomized simulations. See the probability distribution \u2014 not just the best case.",
    badge: null,
  },
  {
    title: "Strategy Journal",
    description:
      "Track your strategies from testing to live. Compare performance across stages and keep notes on each iteration.",
    badge: null,
  },
];

const monitoringFeatures = [
  {
    title: "Verified Track Record",
    description:
      "Tamper-resistant hash chain records every trade. Cryptographically verified performance.",
    badge: null,
  },
  {
    title: "Strategy Health Monitor",
    description:
      "5 metrics tracked against your baseline. Alerts when your edge begins to degrade.",
    badge: "ELITE",
  },
  {
    title: "Strategy Identity",
    description:
      "Permanent AS-xxxx ID with version history. Know exactly what's deployed and what changed.",
    badge: null,
  },
];

export default function HowItWorksPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Validate a Trading Strategy with AlgoStudio",
    description:
      "From trading idea to validated, monitored strategy in 4 steps. No coding required.",
    totalTime: "PT15M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Choose a strategy template",
        text: "Pick from 6 proven strategy templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, MACD Crossover, or RSI/MACD Divergence. Each comes with sensible defaults designed around real trading approaches.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Customize and export",
        text: "Set your risk parameters, stop loss, and take profit. Export clean MQL5 source code. The code is yours to modify, optimize, and deploy.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Validate with data",
        text: "Export to MT5 Strategy Tester, run Monte Carlo simulations across 1,000 randomized scenarios, and analyze risk profiles before going live.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Deploy and monitor",
        text: "Go live with a verified track record, strategy health monitoring, and a permanent strategy identity. Every trade is recorded. Your performance is verified. Your health is monitored.",
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              From trading idea to validated strategy in 4 steps
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              No coding at any step. AlgoStudio guides you from strategy construction through
              validation, verification, and live monitoring.
            </p>
          </section>

          {/* Step 1 */}
          <section className="mb-20">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                1
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Choose a strategy template</h2>
                <p className="text-[#94A3B8] mb-6 leading-relaxed">
                  AlgoStudio starts you with a working strategy — not a blank canvas. Each template
                  is designed around a real trading approach that traders actually use.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {templates.map((t) => (
                    <div
                      key={t.name}
                      className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-4"
                    >
                      <h3 className="text-sm font-semibold text-white mb-1">{t.name}</h3>
                      <p className="text-xs text-[#94A3B8]">{t.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#94A3B8] mt-4">
                  Every template includes sensible defaults. Export immediately or customize first —{" "}
                  <Link href="/templates" className="text-[#A78BFA] hover:underline">
                    explore all templates
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section className="mb-20">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                2
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Customize and export</h2>
                <p className="text-[#94A3B8] mb-6 leading-relaxed">
                  Set your risk parameters, stop loss, and take profit. Export clean MQL5 source
                  code. The code is yours to modify, optimize, and deploy.
                </p>
                <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-4">Typical settings</h3>
                  <div className="space-y-3">
                    {typicalSettings.map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-sm">
                        <span className="text-[#CBD5E1]">{s.label}</span>
                        <span className="text-[#64748B]">{s.example}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[#94A3B8] mt-4">
                  Want more control? Toggle advanced settings for trend filters, session timing, and
                  trailing stops. But you never have to — the defaults work.
                </p>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="mb-20">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                3
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Validate with data</h2>
                <p className="text-[#94A3B8] mb-6 leading-relaxed">
                  A single test tells you nothing. True validation requires statistical rigor.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {validationMethods.map((method) => (
                    <div
                      key={method.title}
                      className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-white">{method.title}</h3>
                        {method.badge && (
                          <span className="text-[10px] font-semibold text-[#22D3EE] bg-[rgba(34,211,238,0.1)] px-1.5 py-0.5 rounded">
                            {method.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{method.description}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#64748B] mt-4">
                  All validation tools are available on every plan, including Free.
                </p>
              </div>
            </div>
          </section>

          {/* Step 4 */}
          <section className="mb-20">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                4
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Deploy and monitor</h2>
                <p className="text-[#94A3B8] mb-6 leading-relaxed">
                  Go live with confidence. Every trade is recorded. Your performance is verified.
                  Your health is monitored.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {monitoringFeatures.map((feature) => (
                    <div
                      key={feature.title}
                      className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                        {feature.badge && (
                          <span className="text-[10px] font-semibold text-[#22D3EE] bg-[rgba(34,211,238,0.1)] px-1.5 py-0.5 rounded">
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#64748B] mt-4">
                  Health Monitor requires Elite plan. Strategy Identity and Track Record require{" "}
                  <Link href="/pricing" className="text-[#A78BFA] hover:underline">
                    Pro or Elite
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <CTASection
        title="Ready to validate your strategy?"
        description="Build, verify, and monitor with objective data. Free — no credit card required."
        ctaText="Start Validating — Free"
      />

      <Footer />
    </div>
  );
}
