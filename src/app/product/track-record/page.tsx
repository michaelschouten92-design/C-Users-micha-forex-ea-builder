import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Verified Track Record — Cryptographic Performance Proof Built Into Every EA | AlgoStudio",
  description:
    "Every trade cryptographically sealed with SHA-256 hash chains, HMAC checkpoints, and Ed25519 signatures. Multi-level verification, risk-adjusted metrics, broker corroboration, and shareable proof bundles. Built into every EA — automatic, zero-config.",
  alternates: { canonical: "/product/track-record" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
  { name: "Verified Track Record", href: "/product/track-record" },
];

const faqItems = [
  {
    q: "How does the hash chain verification work?",
    a: "Each trade is recorded with a SHA-256 cryptographic hash that includes the trade data plus the hash of the previous trade. This creates a chain where altering any past trade would break every subsequent hash. Tampering is mathematically detectable — the entire chain can be replayed and verified from the first event forward.",
  },
  {
    q: "Can track records be faked or altered?",
    a: "No. The hash chain makes it computationally infeasible to alter past records without detection. Each trade's hash depends on every trade before it. Additionally, HMAC-SHA256 checkpoints create periodic state snapshots, and Ed25519 digital signatures seal completed reports. Changing one trade would invalidate the chain, the checkpoints, and the signatures.",
  },
  {
    q: "What data is recorded for each trade?",
    a: "Each trade record includes the strategy ID, entry time, exit time, direction (long or short), entry price, exit price, stop loss, take profit, lot size, profit/loss, and the cryptographic hash linking it to the previous trade. Risk-adjusted metrics (Sharpe, Sortino, Calmar ratios and more) are computed automatically from the verified data.",
  },
  {
    q: "Can someone independently audit my track record?",
    a: "Yes. You can generate a proof bundle containing all events, hashes, signatures, and checksums. Anyone can upload this bundle to the public verifier at /verify and independently confirm the chain is intact — no AlgoStudio account required.",
  },
  {
    q: "Which plans include the Verified Track Record?",
    a: "The core track record — automatic trade recording and hash chain verification — is built into every EA on all plans, including Free. Proof sharing and public verification links are available on Pro and Elite plans.",
  },
  {
    q: "How is this different from a regular trade journal?",
    a: "A regular trade journal is just a list of trades that can be edited at any time. The Verified Track Record uses a multi-layer cryptographic architecture (SHA-256 hash chain, HMAC checkpoints, Ed25519 signatures) to make the record immutable. You cannot go back and remove losing trades or add winning ones without breaking the chain.",
  },
  {
    q: "How does proof sharing work?",
    a: "On Pro and Elite plans, you can generate a shareable proof bundle from your track record. This bundle contains the full event chain, cryptographic hashes, HMAC checkpoints, and digital signatures. You share a link, and anyone — investors, prop firms, other traders — can independently verify your performance without needing an AlgoStudio account.",
  },
  {
    q: "What are the risk-adjusted metrics?",
    a: "AlgoStudio automatically computes Sharpe Ratio (risk-adjusted return), Sortino Ratio (downside-risk-adjusted return), Calmar Ratio (return vs max drawdown), Profit Factor, and max drawdown duration — all calculated from your verified trade data. These metrics update as new trades are recorded.",
  },
  {
    q: "What is broker verification (L2)?",
    a: "Level 2 verification cross-references your recorded trades with data from your broker. This adds an independent confirmation layer beyond the hash chain itself — proving not just that the record is intact, but that the trades actually occurred on a real trading account.",
  },
  {
    q: "What are the L1, L2, and L3 verification levels?",
    a: "L1 (Ledger Integrity) verifies the hash chain and replays every event. L2 (Broker Corroboration) cross-references trades with your broker's data. L3 (Notarized) adds external timestamping for the highest assurance level. Each level builds on the previous one, providing progressively stronger proof.",
  },
  {
    q: "Is the track record really free?",
    a: "Yes. The core track record — automatic trade recording, hash chain verification, and risk-adjusted metrics — is built into every EA on all plans. Proof sharing (generating shareable links and proof bundles for others to verify) is available on Pro and Elite plans.",
  },
];

