import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";
import { HealthScorePreview } from "@/components/marketing/health-score-preview";
import { SampleEvaluationDemo } from "./sample-evaluation-demo";

export const metadata: Metadata = {
  title: "Sample Strategy Evaluation — See What You Get | AlgoStudio",
  description:
    "See a real strategy evaluation with health scoring, Monte Carlo validation, verified track record, and edge monitoring. This is what AlgoStudio shows you before you risk real capital.",
  alternates: { canonical: "/sample-evaluation" },
  openGraph: {
    title: "Sample Strategy Evaluation — AlgoStudio",
    description:
      "See a real strategy evaluation: health score, drift detection, risk metrics, and verified track record.",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Sample Evaluation", href: "/sample-evaluation" },
];

export default function SampleEvaluationPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)),
        }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              This is what a strategy evaluation looks like
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Below is a real evaluation from AlgoStudio. Health scoring, drift detection, risk
              metrics, verification status, and lifecycle tracking — all generated automatically
              from a single backtest upload.
            </p>
          </section>

          {/* Sample badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4F46E5]/10 border border-[#4F46E5]/20 text-sm text-[#A78BFA]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Sample data — this strategy is for demonstration only
            </span>
          </div>

          <SampleEvaluationDemo />

          {/* Progressive registration preview */}
          <section className="mt-16 mb-12">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Upload your backtest — see results instantly
            </h2>
            <p className="text-[#94A3B8] text-center max-w-xl mx-auto mb-8">
              When you upload a backtest, you see top-level results immediately. Sign up free to
              unlock the full breakdown, drift detection, and verified track record.
            </p>
            <div className="max-w-md mx-auto">
              <HealthScorePreview />
            </div>
          </section>

          {/* What you are seeing */}
          <section className="mt-16 mb-12">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              What you are seeing above
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-2">Strategy Health Score</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  A composite 0–100% score comparing live performance against backtest baseline.
                  Five weighted metrics — return, drawdown, win rate, volatility, and trade
                  frequency — each scored independently.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-2">Edge Drift Detection</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  CUSUM statistical test monitoring for persistent shifts in strategy expectancy.
                  When your edge starts to fade, AlgoStudio detects it before the drawdown hits your
                  account.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-2">Verified Track Record</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Every trade is recorded in a cryptographic hash chain. The chain cannot be edited
                  after the fact — L1 verification confirms integrity, L2 adds broker corroboration.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-2">Strategy Lifecycle</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Strategies progress through phases: New, Proving, Proven, Retired. Each phase has
                  clear criteria. You always know where your strategy stands.
                </p>
              </div>
            </div>
          </section>

          {/* How to get yours */}
          <section className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Get your own evaluation in under 2 minutes
            </h2>
            <p className="text-[#94A3B8] mb-6 max-w-xl mx-auto">
              Export your EA from AlgoStudio (or bring any MT5 backtest), upload the report, and get
              your Strategy Health Score instantly. Free — no credit card required.
            </p>
            <Link
              href="/login?mode=register&redirect=/app/evaluate"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Get Your Strategy Evaluated — Free
            </Link>
          </section>
        </div>
      </main>

      <CTASection
        title="Your strategy has a status"
        description="Upload a backtest and find out what it is. Health scoring, Monte Carlo validation, and verified track record — all from a single upload."
      />

      <Footer />
    </div>
  );
}
