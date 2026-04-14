import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { TrackedLink } from "@/components/marketing/tracked-link";
import { GridBackground } from "@/components/marketing/grid-background";
import { SocialProofBar } from "@/components/marketing/social-proof-bar";
import { AnimateOnScroll } from "@/components/marketing/animate-on-scroll";
import { SectionHeading } from "@/components/marketing/section-heading";
import { GlassCard } from "@/components/marketing/glass-card";

/* ── SEO: keyword-optimized metadata ── */
export const metadata: Metadata = {
  title: "MT5 Strategy Monitoring & Drift Detection | Algo Studio",
  description:
    "Monitor your MT5 Expert Advisors in real time. Detect strategy drift, compare live vs backtest, and auto-halt degrading EAs. Free plan available.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Algo Studio — MT5 Strategy Monitoring & Drift Detection",
    description:
      "Real-time EA monitoring for MetaTrader 5. Detect when your forex strategies start losing their edge — and act before it costs you.",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Algo Studio — MT5 Strategy Monitoring & Drift Detection",
    description:
      "Real-time EA monitoring for MetaTrader 5. Detect when your forex strategies start losing their edge.",
  },
};

/* ── SEO: JSON-LD structured data ── */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Algo Studio",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Real-time monitoring and drift detection for MetaTrader 5 Expert Advisors. Compare live EA performance against backtest baselines.",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      name: "Baseline (Free)",
      description: "1 monitored trading account, all features included",
    },
    {
      "@type": "Offer",
      price: "39",
      priceCurrency: "EUR",
      name: "Control",
      description: "Up to 3 monitored trading accounts",
    },
    {
      "@type": "Offer",
      price: "79",
      priceCurrency: "EUR",
      name: "Authority",
      description: "Up to 10 monitored trading accounts",
    },
  ],
  featureList: [
    "Real-time MT5 EA monitoring",
    "Statistical drift detection (CUSUM)",
    "Backtest vs live performance comparison",
    "Automatic strategy halt on degradation",
    "Verified track records with hash-chain integrity",
    "Telegram and push notifications",
  ],
};

