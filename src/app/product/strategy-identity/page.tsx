import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Strategy Identity — Permanent IDs and Version History | AlgoStudio",
  description:
    "Every strategy gets a permanent AS-xxxx ID with full version history. Track what is deployed, what changed, and when. Complete auditability for your trading strategies.",
  alternates: { canonical: "/product/strategy-identity" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
  { name: "Strategy Identity", href: "/product/strategy-identity" },
];

const faqItems = [
  {
    q: "What is a Strategy Identity?",
    a: "A Strategy Identity is a permanent, unique identifier (format AS-xxxx) assigned to each strategy you create in AlgoStudio. It stays with the strategy forever, even as you update parameters or export new versions. It is the single source of truth for what a strategy is and how it has changed over time.",
  },
  {
    q: "How does version history work?",
    a: "Every time you modify a strategy's parameters and save or export, AlgoStudio records a new version under the same AS-xxxx ID. Each version captures the full configuration — template, risk settings, indicators, and parameters. You can compare any two versions side by side.",
  },
  {
    q: "Can I share my Strategy Identity with others?",
    a: "The AS-xxxx ID itself is just an identifier. Sharing it does not expose your strategy configuration or trade data. It can be used as a reference in discussions or journals, but the underlying strategy details remain private to your account.",
  },
  {
    q: "What happens if I delete a strategy?",
    a: "Deleting a strategy archives the AS-xxxx ID and its version history. The ID is never reassigned to another strategy. If the strategy had a Verified Track Record, those records remain intact and verifiable even after deletion.",
  },
  {
    q: "Which plans include Strategy Identity?",
    a: "Strategy Identity with full version history is available on the Pro and Elite plans. The Free plan assigns strategy IDs but does not include version history tracking.",
  },
  {
    q: "How does Strategy Identity connect to the Track Record?",
    a: "Every trade in your Verified Track Record is linked to a specific strategy version. This means you can see exactly which configuration produced which results — and whether a parameter change improved or degraded performance.",
  },
];

export default function StrategyIdentityPage() {
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
              Know exactly what is deployed
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Every strategy gets a permanent AS-xxxx ID and full version history. Track what
              changed, when it changed, and which version is running live. No more guessing which
              settings produced which results.
            </p>
          </section>

          {/* Why identity matters */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Why strategy identity matters
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">End the guesswork</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  When you have multiple strategies across multiple accounts, it is easy to lose
                  track of what is running where. A permanent ID eliminates confusion. AS-1042 is
                  always AS-1042, regardless of where it is deployed.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Version control for trading
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Software developers version their code. Traders should version their strategies.
                  Every parameter change is recorded. You can compare v3 to v7 and see exactly what
                  changed — and whether the changes helped.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Audit trail</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Need to review why a strategy started underperforming? Version history shows every
                  change with timestamps. Pinpoint exactly when and what was modified. No more
                  relying on memory.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Connected to your track record
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Every trade in your Verified Track Record is linked to a specific strategy
                  version. See which configuration produced which results. Attribution is automatic
                  and exact.
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              How Strategy Identity works
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Create a strategy",
                  desc: "When you create a new strategy in AlgoStudio, it is automatically assigned a permanent AS-xxxx ID. This ID never changes, even if you rename the strategy.",
                },
                {
                  step: "2",
                  title: "Modify and version",
                  desc: "Every time you change parameters and save or export, a new version is recorded under the same ID. The full configuration is captured — template, indicators, risk settings, and all parameters.",
                },
                {
                  step: "3",
                  title: "Compare versions",
                  desc: "View the complete version history for any strategy. Compare two versions side by side to see what changed. Understand how parameter adjustments affected performance.",
                },
                {
                  step: "4",
                  title: "Track what is live",
                  desc: "Know exactly which version of which strategy is deployed on each account. When performance changes, check the version history to understand why.",
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

          {/* What a version captures */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              What each version captures
            </h2>
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Strategy template",
                    desc: "Which base template the strategy uses (EMA Crossover, RSI Reversal, etc.).",
                  },
                  {
                    title: "Indicator parameters",
                    desc: "All indicator settings — periods, levels, thresholds, and calculation methods.",
                  },
                  {
                    title: "Risk configuration",
                    desc: "Risk per trade, stop loss method, take profit ratio, and position sizing rules.",
                  },
                  {
                    title: "Timestamp and metadata",
                    desc: "When the version was created, version number, and any notes you attached.",
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
              Full version history requires{" "}
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
        title="Give your strategies an identity"
        description="Permanent IDs, full version history, and complete auditability for every strategy you build. Start with a free account."
      />

      <Footer />
    </div>
  );
}
