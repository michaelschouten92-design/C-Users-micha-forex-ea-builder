import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Build an MT5 Expert Advisor Without Coding | AlgoStudio",
  description:
    "Build a MetaTrader 5 Expert Advisor without writing code. Pick a strategy template, adjust a few settings, and export clean MQL5. No programming experience needed.",
  alternates: { canonical: "/build-mt5-expert-advisor-without-coding" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Build MT5 EA Without Coding", href: "/build-mt5-expert-advisor-without-coding" },
];

const faqItems = [
  {
    q: "Can I really build an EA without coding?",
    a: "Yes. AlgoStudio uses strategy templates with pre-built logic. You adjust 3-5 settings and export a fully functional .mq5 Expert Advisor. No MQL5 knowledge required.",
  },
  {
    q: "What does 'no coding required' actually mean?",
    a: "It means you never write or see code while building your EA. You choose a strategy, set parameters like risk % and stop loss, and AlgoStudio generates the MQL5 code for you.",
  },
  {
    q: "Is the output real MQL5 code?",
    a: "Yes. AlgoStudio exports standard .mq5 source code that compiles in MetaEditor and runs on any MT5 broker. It's not a proprietary format.",
  },
  {
    q: "What strategies can I build without coding?",
    a: "AlgoStudio includes 5 templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover. Each covers a different trading approach.",
  },
  {
    q: "How long does it take?",
    a: "Most users export their first EA in under 5 minutes. Choose a template, adjust settings, export. That's it.",
  },
  {
    q: "Is it free?",
    a: "The free plan gives you access to all templates, the full builder, 1 project, and 1 export per month. No credit card required.",
  },
];

export default function BuildWithoutCodingPage() {
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
              Build an MT5 Expert Advisor without coding
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              You don&apos;t need to learn MQL5 to automate your trading strategy. AlgoStudio lets
              you build a real MetaTrader 5 Expert Advisor using templates — no programming
              required.
            </p>
            <Link
              href="/login?mode=register"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building Free
            </Link>
          </section>

          {/* Why no-code matters */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">
              Why a no-code approach works for EA building
            </h2>
            <div className="space-y-6 text-[#94A3B8] leading-relaxed">
              <p>
                MQL5 is a powerful language, but it has a steep learning curve. Most traders want to
                automate a strategy — not become a programmer. AlgoStudio bridges that gap.
              </p>
              <p>
                Instead of learning syntax, debugging compile errors, and writing hundreds of lines
                of code, you pick a proven strategy template and adjust a few settings. AlgoStudio
                generates clean, well-commented MQL5 code that compiles and runs immediately.
              </p>
            </div>
          </section>

          {/* How it works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">How it works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Choose a template</h3>
                <p className="text-sm text-[#94A3B8]">
                  Pick from 5 proven strategies. Each comes with sensible defaults that work out of
                  the box.
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Adjust settings</h3>
                <p className="text-sm text-[#94A3B8]">
                  Set risk %, stop loss, and take profit. 3-5 settings total. No coding, no complex
                  configuration.
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Export MQL5</h3>
                <p className="text-sm text-[#94A3B8]">
                  Download clean .mq5 code. Load it into MetaTrader 5, backtest, and go live when
                  ready.
                </p>
              </div>
            </div>
            <p className="text-center mt-8">
              <Link
                href="/product/how-it-works"
                className="text-sm text-[#A78BFA] font-medium hover:underline"
              >
                Detailed walkthrough &rarr;
              </Link>
            </p>
          </section>

          {/* Templates */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">Available strategy templates</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "EMA Crossover", type: "Trend Following", color: "#A78BFA" },
                { name: "RSI Reversal", type: "Mean Reversion", color: "#22D3EE" },
                { name: "Range Breakout", type: "Breakout", color: "#F59E0B" },
                { name: "Trend Pullback", type: "Trend Following", color: "#34D399" },
                { name: "MACD Crossover", type: "Momentum", color: "#F472B6" },
              ].map((t) => (
                <div
                  key={t.name}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                      {t.type}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{t.name}</h3>
                </div>
              ))}
            </div>
            <p className="text-center mt-8">
              <Link
                href="/templates"
                className="text-sm text-[#A78BFA] font-medium hover:underline"
              >
                View template details &rarr;
              </Link>
            </p>
          </section>

          {/* What you get */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">
              What you get — without writing a line of code
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Standard .mq5 file",
                  desc: "A real MetaTrader 5 Expert Advisor source file. Compiles in MetaEditor, runs on any MT5 broker.",
                },
                {
                  title: "Built-in risk management",
                  desc: "ATR-based stop loss, risk-reward take profit, and percentage-based position sizing.",
                },
                {
                  title: "Clean, readable code",
                  desc: "Well-commented MQL5 source code. Understand what it does, modify it if you want.",
                },
                {
                  title: "No dependencies",
                  desc: "One self-contained file. No external libraries, no plugins, no proprietary formats.",
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
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Build your first EA — no coding required"
        description="Pick a template and export clean MQL5 code in minutes. Free to start."
      />

      <Footer />
    </div>
  );
}
