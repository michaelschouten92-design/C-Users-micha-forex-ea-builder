import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Platform — EA Builder & Strategy Intelligence | AlgoStudio",
  description:
    "Build Expert Advisors and validate them with data. No-code EA builder, instant health scores, AI analysis, Monte Carlo validation, verified track records, and live monitoring.",
  alternates: { canonical: "/product" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
];

const pipelineSteps = [
  {
    step: "01",
    label: "Upload",
    title: "Backtest Analysis",
    description:
      "Upload your MT5 Strategy Tester HTML report. AlgoStudio parses every metric and trade, scores your strategy 0-100, and identifies strengths and weaknesses instantly.",
    features: [
      "Instant health score (0-100)",
      "7-dimension scoring",
      "Multi-language reports (EN, DE, ES, RU, FR, PT)",
    ],
  },
  {
    step: "02",
    label: "Validate",
    title: "Strategy Validation",
    description:
      "AI Strategy Doctor analyzes weaknesses and overfitting signals. One-click Monte Carlo runs 1,000 simulations to stress-test your edge before going live.",
    features: [
      "AI-powered weakness analysis",
      "Monte Carlo survival probability",
      "Overfitting & market dependency detection",
    ],
  },
  {
    step: "03",
    label: "Monitor",
    title: "Performance Protection",
    description:
      "Deploy with a verified identity and multi-level verification. Monitor live performance against your baseline. Share proof bundles for independent audit.",
    features: [
      "Verified Track Record",
      "Strategy Health Monitor",
      "Edge degradation alerts",
      "Proof bundles & sharing",
    ],
  },
];

const platformModules = [
  {
    color: "#22D3EE",
    title: "Backtest Health Check",
    description:
      "Upload your MT5 HTML report. Get an instant 0-100 health score across 7 weighted dimensions: profit factor, drawdown, trade count, expected payoff, win rate, Sharpe, and recovery factor.",
    href: "/app/backtest",
  },
  {
    color: "#A78BFA",
    title: "AI Strategy Doctor",
    description:
      "AI-powered analysis of your full trade history. Identifies weaknesses, overfitting signals, market dependency risks, and live trading readiness with actionable recommendations.",
    href: "/app/backtest",
  },
  {
    color: "#F59E0B",
    title: "Monte Carlo Risk Calculator",
    description:
      "Run 1,000 randomized simulations. See survival probability and the realistic range of outcomes — not just the best case, but what to actually expect in live trading.",
    href: "/product/monte-carlo",
  },
  {
    color: "#10B981",
    title: "Verified Track Record",
    description:
      "Built into every EA. Multi-level verification (L1 hash chain, L2 broker corroboration, L3 notarization), risk-adjusted metrics (Sharpe, Sortino, Calmar), and shareable proof bundles anyone can independently verify.",
    href: "/product/track-record",
  },
  {
    color: "#EF4444",
    title: "Health Monitor",
    description:
      "Continuously compares live performance against your baseline. 5 metrics tracked. Alerts when returns drift, drawdowns exceed norms, or edge degrades.",
    href: "/product/health-monitor",
  },
  {
    color: "#EC4899",
    title: "EA Builder",
    description:
      "No-code visual EA builder with 6 proven templates. Customize risk, stops, and entries. Export clean MQL5 source code that you own. From idea to working Expert Advisor in minutes.",
    href: "/product/how-it-works",
  },
];

const differentiators = [
  {
    title: "Build and validate in one place",
    description:
      "Most EA tools give you a builder and stop. AlgoStudio goes further — it scores your backtest, analyzes weaknesses with AI, validates with Monte Carlo, and monitors health in production.",
  },
  {
    title: "Upload and know in seconds",
    description:
      "No complex setup. No manual data entry. Upload your MT5 report and get instant results — health score, AI analysis, and validation. Power when you need it, simplicity by default.",
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
              Strategy intelligence from first backtest to proven edge.
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              Upload a backtest. Get an instant health score and AI analysis. Validate with Monte
              Carlo. Monitor live performance with verified track records — one platform, from
              evaluation to proof.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?mode=register&redirect=/app/backtest"
                className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
              >
                Start Your First Evaluation — Free
              </Link>
              <Link
                href="/sample-evaluation"
                className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                See a Sample Evaluation
              </Link>
            </div>
          </section>

          {/* Validation Pipeline */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Strategy Intelligence Pipeline
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Upload &rarr; Evaluate &rarr; Verify &rarr; Monitor
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
              Six integrated modules that take your strategy from backtest to monitored deployment.
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
        title="Start your strategy evaluation"
        description="Upload a backtest and get your Strategy Health Score in under 2 minutes. AI analysis, Monte Carlo validation, and verified track records included. Free — no credit card required."
      />

      <Footer />
    </div>
  );
}