/* ── SEO: FAQ schema for long-tail keywords ── */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does Algo Studio detect when my EA stops performing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Algo Studio uses CUSUM statistical monitoring to compare your live trading results against your backtest baseline after every trade. When win rate, drawdown, or profit factor drift beyond expected ranges, you get alerted immediately — or the strategy is halted automatically.",
      },
    },
    {
      "@type": "Question",
      name: "Does Algo Studio work with any MetaTrader 5 broker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Algo Studio works with any MT5 broker. You install a lightweight Monitor EA on your terminal — it doesn't interfere with your trading strategies and works alongside any Expert Advisor.",
      },
    },
    {
      "@type": "Question",
      name: "Is Algo Studio free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Algo Studio has a free forever plan (Baseline) that includes 1 monitored trading account with all features: drift detection, health scoring, alerts, and verified track records. No credit card required.",
      },
    },
  ],
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <SiteNav />

      <main id="main-content">
        {/* ═══════════════════════════════════════════════════════
            1. HERO — Primary conversion point
            Target keywords: MT5 strategy monitoring, EA monitoring
            ═══════════════════════════════════════════════════════ */}
        <GridBackground
          glow
          className="pt-28 md:pt-40 pb-8 md:pb-16 px-6 bg-gradient-to-b from-[#0C0C14] via-[#09090B] to-[#08080A]"
        >
          <div className="max-w-4xl mx-auto text-center">
            {/* Eyebrow — keyword + credibility */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs text-[#A1A1AA] font-medium">
                Real-time monitoring for MetaTrader 5
              </span>
            </div>

            {/* H1 — Emotionally compelling + keyword-rich */}
            <h1 className="text-[28px] md:text-[48px] font-extrabold tracking-tight leading-[1.1] text-[#FAFAFA]">
              Know when your trading strategy
              <br />
              starts losing its edge.
            </h1>

            {/* Sub-copy — Specific outcome, not abstract */}
            <p className="mt-6 text-base md:text-lg text-[#A1A1AA] max-w-xl mx-auto leading-relaxed">
              Algo Studio monitors your MT5 Expert Advisors 24/7, compares live performance against
              your backtests, and alerts you the moment drift begins — before small deviations
              become real losses.
            </p>

            {/* CTAs — Primary: action-oriented, Secondary: lower commitment */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <TrackedLink
                href="/register"
                location="homepage_hero"
                className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-sm btn-primary-cta"
              >
                Monitor your first strategy free
              </TrackedLink>
              <TrackedLink
                href="/sample-evaluation"
                location="homepage_hero_secondary"
                className="px-7 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                See a live demo
              </TrackedLink>
            </div>

            {/* Trust line — Objection removal */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-2 text-sm text-[#71717A]">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#10B981]" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Free forever plan
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#10B981]" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Works with any MT5 broker
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#10B981]" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Setup in under 5 minutes
              </span>
            </div>
          </div>
        </GridBackground>

        {/* ═══════════════════════════════════════════════════════
            1b. PRODUCT VISUAL — Command Center
            Shows the product = builds understanding + desire
            ═══════════════════════════════════════════════════════ */}
        <section className="pb-12 md:pb-20 px-6">
          <AnimateOnScroll className="max-w-[56rem] mx-auto">
            <div className="relative">
              <div
                className="absolute -inset-16 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.14)_0%,transparent_55%)] pointer-events-none"
                aria-hidden="true"
              />

              <div className="border-gradient relative">
                <div className="rounded-[13px] bg-[#0D0D12] overflow-hidden">
                  {/* Title bar */}
                  <div className="px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-3">
                        <span className="text-base font-bold text-[#F1F5F9]">Command Center</span>
                        <span className="text-xs text-[#71717A] font-medium tabular-nums">
                          9 strategies monitored
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-50" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
                        </span>
                        <span className="text-[10px] text-[#71717A] font-medium">Live</span>
                      </div>
                    </div>
                  </div>

                  {/* System State Board */}
                  <div className="px-6 py-5">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#71717A] font-medium mb-3">
                      System State
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Execution", value: "RUNNING", color: "#10B981", bar: true },
                        { label: "Online", value: "9/9", color: "#FAFAFA", bar: false },
                        { label: "Halted", value: "1", color: "#F59E0B", bar: true },
                        { label: "Edge Drift", value: "1", color: "#EF4444", bar: true },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] px-4 py-3.5 relative overflow-hidden"
                        >
                          {s.bar && (
                            <div
                              className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
                              style={{ backgroundColor: s.color }}
                            />
                          )}
                          <p className="text-[9px] uppercase tracking-[0.15em] text-[#71717A] mb-2">
                            {s.label}
                          </p>
                          <p
                            className="text-lg font-bold font-mono tabular-nums leading-none"
                            style={{ color: s.color }}
                          >
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alert strip */}
                  <div className="mx-6 mb-5 rounded-lg px-4 py-3 border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <svg
                          className="w-3.5 h-3.5 text-[#F59E0B] shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-[10px] uppercase tracking-[0.1em] text-[#EF4444] font-bold">
                          Edge Drift
                        </span>
                        <span className="text-xs text-[#A1A1AA] font-medium hidden sm:inline">
                          EURUSD Grid Strategy
                        </span>
                      </div>
                      <span className="text-[10px] text-[#71717A] hidden sm:block">
                        Investigate &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </section>

        {/* ═══════════════════════════════════════════════════════
            1c. SOCIAL PROOF — Credibility signals
            ═══════════════════════════════════════════════════════ */}
        <section className="pb-16 md:pb-24 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="border-t border-b border-[rgba(255,255,255,0.06)] py-2">
              <SocialProofBar />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            2. PROBLEM — Why you need this (pain amplification)
            Target keywords: strategy drift, EA performance degradation
            ═══════════════════════════════════════════════════════ */}
        <section
          className="py-20 md:py-28 px-6 bg-[#0C0C10]"
          aria-label="Why strategies fail silently"
        >
          <div className="max-w-4xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading
                eyebrow="The problem"
                description="Most algo traders only check their EA when equity drops. By then, the strategy has been degrading for weeks. Win rate eroded. Drawdowns deepening. The backtest edge — gone."
              >
                Your EA doesn&apos;t tell you when it stops working
              </SectionHeading>
            </AnimateOnScroll>

            <div className="mt-16 space-y-12 md:space-y-16">
              {/* Item 1 */}
              <AnimateOnScroll direction="left">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#EF4444]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898M2.25 6l3 3m0 0l3-3m-3 3V3"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">
                      Strategy drift happens silently
                    </h3>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-lg">
                      Market regimes shift. Spreads widen. Liquidity patterns change. The
                      statistical edge you validated in backtesting quietly erodes in live
                      conditions — and MetaTrader gives you zero warning.
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>

              {/* Item 2 */}
              <AnimateOnScroll direction="right">
                <div className="flex flex-col md:flex-row-reverse items-start gap-6 md:gap-10">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#F59E0B]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div className="md:text-right">
                    <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">
                      Losses compound fast
                    </h3>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-lg md:ml-auto">
                      A 2% deviation per week becomes a 15% drawdown in two months. By the time you
                      check your account, the damage from a degrading EA is already done. Early
                      detection is everything.
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>

              {/* Item 3 */}
              <AnimateOnScroll direction="left">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#6366F1]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">
                      Backtests don&apos;t monitor themselves
                    </h3>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-lg">
                      You ran a beautiful backtest. Great results. But a backtest is a snapshot —
                      not a living benchmark. Without continuous comparison between live and
                      expected performance, you&apos;re trading blind.
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            3. HOW IT WORKS — Lower the barrier
            Target keywords: MT5 EA monitoring setup, connect expert advisor
            ═══════════════════════════════════════════════════════ */}
        <section
          className="py-20 md:py-28 px-6 section-glow bg-[#08080A]"
          aria-label="How Algo Studio works"
        >
          <div className="max-w-4xl mx-auto relative z-10">
            <AnimateOnScroll>
              <SectionHeading
                eyebrow="How it works"
                description="No code changes to your EAs. No broker API needed. Works with any MT5 broker."
              >
                Start monitoring in under 5 minutes
              </SectionHeading>
            </AnimateOnScroll>

            <div className="mt-16 relative">
              {/* Connecting line */}
              <div
                className="hidden md:block absolute top-[2.75rem] left-[2.25rem] right-[2.25rem] h-px bg-gradient-to-r from-[rgba(255,255,255,0.06)] via-[rgba(255,255,255,0.12)] to-[rgba(255,255,255,0.06)]"
                aria-hidden="true"
              />

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: "1",
                    title: "Install the Monitor EA",
                    desc: "Drop a lightweight EA onto any MT5 chart. It runs alongside your strategies without interfering — streaming trade events and health data to Algo Studio.",
                    time: "2 minutes",
                  },
                  {
                    step: "2",
                    title: "Upload your backtest baseline",
                    desc: "Import your Strategy Tester HTML report. Algo Studio extracts win rate, drawdown, profit factor — and uses it as the benchmark for live performance.",
                    time: "30 seconds",
                  },
                  {
                    step: "3",
                    title: "Get alerted on drift",
                    desc: "Every closed trade is compared against your baseline. When performance drifts beyond acceptable ranges, you get a Telegram alert or the strategy halts automatically.",
                    time: "Continuous",
                  },
                ].map((item, i) => (
                  <AnimateOnScroll key={item.step} delay={(i + 1) as 1 | 2 | 3}>
                    <div className="text-center">
                      <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] mb-5">
                        <span className="text-lg font-bold text-[#FAFAFA]">{item.step}</span>
                      </div>
                      <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{item.title}</h3>
                      <p className="text-sm text-[#A1A1AA] leading-relaxed mb-3">{item.desc}</p>
                      <span className="text-xs text-[#71717A] font-medium">{item.time}</span>
                    </div>
                  </AnimateOnScroll>
                ))}
              </div>
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/how-it-works"
                className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
              >
                Read the full walkthrough &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            4. DRIFT DETECTION — Core feature sell
            Target keywords: strategy drift detection, CUSUM EA monitoring
            ═══════════════════════════════════════════════════════ */}
        <section className="py-20 md:py-28 px-6 bg-[#0C0C10]" aria-label="Strategy drift detection">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
              <AnimateOnScroll direction="left">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#A1A1AA] mb-4">
                    Drift detection
                  </p>
                  <h2 className="text-2xl md:text-[32px] font-bold text-[#FAFAFA] tracking-tight leading-tight mb-5">
                    Catch performance degradation
                    <br className="hidden md:block" />
                    weeks before your equity shows it
                  </h2>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed mb-8">
                    Algo Studio uses CUSUM statistical monitoring — the same method used in
                    industrial quality control — to detect persistent deviations in your EA&apos;s
                    performance. It catches drift that&apos;s invisible on your equity curve.
                  </p>
                  <div className="space-y-4">
                    {[
                      {
                        color: "#10B981",
                        label: "Healthy",
                        desc: "Live performance matches backtest expectations.",
                      },
                      {
                        color: "#F59E0B",
                        label: "Warning",
                        desc: "Sustained statistical deviation detected.",
                      },
                      {
                        color: "#EF4444",
                        label: "Edge at Risk",
                        desc: "Significant degradation. Auto-halt available.",
                      },
                    ].map((s) => (
                      <div key={s.label} className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <div>
                          <span className="text-sm font-semibold" style={{ color: s.color }}>
                            {s.label}
                          </span>
                          <span className="text-sm text-[#71717A] ml-2">{s.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimateOnScroll>

              {/* Alert Panel Visual */}
              <AnimateOnScroll direction="right">
                <GlassCard gradientBorder padding="p-0">
                  <div className="px-5 pt-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#71717A] font-bold">
                        Alerts
                      </span>
                      <span className="text-xs font-bold text-[#F59E0B] tabular-nums">4</span>
                    </div>
                  </div>

                  <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {[
                      {
                        severity: "critical",
                        title: "Edge drift detected",
                        pair: "EURUSD Grid Strategy",
                        time: "30s ago",
                        detail: "Win rate 7.1% vs 12.4% baseline",
                      },
                      {
                        severity: "warning",
                        title: "Baseline deviation",
                        pair: "USDJPY Scalper",
                        time: "5m ago",
                        detail: "Recovery time 4.2x slower",
                      },
                      {
                        severity: "critical",
                        title: "Drawdown threshold breached",
                        pair: "GBPUSD Momentum",
                        time: "18m ago",
                        detail: "Max DD 8.3% vs 5% limit",
                      },
                    ].map((alert, i) => (
                      <div key={i} className="px-5 py-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${alert.severity === "critical" ? "bg-[#EF4444]" : "bg-[#F59E0B]"}`}
                          />
                          <span
                            className={`text-[13px] font-semibold ${alert.severity === "critical" ? "text-[#EF4444]" : "text-[#F59E0B]"}`}
                          >
                            {alert.title}
                          </span>
                          <span className="text-[10px] text-[#52525B] ml-auto">{alert.time}</span>
                        </div>
                        <p className="text-xs text-[#71717A]">
                          {alert.pair}{" "}
                          <span className="text-[#52525B]">&middot; {alert.detail}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="m-4 rounded-lg border border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.04)] px-4 py-3 text-center">
                    <span className="text-[11px] font-semibold text-[#F59E0B]">
                      Strategy auto-halted by Algo Studio
                    </span>
                  </div>
                </GlassCard>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            5. GOVERNANCE — Differentiator
            Target keywords: automatic EA halt, strategy governance
            ═══════════════════════════════════════════════════════ */}
        <section
          className="py-20 md:py-28 px-6 section-glow bg-[#08080A]"
          aria-label="Automatic strategy governance"
        >
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
              {/* Account Health Visual */}
              <AnimateOnScroll direction="left" className="order-2 md:order-1">
                <GlassCard gradientBorder padding="p-0">
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <span className="text-sm font-bold text-[#F1F5F9]">Online</span>
                      <span className="text-sm text-[#71717A]">Live account</span>
                    </div>
                    <p className="text-xs text-[#52525B]">IC Markets (EU) Ltd &middot; #52780353</p>
                  </div>

                  <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Balance", value: "$100,131" },
                      { label: "Equity", value: "$99,847" },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] px-3.5 py-3"
                      >
                        <p className="text-[9px] uppercase tracking-[0.15em] text-[#71717A] mb-1.5">
                          {m.label}
                        </p>
                        <p className="text-lg font-bold font-mono tabular-nums text-[#FAFAFA]">
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mx-5 mb-5">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#71717A] font-medium mb-2.5">
                      Strategy Health
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Halted", color: "#EF4444", count: "1" },
                        { label: "Attention", color: "#F59E0B", count: "2" },
                        { label: "Healthy", color: "#10B981", count: "6" },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-lg border px-3 py-2.5 text-center"
                          style={{ borderColor: `${s.color}15`, backgroundColor: `${s.color}06` }}
                        >
                          <p
                            className="text-lg font-bold font-mono tabular-nums leading-none mb-1"
                            style={{ color: s.color }}
                          >
                            {s.count}
                          </p>
                          <p
                            className="text-[9px] uppercase tracking-wider"
                            style={{ color: `${s.color}80` }}
                          >
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </AnimateOnScroll>

              {/* Copy */}
              <AnimateOnScroll direction="right" className="order-1 md:order-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#A1A1AA] mb-4">
                  Strategy governance
                </p>
                <h2 className="text-2xl md:text-[32px] font-bold text-[#FAFAFA] tracking-tight leading-tight mb-5">
                  Don&apos;t just detect problems.
                  <br className="hidden md:block" />
                  Automatically stop them.
                </h2>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mb-8">
                  When your EA&apos;s performance degrades beyond acceptable thresholds, Algo Studio
                  can automatically pause trading — preventing further damage while you investigate.
                </p>
                <div className="space-y-5">
                  {[
                    {
                      title: "Automatic halt on drift",
                      desc: "Set your thresholds. Algo Studio enforces them 24/7.",
                    },
                    {
                      title: "Full investigation context",
                      desc: "See exactly which metrics triggered the halt: win rate, drawdown, recovery time.",
                    },
                    {
                      title: "Health dashboard",
                      desc: "All your strategies in one view. Halted, Attention, Healthy — at a glance.",
                    },
                    {
                      title: "Verified audit trail",
                      desc: "Every trade and intervention is logged in a tamper-evident hash chain.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <svg
                        className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <h3 className="text-sm font-semibold text-[#FAFAFA]">{item.title}</h3>
                        <p className="text-sm text-[#71717A] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            6. VERIFIED TRACK RECORD — Trust builder
            Target keywords: verified EA track record, forex strategy verification
            ═══════════════════════════════════════════════════════ */}
        <section className="py-20 md:py-28 px-6 bg-[#0C0C10]" aria-label="Verified track records">
          <div className="max-w-3xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading
                eyebrow="Verified performance"
                description="Every metric is derived from live trading data — not simulated results. Cryptographically verified, independently auditable, and shareable with a link."
              >
                Prove your strategy works with real data
              </SectionHeading>
            </AnimateOnScroll>

            <AnimateOnScroll className="mt-10">
              <GlassCard gradientBorder>
                <div className="flex flex-wrap items-center gap-3 mb-5 text-xs text-[#71717A]">
                  <span className="text-sm font-semibold text-white">IC Markets Live</span>
                  <span>IC Markets (EU) Ltd</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { label: "Trades", value: "1,247" },
                    { label: "Return", value: "+18.4%", color: "#10B981" },
                    { label: "Max Drawdown", value: "6.2%" },
                    { label: "Strategies", value: "5" },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-[9px] uppercase tracking-wider text-[#71717A] mb-1">
                        {m.label}
                      </p>
                      <p
                        className="text-base font-semibold"
                        style={{ color: m.color ?? "#FAFAFA" }}
                      >
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 text-[#10B981]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs font-medium text-[#71717A]">
                    Cryptographically verified &middot; Hash-chain integrity
                  </span>
                </div>
              </GlassCard>
            </AnimateOnScroll>

            <div className="mt-8 text-center">
              <Link
                href="/about"
                className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
              >
                Learn how we verify track records &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            7. WHO IS THIS FOR — Qualification + identification
            ═══════════════════════════════════════════════════════ */}
        <section className="py-20 md:py-28 px-6 bg-[#08080A]" aria-label="Who uses Algo Studio">
          <div className="max-w-4xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading eyebrow="Built for">
                Algo traders who take their edge seriously
              </SectionHeading>
            </AnimateOnScroll>

            <div className="mt-14 grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Running EAs on MT5",
                  desc: "You have one or more Expert Advisors running on MetaTrader 5 — scalpers, grid strategies, trend followers, or anything in between.",
                },
                {
                  title: "Backtested but uncertain",
                  desc: "Your backtest looked great. But you don't know if live results are actually matching expectations — or silently diverging.",
                },
                {
                  title: "Managing multiple strategies",
                  desc: "You monitor several EAs across different symbols and accounts, and need one place to see what's healthy and what's not.",
                },
                {
                  title: "Trading on a VPS",
                  desc: "Your strategies run unattended 24/7. You need automated monitoring and alerts — not manual equity curve checking.",
                },
              ].map((item) => (
                <AnimateOnScroll key={item.title}>
                  <div className="flex items-start gap-4 py-4">
                    <svg
                      className="w-5 h-5 text-[#10B981] mt-0.5 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">{item.title}</h3>
                      <p className="text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            7.5. Trading Guides — Internal linking to SEO clusters
            ═══════════════════════════════════════════════════════ */}
        <section className="py-20 md:py-28 px-6 bg-[#08080A]" aria-label="Trading guides">
          <div className="max-w-5xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading eyebrow="Resources">Trading guides</SectionHeading>
            </AnimateOnScroll>

            <div className="mt-14 grid md:grid-cols-3 gap-5">
              {[
                {
                  title: "EA Drift Detection",
                  desc: "How CUSUM statistical monitoring catches Expert Advisor degradation weeks before your equity curve shows it.",
                  href: "/features/drift-detection",
                  cta: "Read the guide",
                },
                {
                  title: "Prop Firm EA Rules",
                  desc: "FTMO, E8 Markets, FundedNext, The Funded Trader — drawdown limits, profit targets, and EA policies compared honestly.",
                  href: "/prop-firms",
                  cta: "Compare firms",
                },
                {
                  title: "Alternatives & Comparisons",
                  desc: "Algo Studio vs MyFxBook, FxBlue, Tradervue, Edgewonk. Honest feature matrix including where each tool wins.",
                  href: "/alternatives",
                  cta: "See comparisons",
                },
              ].map((item) => (
                <AnimateOnScroll key={item.href}>
                  <Link
                    href={item.href}
                    className="group block h-full p-6 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] hover:border-[rgba(99,102,241,0.4)] transition-colors"
                  >
                    <h3 className="text-base font-semibold text-[#FAFAFA] mb-2 group-hover:text-[#818CF8] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">{item.desc}</p>
                    <span className="text-xs font-medium text-[#6366F1] group-hover:text-[#818CF8] transition-colors">
                      {item.cta} →
                    </span>
                  </Link>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            8. FAQ — Long-tail SEO + objection handling
            ═══════════════════════════════════════════════════════ */}
        <section
          className="py-20 md:py-28 px-6 bg-[#0C0C10]"
          aria-label="Frequently asked questions"
        >
          <div className="max-w-3xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading eyebrow="FAQ">Common questions</SectionHeading>
            </AnimateOnScroll>

            <div className="mt-12 space-y-3">
              {[
                {
                  q: "How does Algo Studio detect when my EA stops performing?",
                  a: "Algo Studio uses CUSUM statistical monitoring to compare your live results against your backtest baseline after every closed trade. When metrics like win rate, drawdown, or profit factor drift beyond expected ranges, you get alerted via Telegram or browser push — or the strategy halts automatically.",
                },
                {
                  q: "Does it work with any MetaTrader 5 broker?",
                  a: "Yes. Algo Studio works with any MT5 broker — IC Markets, Pepperstone, FTMO, or any other. You install a lightweight Monitor EA on your terminal that runs alongside your existing strategies without interfering.",
                },
                {
                  q: "Will it slow down or affect my trading strategies?",
                  a: "No. The Monitor EA is read-only. It observes trade events and account data but never places, modifies, or closes trades. Your strategies run exactly as before.",
                },
                {
                  q: "What if I don't have a backtest yet?",
                  a: "You can still connect and start monitoring. Algo Studio will track your live performance, detect anomalies, and build your verified track record. Uploading a backtest baseline unlocks drift detection and health scoring.",
                },
                {
                  q: "Is my trading data secure?",
                  a: "Yes. Algo Studio never has access to your broker credentials. The Monitor EA connects over HTTPS with an encrypted API key. Your trade data is stored encrypted and never shared with third parties.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                >
                  <summary className="px-5 py-4 cursor-pointer flex items-center justify-between text-sm font-medium text-[#FAFAFA] hover:text-white">
                    <h3 className="pr-4">{item.q}</h3>
                    <svg
                      className="w-4 h-4 text-[#71717A] shrink-0 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-[#A1A1AA] leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/faq"
                className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
              >
                See all frequently asked questions &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            9. FINAL CTA — Close the deal
            ═══════════════════════════════════════════════════════ */}
        <section
          className="py-24 md:py-32 px-6 bg-gradient-to-b from-[#08080A] via-[#0A0A12] to-[#08080A] section-glow"
          aria-label="Get started with Algo Studio"
        >
          <div className="max-w-2xl mx-auto text-center relative z-10">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[36px] font-bold text-[#FAFAFA] tracking-tight leading-tight">
                Stop trading blind.
                <br />
                Start monitoring your edge.
              </h2>
              <p className="mt-5 text-base md:text-lg text-[#A1A1AA] leading-relaxed">
                Join algo traders who know exactly when their strategies perform — and when they
                don&apos;t.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-sm btn-primary-cta"
                >
                  Monitor your first strategy free
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
                >
                  Compare plans
                </Link>
              </div>
              <p className="mt-6 text-sm text-[#71717A]">
                Free forever plan &middot; All features included &middot; No credit card required
              </p>
            </AnimateOnScroll>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
