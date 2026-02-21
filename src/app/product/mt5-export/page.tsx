import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Code Export — Clean MQL5 Code from AlgoStudio | AlgoStudio",
  description:
    "AlgoStudio exports clean, well-commented MQL5 source code. No dependencies. Compatible with any MT5 broker. Learn what you get and how it works.",
  alternates: { canonical: "/product/mt5-export" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Product", href: "/product" },
  { name: "MT5 Export", href: "/product/mt5-export" },
];

const faqItems = [
  {
    q: "What file format does AlgoStudio export?",
    a: "AlgoStudio exports a single .mq5 file — the standard source code format for MetaTrader 5 Expert Advisors. You compile it in MetaEditor to get a working .ex5 EA.",
  },
  {
    q: "Does the exported EA require any external libraries?",
    a: "No. The exported code is fully self-contained. No external DLLs, no libraries, no plugins. Just one .mq5 file.",
  },
  {
    q: "Can I edit the exported code?",
    a: "Yes. The code is clean, well-commented MQL5. Open it in MetaEditor or any text editor and modify it however you like.",
  },
  {
    q: "Does the EA include risk management?",
    a: "Yes. Every exported EA includes percentage-based position sizing, ATR-based stop loss, and configurable take profit ratios.",
  },
  {
    q: "Which brokers are supported?",
    a: "Any broker that supports MetaTrader 5. The exported EA uses standard MQL5 functions — no proprietary broker-specific code.",
  },
];

export default function MT5ExportPage() {
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
              Clean MQL5 code, ready for MetaTrader
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              AlgoStudio exports a single .mq5 file — clean, well-commented, and ready to compile.
              No dependencies, no proprietary formats. The code is yours.
            </p>
          </section>

          {/* What you get */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              What you get when you export
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">One .mq5 file</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  A single source code file with everything your EA needs. No external dependencies,
                  no library files, no include files. Open it in MetaEditor, press Compile, done.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Well-commented code</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Every section of the code is documented. Input parameters, initialization, entry
                  logic, exit logic, and risk management — all clearly explained in comments.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Built-in risk management</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Percentage-based position sizing, ATR-based stop loss, and configurable take
                  profit based on risk-reward ratio. No manual calculation needed.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Configurable inputs</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  All strategy parameters are exposed as MetaTrader input parameters. Adjust them
                  directly in MetaTrader without touching the code — perfect for optimization.
                </p>
              </div>
            </div>
          </section>

          {/* How export works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              How the export process works
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Build your strategy",
                  desc: "Choose a template and adjust settings in the AlgoStudio builder. Your strategy is validated in real-time.",
                },
                {
                  step: "2",
                  title: "Click Export",
                  desc: "AlgoStudio generates MQL5 source code based on your template and settings. The code is assembled from tested, pre-written modules.",
                },
                {
                  step: "3",
                  title: "Download your .mq5 file",
                  desc: "Save the file to your computer. Open it in MetaTrader 5's MetaEditor and press Compile to create your EA.",
                },
                {
                  step: "4",
                  title: "Backtest and trade",
                  desc: "Load the compiled EA in the MT5 Strategy Tester. Backtest across different markets and timeframes. Go live when ready.",
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

          {/* Code quality */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Code quality you can trust
            </h2>
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "100% valid MQL5",
                    desc: "Every exported file compiles without errors in MetaEditor.",
                  },
                  {
                    title: "No deprecated functions",
                    desc: "Uses modern MQL5 APIs and best practices.",
                  },
                  {
                    title: "Readable structure",
                    desc: "Clean function names, consistent formatting, logical code organization.",
                  },
                  {
                    title: "Tested modules",
                    desc: "Code is assembled from pre-tested modules. Each function is verified independently.",
                  },
                ].map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Start validating your strategy"
        description="Build, export, and validate your trading strategy with objective data. Free — no credit card required."
      />

      <Footer />
    </div>
  );
}
