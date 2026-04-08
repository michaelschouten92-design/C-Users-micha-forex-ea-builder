import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { AnimateOnScroll } from "@/components/marketing/animate-on-scroll";
import { SectionHeading } from "@/components/marketing/section-heading";
import { GlassCard } from "@/components/marketing/glass-card";
import { GridBackground } from "@/components/marketing/grid-background";
import { HealthScorePreview } from "@/components/marketing/health-score-preview";
import { SampleEvaluationDemo } from "./sample-evaluation-demo";

export const metadata: Metadata = {
  title: "MT5 Strategy Health Score — Free Backtest Evaluation | Algo Studio",
  description:
    "Upload your MT5 backtest for an instant health score, Monte Carlo simulation, and drift detection baseline. Free, no signup required.",
  alternates: { canonical: "/sample-evaluation" },
  openGraph: {
    title: "See What a Strategy Evaluation Looks Like — Algo Studio",
    description:
      "Health scoring, drift detection, Monte Carlo risk simulation — all from a single backtest upload. Try it free.",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Sample Evaluation", href: "/sample-evaluation" },
];

export default function SampleEvaluationPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#08080A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-0 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* ── HERO ── */}
          <GridBackground glow className="text-center mb-12 py-4">
            <h1 className="text-[28px] md:text-[42px] font-extrabold tracking-tight leading-[1.15] text-[#FAFAFA]">
              What does your strategy&apos;s
              <br />
              health score look like?
            </h1>
            <p className="mt-6 text-base text-[#A1A1AA] max-w-xl mx-auto leading-relaxed">
              Below is a real evaluation from Algo Studio — health scoring, drift detection, risk
              metrics, and verification status. All generated from a single backtest upload.
            </p>
          </GridBackground>

          {/* Sample data notice */}
          <div className="mb-8 mx-auto max-w-xl rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-[#F59E0B] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-[#F59E0B]">
                  Sample data — for demonstration only
                </p>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  This evaluation uses example data. Upload your own backtest below to see real
                  results.
                </p>
              </div>
            </div>
          </div>

          <SampleEvaluationDemo />
        </div>

        {/* ── UPLOAD YOUR OWN ── */}
        <section className="bg-[#0C0C10] py-20 -mx-6 px-6 mt-16">
          <div className="max-w-4xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading
                eyebrow="Try it yourself"
                description="Upload your MT5 Strategy Tester report and see top-level results immediately. Sign up free to unlock drift detection and verified track records."
              >
                Upload your backtest — get scored instantly
              </SectionHeading>
            </AnimateOnScroll>
            <div className="max-w-md mx-auto mt-10">
              <HealthScorePreview />
            </div>
          </div>
        </section>

        {/* ── WHAT YOU GET ── */}
        <section className="py-20 px-0">
          <div className="max-w-4xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading>What Algo Studio evaluates</SectionHeading>
            </AnimateOnScroll>

            <div className="grid md:grid-cols-2 gap-5 mt-12">
              {[
                {
                  title: "Strategy Health Score",
                  desc: "A composite 0-100% score comparing live performance against your backtest baseline. Five weighted metrics: return, drawdown, win rate, volatility, and trade frequency.",
                },
                {
                  title: "CUSUM Drift Detection",
                  desc: "Statistical monitoring for persistent shifts in strategy expectancy. Catches gradual degradation weeks before it shows as drawdown on your equity curve.",
                },
                {
                  title: "Verified Track Record",
                  desc: "Every trade recorded in a cryptographic hash chain. Tamper-evident, independently verifiable, and shareable with a public link.",
                },
                {
                  title: "Strategy Lifecycle",
                  desc: "Clear lifecycle states: RUN, PAUSE, STOP. Recommendations based on statistical evidence — so you always know where your strategy stands.",
                },
              ].map((item) => (
                <AnimateOnScroll key={item.title}>
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                  </GlassCard>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-[#0C0C10] py-20 -mx-6 px-6" aria-label="Get your evaluation">
          <div className="max-w-2xl mx-auto text-center">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[32px] font-bold text-[#FAFAFA] tracking-tight">
                Get your own evaluation in under 2 minutes
              </h2>
              <p className="mt-4 text-sm text-[#A1A1AA] leading-relaxed">
                Upload any MT5 backtest report. Free — no credit card required.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-sm btn-primary-cta"
                >
                  Evaluate your strategy free
                </Link>
                <Link
                  href="/how-it-works"
                  className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  How it works &rarr;
                </Link>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
