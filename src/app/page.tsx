import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AlgoStudio — The Proof Layer for Algorithmic Trading",
  description:
    "Verify your trading strategy with cryptographic proof. Upload a backtest, validate with Monte Carlo analysis, and build a tamper-proof live track record anyone can audit. Free to start.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — Proof > Backtests",
    description:
      "Verify your trading strategy with cryptographic proof. Validated backtests, tamper-proof live track records, and independent verification. The trust layer algo trading has been missing.",
  },
};

/* ---------- Icons (inline SVGs to avoid deps) ---------- */

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ShieldIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function LinkIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function SearchIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ChartIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ---------- Proof Card (static mockup for hero) ---------- */

function ProofCardMockup() {
  return (
    <div className="bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl w-full max-w-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[rgba(79,70,229,0.1)] flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            EMA Momentum <span className="text-[#64748B] font-normal">EURUSD H1</span>
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">@verified_trader</p>
        </div>
        <span className="text-[10px] font-bold text-[#10B981] bg-[rgba(16,185,129,0.12)] px-2.5 py-1 rounded-full border border-[rgba(16,185,129,0.3)] uppercase tracking-wider">
          Proven
        </span>
      </div>

      {/* Stats grid */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Health Score</p>
          <p className="text-lg font-bold text-[#10B981] font-mono">83/100</p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Live Trades</p>
          <p className="text-lg font-bold text-white font-mono">347</p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Track Record</p>
          <p className="text-lg font-bold text-white font-mono">142d</p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Max DD</p>
          <p className="text-lg font-bold text-[#22D3EE] font-mono">8.2%</p>
        </div>
      </div>

      {/* Chain integrity */}
      <div className="px-5 py-3 bg-[#1A0626]/50 border-t border-[rgba(79,70,229,0.1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-xs text-[#10B981] font-medium">Chain Verified</span>
        </div>
        <span className="text-[10px] text-[#64748B] font-mono">347 blocks &middot; SHA-256</span>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

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
      "The proof layer for algorithmic trading. Verify strategies with cryptographic track records, Monte Carlo validation, and independent auditing. From backtest to verified edge.",
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
      "Cryptographic hash chain for tamper-proof trade records",
      "Monte Carlo validation with survival analysis",
      "Multi-dimensional backtest health scoring",
      "Verified Proof Pages with independent auditability",
      "Live performance monitoring with edge degradation detection",
      "Ladder system: Submitted → Validated → Verified → Proven",
      "Public recognition hubs for verified traders",
    ],
  };

  return (
    <div id="main-content" className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />

      {/* ================================================================ */}
      {/* S1: HERO — Proof-first positioning                               */}
      {/* ================================================================ */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left — Copy + CTA */}
          <div>
            <p className="text-sm font-medium text-[#22D3EE] tracking-wider uppercase mb-4">
              The Proof Layer for Algorithmic Trading
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Every trade. <span className="text-[#A78BFA]">Verified.</span>{" "}
              <span className="text-[#22D3EE]">Provable.</span>
            </h1>

            <p className="text-lg text-[#94A3B8] mb-8 max-w-lg">
              Stop sharing backtests no one trusts. Validate your strategy, build a cryptographic
              track record, and prove your edge — to investors, prop firms, or yourself.
            </p>

            {/* Credibility cues */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8 text-sm text-[#CBD5E1]">
              {["Tamper-proof hash chain", "Independent verification", "Monte Carlo validated"].map(
                (badge) => (
                  <div key={badge} className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-[#22D3EE] flex-shrink-0" />
                    {badge}
                  </div>
                )
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/login?mode=register&redirect=/app/evaluate"
                className="inline-block w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)] text-center"
              >
                Verify Your Strategy — Free
              </Link>
              <Link
                href="/verified"
                className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors py-3.5"
              >
                View verified strategies
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <p className="mt-4 text-xs text-[#64748B]">
              Free forever for backtest validation. No credit card required.
            </p>
          </div>

          {/* Right — Proof Card mockup */}
          <div className="flex justify-center">
            <ProofCardMockup />
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S2: LIVE PROOFS — What verified strategies look like              */}
      {/* ================================================================ */}
      <section className="py-16 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Real strategies. <span className="text-[#22D3EE]">Real proof.</span>
            </h2>
            <p className="text-[#94A3B8] max-w-xl mx-auto">
              Every verified strategy on AlgoStudio has a public Proof Page — a tamper-proof record
              anyone can audit without an account.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "EMA Momentum",
                pair: "EURUSD H1",
                level: "PROVEN",
                levelColor: "#10B981",
                score: 83,
                trades: 347,
                days: 142,
                dd: "8.2%",
              },
              {
                name: "RSI Mean Revert",
                pair: "GBPUSD M15",
                level: "VERIFIED",
                levelColor: "#6366F1",
                score: 71,
                trades: 89,
                days: 48,
                dd: "12.1%",
              },
              {
                name: "Breakout Scalper",
                pair: "USDJPY M5",
                level: "VALIDATED",
                levelColor: "#F59E0B",
                score: 68,
                trades: 0,
                days: 0,
                dd: "—",
              },
            ].map((s) => (
              <div
                key={s.name}
                className="bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl p-5 hover:border-[rgba(79,70,229,0.3)] transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    <p className="text-xs text-[#64748B]">{s.pair}</p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                    style={{
                      color: s.levelColor,
                      backgroundColor: `${s.levelColor}15`,
                      borderColor: `${s.levelColor}40`,
                    }}
                  >
                    {s.level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[#64748B]">Health</p>
                    <p className="font-mono font-bold text-white">{s.score}/100</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Live Trades</p>
                    <p className="font-mono font-bold text-white">{s.trades || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Track Record</p>
                    <p className="font-mono font-bold text-white">{s.days ? `${s.days}d` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Max DD</p>
                    <p className="font-mono font-bold text-white">{s.dd}</p>
                  </div>
                </div>

                {s.trades > 0 && (
                  <div className="mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-[10px] text-[#10B981]">Chain intact</span>
                    <span className="text-[10px] text-[#64748B] ml-auto font-mono">
                      {s.trades} blocks
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/verified"
              className="inline-flex items-center gap-1.5 text-sm text-[#22D3EE] hover:text-white transition-colors font-medium"
            >
              Browse all verified strategies
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S3: THE PROBLEM — Why backtests aren't enough                    */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Backtests lie. <span className="text-[#EF4444]">Everyone knows it.</span>
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              The algo trading industry runs on unverifiable claims. Curve-fitted backtests,
              cherry-picked results, and track records that can&apos;t be audited. It&apos;s broken.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                problem: "Curve fitting",
                desc: "Backtests optimized to perfection on historical data collapse on live markets. 95% of strategies that look great in testing fail within months.",
                icon: (
                  <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#EF4444]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                ),
              },
              {
                problem: "Cherry-picked results",
                desc: "Screenshots of winning trades. Conveniently omitted losing months. No way to verify what's real and what's marketing.",
                icon: (
                  <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#EF4444]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  </div>
                ),
              },
              {
                problem: "No verification",
                desc: "Prop firms, investors, and communities have no way to independently verify a trader's claims. Trust is blind.",
                icon: (
                  <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#EF4444]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  </div>
                ),
              },
            ].map((item) => (
              <div key={item.problem} className="text-center">
                <div className="flex justify-center mb-4">{item.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">{item.problem}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S4: SOLUTION FLOW — From idea to proof in 3 steps                */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#0D0117]/60 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              From backtest to <span className="text-[#A78BFA]">verified proof</span> in three
              steps.
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              AlgoStudio replaces trust with evidence. Each step adds a layer of verification that
              anyone can independently audit.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-0">
            {[
              {
                step: "01",
                title: "Upload & Validate",
                level: "Validated",
                levelColor: "#F59E0B",
                desc: "Upload your MT5 backtest report. AlgoStudio runs Monte Carlo analysis, scores health across 7 dimensions, and flags overfitting risks. Instant, objective validation.",
                icon: <ChartIcon className="w-7 h-7 text-[#F59E0B]" />,
              },
              {
                step: "02",
                title: "Connect & Verify",
                level: "Verified",
                levelColor: "#6366F1",
                desc: "Connect your live EA. Every trade is cryptographically sealed into a hash chain — tamper-proof, immutable, and independently verifiable. No more screenshots.",
                icon: <LinkIcon className="w-7 h-7 text-[#6366F1]" />,
              },
              {
                step: "03",
                title: "Prove & Share",
                level: "Proven",
                levelColor: "#10B981",
                desc: "After 90+ days of stable live performance, your strategy earns Proven status. Share your public Proof Page — verifiable by anyone, no account needed.",
                icon: <ShieldIcon className="w-7 h-7 text-[#10B981]" />,
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center px-6 py-8"
              >
                {/* Connector line (desktop) */}
                {i < 2 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 bg-[rgba(79,70,229,0.2)]" />
                )}

                <div className="mb-4 w-14 h-14 rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.2)] flex items-center justify-center">
                  {item.icon}
                </div>

                <p className="text-[10px] text-[#64748B] font-mono uppercase tracking-widest mb-2">
                  Step {item.step}
                </p>

                <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>

                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-3"
                  style={{
                    color: item.levelColor,
                    backgroundColor: `${item.levelColor}15`,
                    borderColor: `${item.levelColor}40`,
                  }}
                >
                  → {item.level}
                </span>

                <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/login?mode=register&redirect=/app/evaluate"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start with a Free Validation
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S5: TRUST & VERIFICATION — How proof works                       */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Verification you can <span className="text-[#22D3EE]">prove.</span>
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Not &ldquo;trust me&rdquo; — verify it. Every claim on AlgoStudio is backed by
              cryptographic evidence and independently auditable records.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <ShieldIcon className="w-8 h-8 text-[#22D3EE]" />,
                title: "Tamper-proof hash chain",
                desc: "Every live trade is cryptographically sealed into a SHA-256 hash chain. Change one trade and the entire chain breaks. Manipulation is mathematically impossible.",
              },
              {
                icon: <SearchIcon className="w-8 h-8 text-[#22D3EE]" />,
                title: "Independent verification",
                desc: "Anyone can audit a Proof Page — no account needed. Download the proof bundle, verify the hash chain, and confirm every trade independently.",
              },
              {
                icon: <ChartIcon className="w-8 h-8 text-[#22D3EE]" />,
                title: "Continuous health monitoring",
                desc: "Health scores update with every trade. Edge degradation is detected automatically. If performance collapses, the record shows it — no hiding.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="text-center group transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex justify-center mb-4">{item.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S6: RECOGNITION — Network effect & hubs                          */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Prove once. <span className="text-[#A78BFA]">Get recognized everywhere.</span>
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Verified strategies earn public recognition. Share your Proof Page with investors,
              prop firms, or trading communities — backed by cryptographic evidence, not claims.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Verified Strategies",
                desc: "Live-connected strategies with intact hash chains",
                href: "/verified",
                color: "#10B981",
              },
              {
                title: "Most Robust",
                desc: "Highest health scores across all dimensions",
                href: "/top-robust",
                color: "#6366F1",
              },
              {
                title: "Rising",
                desc: "New strategies building verified track records",
                href: "/rising",
                color: "#F59E0B",
              },
              {
                title: "Low Drawdown",
                desc: "Strategies with the tightest risk control",
                href: "/low-drawdown",
                color: "#22D3EE",
              },
            ].map((hub) => (
              <Link
                key={hub.title}
                href={hub.href}
                className="group bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl p-5 hover:border-[rgba(79,70,229,0.3)] transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: hub.color }} />
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#22D3EE] transition-colors">
                  {hub.title}
                </h3>
                <p className="text-xs text-[#94A3B8]">{hub.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-[#64748B] group-hover:text-[#22D3EE] transition-colors">
                  Browse
                  <ArrowRightIcon className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-6 text-sm text-[#64748B]">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-[#22D3EE]" />
                <span>Public profiles with @handles</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-[#22D3EE]" />
                <span>Shareable Proof Pages</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-[#22D3EE]" />
                <span>Trust scores &amp; badges</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S7: PRICING — Reframed for proof                                 */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-white mb-3">Free to validate. Pro to prove.</h2>
            <p className="text-sm text-[#94A3B8]">
              Upload a backtest and get your Health Score for free. Go Pro for verified track
              records, live monitoring, and public Proof Pages.
            </p>
          </div>
          <PricingSection showHeader={false} />
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA                                                         */}
      {/* ================================================================ */}
      <CTASection
        title="Your strategy claims an edge. Prove it."
        description="Free backtest validation. Cryptographic track records. Independent verification. The trust layer algo trading has been missing."
        ctaText="Verify Your Strategy — Free"
      />

      <Footer />
    </div>
  );
}
