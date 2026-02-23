import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata: Metadata = {
  title: "AlgoStudio — EA Builder & Strategy Intelligence for Algorithmic Traders",
  description:
    "Build MT5 Expert Advisors and instantly know if they work. No-code EA builder with health scoring, AI analysis, Monte Carlo validation, and live monitoring — all in one platform.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — Build EAs & Know If They Actually Work",
    description:
      "No-code EA builder with instant backtest health scoring, AI-powered analysis, and one-click Monte Carlo validation. Build, validate, and monitor your trading strategies.",
  },
};

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AlgoStudio",
    description:
      "No-code EA builder and strategy intelligence platform for algorithmic traders. Build Expert Advisors, upload backtests, get health scores, AI analysis, and live monitoring.",
    url: "https://algo-studio.com",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "79",
      priceCurrency: "EUR",
      offerCount: 3,
    },
    featureList: [
      "MT5 backtest upload and health scoring",
      "AI Strategy Doctor analysis",
      "One-click Monte Carlo validation",
      "Verified Track Record with immutable hash chain",
      "Strategy Health Monitor",
      "Live EA monitoring dashboard",
      "No-code strategy builder for MT5",
    ],
  };

  const faqItems = [
    {
      q: "How does the backtest health score work?",
      a: "Upload your MT5 Strategy Tester HTML report. AlgoStudio parses all metrics and trades, then scores your strategy 0-100 across 7 weighted dimensions: profit factor, max drawdown, trade count, expected payoff, win rate, Sharpe ratio, and recovery factor. Scores above 80 are ROBUST, 60-79 are MODERATE, below 60 are WEAK.",
    },
    {
      q: "What file format do I need to upload?",
      a: "AlgoStudio accepts the standard MT5 Strategy Tester HTML report. In MetaTrader 5, run your backtest in the Strategy Tester, then right-click the results tab and select 'Report' to save as HTML. Upload that file directly — we support English, German, Spanish, Russian, French, and Portuguese report formats.",
    },
    {
      q: "What is the AI Strategy Doctor?",
      a: "After uploading your backtest, the AI Strategy Doctor analyzes your full trade history and metrics to identify weaknesses, overfitting signals, market dependency risks, and live trading readiness. It provides actionable recommendations in plain language — like having a senior quant review your strategy.",
    },
    {
      q: "What is a Verified Track Record?",
      a: "Every trade your EA makes is automatically recorded in a cryptographic hash chain with multi-level verification: L1 (ledger integrity via hash chain replay), L2 (broker corroboration by cross-referencing broker data), and L3 (external notarization). Risk-adjusted metrics like Sharpe, Sortino, and Calmar ratios are computed automatically. You can share proof bundles that anyone can independently verify — no manipulation, no cherry-picking.",
    },
    {
      q: "Do I need coding experience?",
      a: "No. Upload your backtest report and get instant analysis — no coding required. If you want to build new strategies, AlgoStudio also includes a no-code visual builder with 6 proven templates. Pick a template, adjust settings, and export a ready-to-use .mq5 file.",
    },
    {
      q: "Does this work with any MT5 broker?",
      a: "Yes. The backtest upload works with any MT5 Strategy Tester report regardless of broker. If you build strategies with our builder, you get standard MQL5 source code that works with any MetaTrader 5 broker — compatible with prop firms like FTMO, E8 Markets, and FundingPips.",
    },
    {
      q: "Does AlgoStudio guarantee profits?",
      a: "No. AlgoStudio is a strategy intelligence platform — it helps you determine whether a strategy has a measurable edge. No tool, strategy, or system can guarantee trading profits. Always validate thoroughly before deploying with real capital.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div id="main-content" className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <SiteNav />

      {/* ================================================================ */}
      {/* HERO — Upload-first positioning                                  */}
      {/* ================================================================ */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">
              EA Builder &amp; Strategy Intelligence
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Stop guessing if your
            <br />
            trading strategy <span className="text-[#A78BFA]">works</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
            Build your Expert Advisor with our no-code EA builder, then instantly validate if your
            strategy is robust, tradable, and ready for live markets. Health scoring, AI analysis,
            and Monte Carlo validation — in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10 text-sm text-[#CBD5E1]">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Instant health score
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              AI-powered analysis
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Monte Carlo validated
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=register&redirect=/app/backtest"
              className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Upload Backtest — Free
            </Link>
            <Link
              href="/product"
              className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
            >
              See the Platform
            </Link>
          </div>

          <p className="mt-6 text-xs text-[#64748B]">
            No credit card required. Upload your first backtest in under a minute.
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* WORKFLOW — Run → Upload → Know → Monitor                         */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              From backtest to validated strategy in four steps
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Most traders build strategies. Professionals validate them.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Run MT5 Backtest",
                description:
                  "Test your strategy in MT5 Strategy Tester. Save the report as HTML — that's your starting point.",
                accent: "#A78BFA",
              },
              {
                step: "2",
                title: "Upload Report",
                description:
                  "Drag & drop your HTML report. AlgoStudio parses every metric and trade in seconds.",
                accent: "#22D3EE",
              },
              {
                step: "3",
                title: "Know If It Works",
                description:
                  "Get a 0-100 health score, AI analysis of weaknesses, and one-click Monte Carlo validation.",
                accent: "#10B981",
              },
              {
                step: "4",
                title: "Monitor & Prove",
                description:
                  "Go live with confidence. Track performance, detect edge degradation, and build a verified track record.",
                accent: "#F59E0B",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 h-full">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                    style={{
                      backgroundColor: `${item.accent}20`,
                      borderWidth: 1,
                      borderColor: `${item.accent}30`,
                    }}
                  >
                    <span className="text-sm font-bold" style={{ color: item.accent }}>
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 text-center text-[#4F46E5]">
                    <svg
                      className="w-5 h-5 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HEALTH SCORE SHOWCASE — What you get when you upload              */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs text-[#22D3EE] font-medium tracking-wider uppercase mb-3">
                Instant Results
              </p>
              <h2 className="text-3xl font-bold text-white mb-4">Upload once. Know everything.</h2>
              <p className="text-[#94A3B8] leading-relaxed mb-6">
                Your MT5 report contains hundreds of data points. AlgoStudio extracts them all,
                scores your strategy across 7 dimensions, and tells you exactly where it&apos;s
                strong and where it&apos;s weak — in seconds.
              </p>
              <ul className="space-y-3">
                {[
                  "0-100 health score with ROBUST / MODERATE / WEAK rating",
                  "Per-metric breakdown: PF, drawdown, win rate, Sharpe, and more",
                  "AI Strategy Doctor: weaknesses, overfitting signals, recommendations",
                  "One-click Monte Carlo: survival probability before going live",
                  "Multi-language support: EN, DE, ES, RU, FR, PT reports",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#CBD5E1]">
                    <svg
                      className="w-4 h-4 text-[#A78BFA] flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/login?mode=register&redirect=/app/backtest"
                  className="inline-block bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)] text-sm"
                >
                  Upload Your Backtest
                </Link>
              </div>
            </div>

            {/* Health Score Visual */}
            <div className="bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-white">Strategy Health Score</p>
                  <p className="text-xs text-[#64748B] mt-0.5">EMA Trend · EURUSD · H1</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span className="text-xs text-[#22C55E] font-medium">ROBUST</span>
                </div>
              </div>

              {/* Score circle */}
              <div className="flex justify-center mb-6">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="#1A0626" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#22C55E"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${83 * 2.64} ${100 * 2.64}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">83</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Profit Factor", score: 88, value: "1.87" },
                  { name: "Max Drawdown", score: 76, value: "18.2%" },
                  { name: "Win Rate", score: 72, value: "62.4%" },
                  { name: "Total Trades", score: 90, value: "847" },
                  { name: "Sharpe Ratio", score: 85, value: "1.42" },
                ].map((metric) => (
                  <div key={metric.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#94A3B8]">{metric.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#64748B]">{metric.value}</span>
                        <span className="text-xs font-mono text-[#CBD5E1] w-8 text-right">
                          {metric.score}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${metric.score}%`,
                          backgroundColor:
                            metric.score >= 80
                              ? "#22C55E"
                              : metric.score >= 60
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
                <p className="text-xs text-[#64748B] text-center">
                  Example visualization. Actual scores from your strategy data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PROBLEM — Why traders fail                                       */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Most traders never know if their strategy has an edge
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              They backtest once, see a profit, and deploy. Then the market shifts and the drawdowns
              start. AlgoStudio exists to break this cycle.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                problem: "One test is not validation",
                description:
                  "A single backtest on cherry-picked data proves nothing. Without scoring across multiple dimensions, you don't know if your results were skill or luck.",
              },
              {
                problem: "Metrics alone don't tell the story",
                description:
                  "Profit factor looks great? Check the drawdown. Win rate is high? Check the Sharpe. You need a holistic health assessment, not isolated numbers.",
              },
              {
                problem: "Strategies degrade silently",
                description:
                  "Markets change. An edge that worked last year can erode over months. Without monitoring, you only notice when the drawdown is already deep.",
              },
              {
                problem: "No objective second opinion",
                description:
                  "You've stared at the equity curve for hours. You need someone who'll tell you the uncomfortable truth about your strategy's weaknesses.",
              },
            ].map((item) => (
              <div
                key={item.problem}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-white mb-2">{item.problem}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PLATFORM MODULES — What AlgoStudio includes                      */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              One platform. Complete strategy intelligence.
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Upload a backtest, get instant intelligence, validate under stress, deploy with proof,
              and monitor in production. Everything works together.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Backtest Health Check",
                description:
                  "Upload your MT5 Strategy Tester HTML report. Get an instant 0-100 health score across 7 weighted dimensions. Know immediately if your strategy is ROBUST, MODERATE, or WEAK.",
                accent: "#22D3EE",
              },
              {
                title: "AI Strategy Doctor",
                description:
                  "AI-powered analysis of your full trade history. Identifies weaknesses, overfitting signals, market dependency risks, and live trading readiness. Actionable recommendations in plain language.",
                accent: "#A78BFA",
              },
              {
                title: "Monte Carlo Validation",
                description:
                  "One-click stress test. Run 1,000 randomized simulations of your trade sequence. See survival probability and the realistic range of outcomes — not just the best case.",
                accent: "#F59E0B",
              },
              {
                title: "Verified Track Record",
                description:
                  "Built into every EA — automatic, zero-config. SHA-256 hash chain with multi-level verification, broker corroboration, risk-adjusted metrics, and shareable proof bundles anyone can independently audit.",
                accent: "#10B981",
              },
              {
                title: "Strategy Builder",
                description:
                  "No-code visual builder with 6 proven templates. Customize risk parameters, export clean MQL5 source code. From trading idea to executable strategy in minutes.",
                accent: "#EC4899",
              },
              {
                title: "Health Monitor",
                description:
                  "Continuously compares live performance against your backtest baseline across 5 metrics. Alerts you when returns drift, drawdowns exceed norms, or your edge degrades.",
                accent: "#EF4444",
              },
            ].map((module) => (
              <div
                key={module.title}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: module.accent }}
                  />
                  <h3 className="text-base font-semibold text-white">{module.title}</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{module.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* VERIFIED STRATEGY PROOF CARD                                     */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Proof, not promises</h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Every strategy on AlgoStudio can produce a verifiable proof of performance. This is
              what a validated strategy looks like.
            </p>
          </div>

          {/* Simulated Verified Strategy Card */}
          <div className="max-w-lg mx-auto bg-[#0D0117] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(79,70,229,0.1)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#4F46E5]/20 border border-[#4F46E5]/30 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">EMA Trend Strategy</p>
                  <p className="text-xs text-[#64748B] font-mono">AS-7f3a2b1c</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-xs text-[#22C55E] font-medium">Healthy</span>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Win Rate</p>
                  <p className="text-lg font-semibold text-white">62.4%</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Profit Factor</p>
                  <p className="text-lg font-semibold text-white">1.87</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Sharpe Ratio</p>
                  <p className="text-lg font-semibold text-white">1.42</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Sortino Ratio</p>
                  <p className="text-lg font-semibold text-white">2.18</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-[#1A0626]/50 border-t border-[rgba(79,70,229,0.1)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 text-[#22D3EE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <span className="text-xs text-[#64748B]">Chain verified &middot; 847 events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span className="text-xs text-[#10B981] font-medium">Broker Verified</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748B]">v3 &middot; 142 days live</span>
                <span className="text-xs text-[#94A3B8]">
                  Share &amp; verify &mdash; anyone can independently audit
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-xs text-[#64748B] mb-2">
              Example visualization. Actual data from your strategies.
            </p>
            <Link
              href="/product/track-record"
              className="text-sm font-medium text-[#A78BFA] hover:underline"
            >
              Learn more about Verified Track Record &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* STRATEGY HEALTH — Protect capital                                */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase mb-3">
                Strategy Health Monitor
              </p>
              <h2 className="text-3xl font-bold text-white mb-4">Know when your edge is fading</h2>
              <p className="text-[#94A3B8] leading-relaxed mb-6">
                Every strategy has a lifespan. Market regimes change, correlations shift, and edges
                erode. The Health Monitor continuously compares your live trading against your
                validated baseline — and alerts you before a drawdown becomes a disaster.
              </p>
              <ul className="space-y-3">
                {[
                  "Return drift detection",
                  "Drawdown threshold alerts",
                  "Win rate degradation tracking",
                  "Trade frequency monitoring",
                  "Volatility regime analysis",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#CBD5E1]">
                    <svg
                      className="w-4 h-4 text-[#A78BFA] flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Health Score Visual */}
            <div className="bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-semibold text-white">Health Assessment</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span className="text-xs text-[#22C55E] font-medium">Healthy</span>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Return", score: 82, color: "#22C55E" },
                  { name: "Volatility", score: 75, color: "#22C55E" },
                  { name: "Drawdown", score: 91, color: "#22C55E" },
                  { name: "Win Rate", score: 68, color: "#F59E0B" },
                  { name: "Trade Frequency", score: 85, color: "#22C55E" },
                ].map((metric) => (
                  <div key={metric.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#94A3B8]">{metric.name}</span>
                      <span className="text-xs font-mono text-[#CBD5E1]">{metric.score}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${metric.score}%`, backgroundColor: metric.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[rgba(79,70,229,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#64748B]">Overall Score</span>
                  <span className="text-sm font-semibold text-white">80.2 / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* BUILDER — Secondary feature                                      */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-[#22D3EE] font-medium tracking-wider uppercase mb-3">
              Built-in EA Builder
            </p>
            <h2 className="text-3xl font-bold text-white mb-4">
              Build your EA. Then prove it works.
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              A visual interface that makes strategy building intuitive. No wiring, no logic gates,
              no blank canvas. Just the parameters that matter — then validate it with the tools
              above.
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute inset-4 bg-gradient-to-r from-[#4F46E5]/20 via-[#A78BFA]/20 to-[#22D3EE]/20 blur-3xl -z-10" />
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl overflow-hidden shadow-2xl shadow-[#4F46E5]/10">
              <div className="bg-[#0D0117] px-4 py-3 flex items-center gap-2 border-b border-[rgba(79,70,229,0.2)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-[#1A0626] rounded-md px-3 py-1 text-xs text-[#64748B] max-w-xs mx-auto">
                    algo-studio.com/builder
                  </div>
                </div>
              </div>
              <Image
                src="/demo-screenshot.png"
                alt="AlgoStudio visual strategy builder — drag-and-drop interface for building automated trading strategies"
                width={1918}
                height={907}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="w-full"
                quality={75}
                priority
              />
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-[#94A3B8] mb-4">
              6 proven templates &middot; No-code visual builder &middot; Clean MQL5 export
            </p>
            <Link
              href="/product/how-it-works"
              className="text-sm font-medium text-[#A78BFA] hover:underline"
            >
              Learn more about the Strategy Builder &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PRICING                                                          */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <PricingSection />
        </div>
      </section>

      {/* ================================================================ */}
      {/* FAQ                                                              */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details
                key={i}
                className="group bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-white font-medium text-sm list-none">
                  {item.q}
                  <svg
                    className="w-5 h-5 text-[#64748B] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-[#94A3B8] leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA                                                        */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Stop guessing. Start validating.</h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto">
            Upload your backtest, get an instant health score, and know if your strategy is ready
            for live markets — before you risk a single dollar.
          </p>
          <Link
            href="/login?mode=register&redirect=/app/backtest"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Upload Backtest — Free
          </Link>
          <p className="mt-4 text-xs text-[#64748B]">
            No credit card required. Upload your first backtest in under a minute.
          </p>

          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-200 leading-relaxed">
              <strong>Risk Warning:</strong> Trading in financial markets involves substantial risk
              of loss and is not suitable for every investor. Past performance does not guarantee
              future results. Always test strategies on a demo account first. AlgoStudio is a
              strategy intelligence platform — it does not provide financial advice or guarantee
              profits. See our{" "}
              <Link href="/terms" className="underline hover:text-amber-100">
                Terms of Service
              </Link>{" "}
              for full details.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