export default function TrackRecordPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* ============================================================ */}
          {/* HERO                                                         */}
          {/* ============================================================ */}
          <section className="text-center mb-24">
            <div className="inline-flex items-center gap-2 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs text-[#10B981] font-medium">Built Into Every EA</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Every trade. Cryptographically sealed.
              <br />
              <span className="text-[#A78BFA]">Automatically.</span>
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              The Verified Track Record is built into every EA you create with AlgoStudio. No setup,
              no opt-in, no configuration. From the first trade, every event is cryptographically
              recorded in a tamper-resistant chain — with risk metrics, broker verification, and
              shareable proof bundles.
            </p>
          </section>

          {/* ============================================================ */}
          {/* BUILT IN, NOT BOLTED ON                                       */}
          {/* ============================================================ */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Built in, not bolted on
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Track record verification isn&apos;t an add-on you enable later. It&apos;s part of the
              core architecture of every EA.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Automatic",
                  description:
                    "Every trade is recorded the moment it closes. No manual logging, no API calls, no extra steps. It just works.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  ),
                },
                {
                  title: "Zero Config",
                  description:
                    "No setup wizard, no settings to toggle. The track record system activates when your EA makes its first trade.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ),
                },
                {
                  title: "Always On",
                  description:
                    "The track record cannot be disabled or paused. This is integrity by design — every trade is recorded, always.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  ),
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 text-center"
                >
                  <div className="w-12 h-12 bg-[#4F46E5]/10 border border-[#4F46E5]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-6 h-6 text-[#A78BFA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================ */}
          {/* SECURITY ARCHITECTURE                                         */}
          {/* ============================================================ */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Security architecture
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Four layers of cryptographic protection. The same primitives used in blockchain and
              secure communications — without the overhead.
            </p>

            <div className="space-y-4">
              {[
                {
                  layer: "Layer 1",
                  title: "SHA-256 Hash Chain",
                  description:
                    "Every trade event is hashed with SHA-256, incorporating the previous event's hash. This creates an unbreakable chain where altering any past event invalidates everything after it.",
                  color: "#A78BFA",
                  bgColor: "rgba(167,139,250,0.1)",
                  borderColor: "rgba(167,139,250,0.2)",
                },
                {
                  layer: "Layer 2",
                  title: "HMAC-SHA256 Checkpoints",
                  description:
                    "Periodic state snapshots using keyed-hash message authentication. These checkpoints provide fast integrity verification without replaying the entire chain.",
                  color: "#22D3EE",
                  bgColor: "rgba(34,211,238,0.1)",
                  borderColor: "rgba(34,211,238,0.2)",
                },
                {
                  layer: "Layer 3",
                  title: "Ed25519 Digital Signatures",
                  description:
                    "Completed reports and proof bundles are signed with Ed25519 elliptic curve signatures. This guarantees authorship and prevents tampering after report generation.",
                  color: "#10B981",
                  bgColor: "rgba(16,185,129,0.1)",
                  borderColor: "rgba(16,185,129,0.2)",
                },
                {
                  layer: "Layer 4",
                  title: "Timestamp Bounds Validation",
                  description:
                    "Every event is validated against timestamp bounds — rejecting future-dated or expired events. This prevents backdating trades or inserting events outside valid windows.",
                  color: "#F59E0B",
                  bgColor: "rgba(245,158,11,0.1)",
                  borderColor: "rgba(245,158,11,0.2)",
                },
              ].map((item) => (
                <div
                  key={item.layer}
                  className="flex items-start gap-4 p-6 rounded-xl border"
                  style={{
                    backgroundColor: item.bgColor,
                    borderColor: item.borderColor,
                  }}
                >
                  <div
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded shrink-0 mt-0.5"
                    style={{ color: item.color, backgroundColor: `${item.color}20` }}
                  >
                    {item.layer}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================ */}
          {/* MULTI-LEVEL VERIFICATION                                      */}
          {/* ============================================================ */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Multi-level verification
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Three levels of trust, each building on the last. Choose the verification depth that
              matches your needs.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  level: "L1",
                  title: "Ledger Integrity",
                  description:
                    "Hash chain replay verification. Every event is re-hashed from the genesis event forward, confirming the chain is intact and no events were added, removed, or modified.",
                  badge: "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/30",
                  features: [
                    "Full chain replay",
                    "Hash continuity check",
                    "Event ordering validation",
                  ],
                },
                {
                  level: "L2",
                  title: "Broker Corroboration",
                  description:
                    "Cross-references your recorded trades with data from your broker. Confirms that trades in the ledger actually occurred on a real trading account with matching details.",
                  badge: "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/30",
                  features: [
                    "Broker data matching",
                    "Trade existence proof",
                    "Price & timing validation",
                  ],
                },
                {
                  level: "L3",
                  title: "Notarized",
                  description:
                    "External timestamping and notarization for the highest level of assurance. Provides third-party proof that the record existed at a specific point in time.",
                  badge: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30",
                  features: [
                    "External timestamping",
                    "Third-party attestation",
                    "Maximum assurance",
                  ],
                  comingSoon: true,
                },
              ].map((item) => (
                <div
                  key={item.level}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${item.badge}`}
                    >
                      {item.level}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    {item.comingSoon && (
                      <span className="text-[10px] text-[#64748B] border border-[#64748B]/30 rounded-full px-2 py-0.5">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">{item.description}</p>
                  <ul className="space-y-2">
                    {item.features.map((feature) => (
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

          {/* ============================================================ */}
          {/* RISK-ADJUSTED METRICS                                         */}
          {/* ============================================================ */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Risk-adjusted metrics
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Raw returns tell you nothing without context. These metrics are computed automatically
              from your verified trade data — giving you the full picture.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: "Sharpe Ratio",
                  description:
                    "Risk-adjusted return. Measures excess return per unit of total volatility. Higher is better — shows whether returns justify the risk taken.",
                },
                {
                  name: "Sortino Ratio",
                  description:
                    "Downside-risk-adjusted return. Like Sharpe but only penalizes downside volatility. More relevant for traders who care about losses, not just fluctuations.",
                },
                {
                  name: "Calmar Ratio",
                  description:
                    "Return relative to maximum drawdown. Shows how much you earned for every unit of worst-case pain. Critical for capital preservation strategies.",
                },
                {
                  name: "Profit Factor",
                  description:
                    "Gross profit divided by gross loss. A profit factor above 1.0 means the strategy is net profitable. Above 1.5 indicates a meaningful edge.",
                },
                {
                  name: "Max Drawdown Duration",
                  description:
                    "The longest period between equity peaks. Tells you how long you may need to wait before recovering from a drawdown — crucial for psychological endurance.",
                },
                {
                  name: "Win Rate & Expectancy",
                  description:
                    "Win rate alone is misleading. Combined with average win vs average loss, expectancy shows the expected value per trade — the true measure of edge.",
                },
              ].map((metric) => (
                <div
                  key={metric.name}
                  className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
                >
                  <h3 className="text-base font-semibold text-white mb-2">{metric.name}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{metric.description}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-[#64748B] text-center mt-6">
              All metrics are computed from verified trade data and update automatically as new
              trades are recorded.
            </p>
          </section>

          {/* ============================================================ */}
          {/* PROOF SHARING & PUBLIC VERIFICATION                            */}
          {/* ============================================================ */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">Share and verify</h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Generate a proof bundle and share it with anyone. Independent verification — no trust
              required.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">For strategy owners</h3>
                <ul className="space-y-4">
                  {[
                    {
                      title: "Generate a shareable link",
                      desc: "One click creates a proof bundle with your full verified track record. Share it with investors, prop firms, or fellow traders.",
                    },
                    {
                      title: "Complete proof bundles",
                      desc: "Every bundle contains the event chain, cryptographic hashes, HMAC checkpoints, Ed25519 signatures, and risk metrics. Everything needed for independent verification.",
                    },
                    {
                      title: "Control what you share",
                      desc: "Choose which strategies and time periods to include. Your proof, your terms.",
                    },
                  ].map((item) => (
                    <li key={item.title}>
                      <p className="text-sm font-medium text-white mb-1">{item.title}</p>
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">For verifiers</h3>
                <ul className="space-y-4">
                  {[
                    {
                      title: "No account needed",
                      desc: "Anyone can verify a proof bundle. No AlgoStudio account, no login, no sign-up required.",
                    },
                    {
                      title: "Independent verification",
                      desc: "The verifier replays the hash chain, validates checkpoints, and checks signatures. The math proves integrity — no trust in AlgoStudio needed.",
                    },
                    {
                      title: "Upload-based verification",
                      desc: "Receive a proof bundle? Upload it directly to the public verifier and get a complete integrity report.",
                    },
                  ].map((item) => (
                    <li key={item.title}>
                      <p className="text-sm font-medium text-white mb-1">{item.title}</p>
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#A78BFA] hover:underline"
                >
                  Go to public verifier &rarr;
                </Link>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* SIMULATED VERIFIED CARD                                       */}
          {/* ============================================================ */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              What a verified track record looks like
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Every strategy on AlgoStudio produces a verifiable proof of performance. This is the
              real output.
            </p>

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
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30">
                    L2
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                    <span className="text-xs text-[#22C55E] font-medium">Healthy</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Sharpe</p>
                    <p className="text-lg font-semibold text-white">1.42</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Sortino</p>
                    <p className="text-lg font-semibold text-white">2.18</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Profit Factor</p>
                    <p className="text-lg font-semibold text-white">1.87</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Max DD</p>
                    <p className="text-lg font-semibold text-white">8.2%</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-[#1A0626]/50 border-t border-[rgba(79,70,229,0.1)]">
                <div className="flex items-center justify-between mb-1">
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
                    <span className="text-xs text-[#64748B]">
                      Chain verified &middot; 847 events
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-xs text-[#10B981] font-medium">Broker Verified</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#64748B]">v3 &middot; 142 days live</span>
                  <span className="text-xs text-[#64748B]">Win 62.4% &middot; Calmar 3.41</span>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-[#64748B] mt-4">
              Example visualization. Actual data from your strategies.
            </p>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Start building your verified track record"
        description="Every trade cryptographically sealed. Multi-level verification. Risk-adjusted metrics. Shareable proof bundles. Built into every EA — start with a free account."
      />

      <Footer />
    </div>
  );
}
