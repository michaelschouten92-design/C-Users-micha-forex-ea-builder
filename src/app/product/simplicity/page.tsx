import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Why Simplicity Wins — AlgoStudio's Approach to EA Building",
  description:
    "AlgoStudio is designed around one principle: simplicity. Templates instead of blank canvases. Sensible defaults instead of 50-field forms. Clean output instead of complexity. Here's why.",
  alternates: { canonical: "/product/simplicity" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Product", href: "/product" },
  { name: "Why Simplicity Wins", href: "/product/simplicity" },
];

const faqItems = [
  {
    q: "Is AlgoStudio too simple for experienced traders?",
    a: "No. Experienced traders often want the fastest path to a working EA — not more complexity. AlgoStudio gives you clean MQL5 code that you can customize further in MetaEditor.",
  },
  {
    q: "Can I build complex strategies with AlgoStudio?",
    a: "AlgoStudio focuses on proven, template-based strategies with optional advanced settings like trend filters and session timing. For highly custom logic, you can edit the exported MQL5 code directly.",
  },
  {
    q: "Why templates instead of a blank canvas?",
    a: "Templates remove the hardest part: starting from zero. Every template produces a working EA instantly. You adjust what matters instead of building everything from scratch.",
  },
  {
    q: "What if I need a strategy not covered by the templates?",
    a: "Export the closest template and modify the MQL5 code in MetaEditor. The clean, well-commented code makes customization straightforward.",
  },
];

export default function SimplicityPage() {
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
              Why simplicity wins in EA building
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Most EA builders compete on features. AlgoStudio competes on simplicity. Here&apos;s
              why that matters — and why it works.
            </p>
          </section>

          {/* The problem with complexity */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">
              The problem with complex EA builders
            </h2>
            <div className="space-y-6 text-[#94A3B8] leading-relaxed">
              <p>
                Most EA builders are designed for maximum flexibility. They give you hundreds of
                blocks, dozens of indicators, and complex node-based editors where you wire
                everything together yourself.
              </p>
              <p>
                The result? You spend hours learning the tool before you can test a single idea.
                Configuration becomes the bottleneck — not your strategy.
              </p>
              <p>
                For professional quant developers, that flexibility makes sense. But for traders who
                want to automate a strategy and test it in MT5, it&apos;s overkill.
              </p>
            </div>
          </section>

          {/* AlgoStudio's approach */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">AlgoStudio&apos;s approach</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Templates, not blank canvases
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Every project starts with a working strategy. You don&apos;t build from scratch —
                  you refine. Pick a template, adjust what matters, export.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Sensible defaults, not 50 fields
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Each template exposes only the settings that matter: risk %, stop loss, take
                  profit, and strategy-specific parameters. Everything else has sensible defaults.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Clean output, not a black box
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  You get readable, well-commented MQL5 source code. Understand exactly what your EA
                  does. Edit it if you want. It&apos;s not locked behind a platform.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Minutes, not hours</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Most users export their first EA in under 5 minutes. There&apos;s no learning
                  curve, no tutorial series, no certification. Pick a template and go.
                </p>
              </div>
            </div>
          </section>

          {/* Who benefits */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">Who benefits from simplicity</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Traders new to automation",
                  desc: "You've never built an EA before. AlgoStudio removes the coding barrier and the complexity of traditional EA builders.",
                },
                {
                  title: "Traders who want fast iteration",
                  desc: "You want to test ideas quickly. Export an EA in minutes, backtest it, adjust, repeat. No multi-day setup.",
                },
                {
                  title: "Experienced traders who value their time",
                  desc: "You could code it yourself, but you'd rather spend 5 minutes in AlgoStudio and get back to trading.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Simplicity ≠ limited */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">
              Simplicity doesn&apos;t mean limited
            </h2>
            <div className="text-[#94A3B8] leading-relaxed space-y-4">
              <p>
                Every template includes real risk management: ATR-based stop losses, risk-reward
                take profits, and percentage-based position sizing. Optional advanced settings add
                trend filters, session timing, and trailing stops.
              </p>
              <p>
                And because you get the MQL5 source code, you&apos;re never locked in. Export from
                AlgoStudio, then customize further in MetaEditor if you need to. The simplicity is
                the starting point, not the ceiling.
              </p>
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Experience the simplest EA builder"
        description="Pick a template, adjust a few settings, export clean MQL5 code. Free to start."
      />

      <Footer />
    </div>
  );
}
