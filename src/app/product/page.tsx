import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Platform — Strategy Validation for Algorithmic Traders | AlgoStudio",
  description:
    "Build, validate, and monitor automated trading strategies. Monte Carlo simulation, verified track records, strategy health monitoring, and no-code EA building.",
  alternates: { canonical: "/product" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
];

const pipelineSteps = [
  {
    step: "01",
    label: "Build",
    title: "Strategy Construction",
    description:
      "No-code visual builder with proven templates. Customize risk parameters. Export clean MQL5 or MQL4. From idea to executable strategy in minutes.",
    features: ["6 strategy templates", "Visual drag-and-drop builder", "Clean MQL5/MQL4 export"],
  },
  {
    step: "02",
    label: "Verify",
    title: "Strategy Validation",
    description:
      "Don't trust a single backtest. Run Monte Carlo simulations. Upload backtest results. Get a Reality Check that flags unrealistic expectations.",
    features: ["Backtesting engine", "Monte Carlo simulator", "Walk-forward analysis"],
  },
  {
    step: "03",
    label: "Monitor",
    title: "Performance Protection",
    description:
      "Deploy with a verified identity. Monitor live performance against your baseline. Get alerts when your edge begins to degrade.",
    features: ["Verified Track Record", "Strategy Health Monitor", "Edge degradation alerts"],
  },
];

const platformModules = [
  {
    color: "#A78BFA",
    title: "Strategy Builder",
    description:
      "No-code visual builder with 6 proven templates. Customize risk, stops, and entries. Export clean MQL5 or MQL4 source code that you own.",
    href: "/product/how-it-works",
  },
  {
    color: "#22D3EE",
    title: "Backtesting Engine",
    description:
      "Test strategies against historical data in your browser. Analyze win rate, profit factor, drawdown, and Sharpe ratio before risking capital.",
    href: "/product/backtesting",
  },
  {
    color: "#F59E0B",
    title: "Monte Carlo Simulator",
    description:
      "Run 1,000 randomized simulations. See the probability distribution of outcomes — not just the best case, but the realistic range of what to expect.",
    href: "/product/monte-carlo",
  },
  {
    color: "#10B981",
    title: "Verified Track Record",
    description:
      "Every trade recorded in a tamper-resistant hash chain. Cryptographically verified performance that can be independently audited. Proof, not promises.",
    href: "/product/track-record",
  },
  {
    color: "#EC4899",
    title: "Strategy Identity",
    description:
      "Each strategy gets a permanent AS-xxxx ID and version history. Track exactly what's deployed, what changed, and when. Full auditability.",
    href: "/product/strategy-identity",
  },
  {
    color: "#EF4444",
    title: "Health Monitor",
    description:
      "Continuously compares live performance against your backtest baseline. 5 metrics tracked. Alerts when returns drift, drawdowns exceed norms, or edge degrades.",
    href: "/product/health-monitor",
  },
];

const differentiators = [
  {
    title: "Validation, not just building",
    description:
      "Most EA tools give you a builder and stop. AlgoStudio validates your strategy with Monte Carlo simulation, verifies performance with immutable records, and monitors health in production.",
  },
  {
    title: "Simplicity with depth",
    description:
      "Start with a working template. Export in minutes. When you're ready, unlock Monte Carlo, verified track records, and health monitoring. Power when you need it, simplicity by default.",
  },
  {
    title: "Proof over promises",
    description:
      "Your track record is tamper-resistant. Your health score is data-driven. Your strategy identity is permanent. Everything in AlgoStudio is designed to replace hope with evidence.",
  },
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
        <div className="max-w-5xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <section className="text-center mb-24">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              The complete strategy validation platform
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              Most trading tools stop at building. AlgoStudio goes further — validation,
              verification, and monitoring. Know if your strategy actually works before you risk
              capital.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?mode=register"
                className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
              >
                Start Validating — Free
              </Link>
              <Link
                href="/product/how-it-works"
                className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                See How It Works
              </Link>
            </div>
          </section>

          {/* Validation Pipeline */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">Validation Pipeline</h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Build &rarr; Verify &rarr; Monitor
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {pipelineSteps.map((step) => (
                <div
                  key={step.step}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono text-[#4F46E5] bg-[rgba(79,70,229,0.15)] px-2.5 py-1 rounded">
                      {step.step}
                    </span>
                    <span className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wide">
                      {step.label}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-[#94A3B8] mb-5 leading-relaxed">{step.description}</p>
                  <ul className="space-y-2">
                    {step.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Platform Modules */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">Platform Modules</h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Six integrated modules that take your strategy from idea to monitored deployment.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {platformModules.map((mod) => (
                <div
                  key={mod.title}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: mod.color }}
                    />
                    <h3 className="text-lg font-semibold text-white">{mod.title}</h3>
                  </div>
                  <p className="text-sm text-[#94A3B8] mb-5 leading-relaxed">{mod.description}</p>
                  <Link
                    href={mod.href}
                    className="text-sm font-medium text-[#A78BFA] hover:underline"
                  >
                    Learn more &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Why AlgoStudio */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">Why AlgoStudio</h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              A platform built around one idea: strategies should be validated with data, not hope.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {differentiators.map((item) => (
                <div
                  key={item.title}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <CTASection
        title="Start validating your strategy"
        description="Build, verify, and monitor your trading strategy with objective data. Free — no credit card required."
      />

      <Footer />
    </div>
  );
}
