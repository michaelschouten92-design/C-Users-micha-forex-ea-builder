import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Verified Track Record — Tamper-Resistant Performance Proof | AlgoStudio",
  description:
    "Every trade recorded in a cryptographic hash chain. Tamper-resistant, independently auditable performance records. Proof, not promises.",
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
    a: "Each trade is recorded with a cryptographic hash that includes the trade data plus the hash of the previous trade. This creates a chain where altering any past trade would break every subsequent hash. Tampering is mathematically detectable.",
  },
  {
    q: "Can track records be faked or altered?",
    a: "No. The hash chain makes it computationally infeasible to alter past records without detection. Each trade's hash depends on every trade before it. Changing one trade would invalidate the entire chain from that point forward.",
  },
  {
    q: "What data is recorded for each trade?",
    a: "Each trade record includes the strategy ID, entry time, exit time, direction (long or short), entry price, exit price, stop loss, take profit, lot size, profit/loss, and the cryptographic hash linking it to the previous trade.",
  },
  {
    q: "Can someone independently audit my track record?",
    a: "Yes. The hash chain can be independently verified by anyone with access to the record. They can recompute each hash and confirm the chain is intact — proving no trades were added, removed, or modified.",
  },
  {
    q: "Which plans include the Verified Track Record?",
    a: "Verified Track Record is available on the Pro and Elite plans. The Free plan does not include hash-chain verified performance records.",
  },
  {
    q: "How is this different from a regular trade journal?",
    a: "A regular trade journal is just a list of trades that can be edited at any time. The Verified Track Record uses cryptographic hashing to make the record immutable. You cannot go back and remove losing trades or add winning ones without breaking the chain.",
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
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Performance you can prove
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Every trade is recorded in a tamper-resistant hash chain. No trades can be added,
              removed, or modified after the fact. Your track record is cryptographically verified —
              proof, not promises.
            </p>
          </section>

          {/* Why verification matters */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Why verified records matter
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Trust your own data</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  When reviewing your strategy performance months later, you need to know the data
                  is exactly what happened. No accidental edits, no selective memory. The hash chain
                  guarantees the record is unchanged.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Eliminate survivorship bias
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  It is tempting to forget losing strategies and remember winners. With a verified
                  track record, every strategy&apos;s performance is permanently recorded. You see
                  the complete picture — wins and losses alike.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Independent auditability</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  The hash chain can be independently verified. Anyone with access to the record can
                  recompute the hashes and confirm integrity. No trust required — the math speaks
                  for itself.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Better decision-making</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Accurate records lead to better decisions. When you can trust that your
                  performance data is real, you can make objective choices about position sizing,
                  strategy selection, and risk management.
                </p>
              </div>
            </div>
          </section>

          {/* How the hash chain works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              How the hash chain works
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Trade is executed",
                  desc: "When your EA closes a trade, the trade data — entry, exit, direction, size, and result — is captured and submitted to AlgoStudio.",
                },
                {
                  step: "2",
                  title: "Hash is computed",
                  desc: "A cryptographic hash is generated from the trade data combined with the hash of the previous trade. This creates an unbreakable link between consecutive trades.",
                },
                {
                  step: "3",
                  title: "Chain is extended",
                  desc: "The new trade and its hash are appended to your track record chain. Each new trade strengthens the integrity of every trade before it.",
                },
                {
                  step: "4",
                  title: "Verification is always available",
                  desc: "At any time, the entire chain can be verified by recomputing each hash from the first trade forward. If any trade was altered, the chain breaks at that point.",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What gets recorded */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">What gets recorded</h2>
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Strategy identity",
                    desc: "The AS-xxxx strategy ID and version that produced the trade.",
                  },
                  {
                    title: "Trade details",
                    desc: "Entry time, exit time, direction, entry price, exit price, lot size.",
                  },
                  {
                    title: "Risk parameters",
                    desc: "Stop loss level, take profit level, and risk percentage used.",
                  },
                  {
                    title: "Result and hash",
                    desc: "Profit or loss in currency and pips, plus the cryptographic hash linking to the chain.",
                  },
                ].map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-[#64748B] mt-4 text-center">
              Verified Track Record requires{" "}
              <Link href="/pricing" className="text-[#A78BFA] hover:underline">
                Pro or Elite plan
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Build a track record you can trust"
        description="Every trade cryptographically verified. Tamper-resistant records that prove your real performance. Start with a free account."
      />

      <Footer />
    </div>
  );
}
