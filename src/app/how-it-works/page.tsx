import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { GridBackground } from "@/components/marketing/grid-background";
import { AnimateOnScroll } from "@/components/marketing/animate-on-scroll";
import { SectionHeading } from "@/components/marketing/section-heading";
import { GlassCard } from "@/components/marketing/glass-card";

export const metadata: Metadata = {
  title: "How MT5 EA Monitoring Works — Setup in 5 Minutes | Algo Studio",
  description:
    "Connect your MT5 terminal, upload a backtest baseline, and detect strategy drift automatically. Any broker, no code changes needed.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Algo Studio Works — MT5 EA Monitoring in 3 Steps",
    description:
      "Install the Monitor EA, upload your backtest, and get alerted when your strategy drifts from expected performance.",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "How It Works", href: "/how-it-works" },
];

export default function HowItWorksPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Monitor MT5 Expert Advisors with Algo Studio",
    description:
      "Connect your MT5 account, establish a performance baseline, and get real-time drift detection for your trading strategies.",
    totalTime: "PT5M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Install the Monitor EA",
        text: "Drop the lightweight Monitor EA onto any MT5 chart. It streams trade events and heartbeats without interfering with your strategies.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Strategies are discovered automatically",
        text: "As trades arrive, Algo Studio groups them by symbol and magic number into individual strategy instances.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Upload a backtest baseline",
        text: "Import your MT5 Strategy Tester report. This creates the performance reference that live trading is measured against.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Health monitoring begins",
        text: "Live performance is compared against the baseline after every trade. Health scores update continuously.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Drift detection activates",
        text: "CUSUM statistical monitoring detects persistent degradation before it shows on your equity curve.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Get alerted or auto-halt",
        text: "When drift is detected, you get a Telegram alert — or the strategy halts automatically based on your thresholds.",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <SiteNav />

      <main id="main-content" className="pt-24 pb-0 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* ── HERO ── */}
          <GridBackground glow className="text-center mb-16 md:mb-20 py-4">
            <h1 className="text-[28px] md:text-[42px] font-extrabold tracking-tight leading-[1.15]">
              How MT5 strategy monitoring works
            </h1>
            <p className="mt-6 text-base text-[#A1A1AA] max-w-xl mx-auto leading-relaxed">
              From installation to your first drift alert in under 5 minutes. No code changes. No
              broker API needed. Works with any MT5 broker.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-sm btn-primary-cta"
              >
                Start monitoring free
              </Link>
              <Link
                href="/sample-evaluation"
                className="px-7 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                See a live demo
              </Link>
            </div>
          </GridBackground>
        </div>

        {/* ── STEPS ── */}
        <div className="max-w-4xl mx-auto space-y-0">
          {/* STEP 1 */}
          <AnimateOnScroll>
            <section className="py-14 md:py-18 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-5 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#FAFAFA]">1</span>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] font-medium mb-1">2 minutes</p>
                  <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                    Install the Monitor EA on MetaTrader 5
                  </h2>
                  <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                    Drop the lightweight Monitor EA onto any MT5 chart. It runs alongside your
                    trading strategies without interfering — streaming trade events and heartbeats
                    to Algo Studio in real time.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-[3.75rem]">
                <GlassCard>
                  <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">Trade event capture</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Every open, close, and modification is captured. Works with any Expert Advisor —
                    scalpers, grid EAs, trend followers.
                  </p>
                </GlassCard>
                <GlassCard>
                  <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">Health heartbeats</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Periodic heartbeats confirm your terminal is online. You get alerted if your VPS
                    or terminal goes offline unexpectedly.
                  </p>
                </GlassCard>
              </div>
            </section>
          </AnimateOnScroll>

          {/* STEP 2 */}
          <AnimateOnScroll>
            <section className="py-14 md:py-18 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-5">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#FAFAFA]">2</span>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] font-medium mb-1">Automatic</p>
                  <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                    Strategies are discovered automatically
                  </h2>
                  <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                    As trades arrive, Algo Studio groups them by symbol and magic number. Each
                    unique combination becomes a strategy instance with its own identity, health
                    score, and lifecycle state. No manual configuration needed.
                  </p>
                </div>
              </div>
            </section>
          </AnimateOnScroll>

          {/* STEP 3 */}
          <AnimateOnScroll>
            <section className="py-14 md:py-18 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-5 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#FAFAFA]">3</span>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] font-medium mb-1">30 seconds</p>
                  <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                    Upload your backtest as baseline
                  </h2>
                  <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                    Import your MT5 Strategy Tester HTML report. Algo Studio extracts win rate,
                    drawdown, profit factor, and more — creating the performance benchmark that live
                    trading is measured against.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-[3.75rem]">
                <GlassCard>
                  <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">
                    Instant health scoring
                  </h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Your backtest gets a 0-100 health score across profit factor, drawdown, expected
                    payoff, Sharpe ratio, and recovery factor.
                  </p>
                </GlassCard>
                <GlassCard>
                  <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">
                    Monte Carlo simulation
                  </h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    1,000 randomized simulations reveal the full risk profile hiding behind a single
                    backtest — survival probability and realistic outcome ranges.
                  </p>
                </GlassCard>
              </div>
            </section>
          </AnimateOnScroll>

          {/* STEP 4 */}
          <AnimateOnScroll>
            <section className="py-14 md:py-18 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-5 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#FAFAFA]">4</span>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] font-medium mb-1">Continuous</p>
                  <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                    Live performance vs. backtest comparison
                  </h2>
                  <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                    After every closed trade, Algo Studio compares your live results against the
                    baseline. Five key metrics are tracked in real time.
                  </p>
                </div>
              </div>
              <div className="ml-0 md:ml-[3.75rem] flex flex-wrap gap-3">
                {["Return", "Volatility", "Drawdown", "Win rate", "Trade frequency"].map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-sm text-[#A1A1AA]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </section>
          </AnimateOnScroll>

          {/* STEP 5 */}
          <AnimateOnScroll>
            <section className="py-14 md:py-18 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-5 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#FAFAFA]">5</span>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] font-medium mb-1">Statistical</p>
                  <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                    CUSUM drift detection catches degradation early
                  </h2>
                  <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                    Unlike simple threshold alerts, CUSUM statistical monitoring accumulates small
                    deviations over time — catching gradual degradation weeks before it shows on
                    your equity curve. Fewer false alarms, earlier real warnings.
                  </p>
                </div>
              </div>
            </section>
          </AnimateOnScroll>

          {/* STEP 6 */}
          <AnimateOnScroll>
            <section className="py-14 md:py-18 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start gap-5 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#FAFAFA]">6</span>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] font-medium mb-1">Real-time</p>
                  <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                    Get alerted — or auto-halt degrading strategies
                  </h2>
                  <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                    When drift is detected, you get a Telegram or browser push notification. For
                    hands-off protection, enable auto-halt: Algo Studio pauses the strategy before
                    losses compound. Every intervention is logged in a tamper-evident audit trail.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-[3.75rem]">
                <GlassCard>
                  <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">
                    Lifecycle governance
                  </h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    RUN, PAUSE, or STOP — each strategy has a clear state. Recommendations are based
                    on statistical evidence, not guesswork.
                  </p>
                </GlassCard>
                <GlassCard>
                  <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">
                    Verified track record
                  </h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Every trade is recorded in a cryptographic hash chain. Share your verified
                    performance with a public link — independently auditable.
                  </p>
                </GlassCard>
              </div>
            </section>
          </AnimateOnScroll>
        </div>

        {/* ── LIFECYCLE SUMMARY ── */}
        <section className="bg-[#0C0C10] py-16 -mx-6 px-6 mt-8">
          <div className="max-w-4xl mx-auto">
            <AnimateOnScroll>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 md:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
                  {[
                    { label: "Install", color: "#A1A1AA" },
                    { label: "Discover", color: "#A1A1AA" },
                    { label: "Baseline", color: "#A1A1AA" },
                    { label: "Monitor", color: "#10B981" },
                    { label: "Detect", color: "#F59E0B" },
                    { label: "Act", color: "#EF4444" },
                  ].map((item, i, arr) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: item.color }}>
                        {item.label}
                      </span>
                      {i < arr.length - 1 && (
                        <svg
                          className="w-4 h-4 text-[#52525B] hidden sm:block"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#71717A] text-center mt-4">
                  The complete strategy monitoring lifecycle.
                </p>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-20 md:py-24" aria-label="Get started">
          <div className="max-w-2xl mx-auto text-center">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[32px] font-bold text-[#FAFAFA] tracking-tight">
                Start monitoring your MT5 strategies
              </h2>
              <p className="mt-4 text-sm text-[#A1A1AA] leading-relaxed">
                Free forever plan. All features included. No credit card required.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-sm btn-primary-cta"
                >
                  Monitor your first strategy free
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  Compare plans &rarr;
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
