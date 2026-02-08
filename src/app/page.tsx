import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PLANS, formatPrice } from "@/lib/plans";
import { MobileNav } from "@/components/mobile-nav";

export const metadata: Metadata = {
  title: "AlgoStudio - No-Code MT5 Expert Advisor Builder",
  description:
    "Build, test, and export MetaTrader 5 Expert Advisors without writing code. Visual drag-and-drop strategy builder for forex trading bots.",
  alternates: { canonical: "/" },
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
      "No-code visual builder for MetaTrader 5 Expert Advisors. Build, test, and export trading bots without writing code.",
    url: "https://algo-studio.com",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "49",
      priceCurrency: "EUR",
      offerCount: 3,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do I need coding experience to use AlgoStudio?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. AlgoStudio is a visual drag-and-drop builder. You create strategies by connecting blocks — no MQL5, Python, or any other programming knowledge required.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use the exported EA in live trading?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. You can backtest it in the MT5 Strategy Tester and run it on any broker that supports MT5.",
        },
      },
      {
        "@type": "Question",
        name: "What indicators does AlgoStudio support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AlgoStudio supports Moving Average (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX, Stochastic, candlestick patterns, support/resistance zones, and range breakouts.",
        },
      },
    ],
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
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0D0117]/80 backdrop-blur-md border-b border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">AlgoStudio</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=register"
              className="text-sm bg-[#4F46E5] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
            >
              Start Free
            </Link>
          </div>
          <MobileNav />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">No coding required</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Build Trading Bots
            <br />
            <span className="text-[#A78BFA]">Without Code</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10">
            Create professional MetaTrader 5 Expert Advisors with our visual strategy builder.
            Design, test, and export your trading algorithms in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=register"
              className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building Free
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
            >
              View Pricing
            </Link>
          </div>

          {/* Builder Preview Screenshot */}
          <div className="mt-16 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-4 bg-gradient-to-r from-[#4F46E5]/20 via-[#A78BFA]/20 to-[#22D3EE]/20 blur-3xl -z-10" />

            {/* Browser mockup */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl overflow-hidden shadow-2xl shadow-[#4F46E5]/10">
              {/* Browser header */}
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

              {/* Demo screenshot */}
              <Image
                src="/demo-screenshot.png"
                alt="AlgoStudio visual strategy builder interface"
                width={3830}
                height={1820}
                className="w-full"
                quality={95}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything you need to automate your trading
            </h2>
            <p className="text-[#94A3B8] max-w-xl mx-auto">
              Professional tools, simplified for everyone
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Visual Strategy Builder</h3>
              <p className="text-sm text-[#94A3B8]">
                Drag and drop indicators, conditions, and actions. Build complex strategies without
                touching code.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">One-Click Export</h3>
              <p className="text-sm text-[#94A3B8]">
                Export your strategy directly to MetaTrader 5. Get compiled EA files ready to trade.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fast Iteration</h3>
              <p className="text-sm text-[#94A3B8]">
                Make changes instantly. Test ideas quickly without recompiling manually.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
            <p className="text-[#94A3B8]">From idea to live trading in three steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Design Your Strategy</h3>
              <p className="text-sm text-[#94A3B8]">
                Use our visual builder to define entry and exit conditions with technical
                indicators.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Configure Parameters</h3>
              <p className="text-sm text-[#94A3B8]">
                Set risk management, lot sizes, and trading hours to match your style.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Export & Trade</h3>
              <p className="text-sm text-[#94A3B8]">
                Download your EA file and load it into MetaTrader 5. Start trading.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Do I need coding experience?",
                a: "No. AlgoStudio is a visual drag-and-drop builder. You create strategies by connecting blocks — no MQL5, Python, or any other programming knowledge required.",
              },
              {
                q: "What do I get with the free plan?",
                a: "You get full access to the visual builder with up to 3 projects and 2 MQL5 exports per month. No credit card required.",
              },
              {
                q: "Can I use the exported EA in live trading?",
                a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. You can backtest it in the MT5 Strategy Tester and run it on any broker that supports MT5.",
              },
              {
                q: "What indicators are supported?",
                a: "We support Moving Average (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX, Stochastic, candlestick patterns, support/resistance zones, and range breakouts. More are added regularly.",
              },
              {
                q: "Can I cancel my subscription anytime?",
                a: "Yes. You can cancel at any time from your account settings. Your access continues until the end of your billing period.",
              },
              {
                q: "Is the generated MQL5 code editable?",
                a: "Yes. You get clean, well-commented MQL5 source code that you can modify in MetaEditor if you want to customize it further.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-white font-medium text-sm list-none">
                  {item.q}
                  <svg
                    className="w-5 h-5 text-[#64748B] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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

      {/* Pricing Preview */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Simple pricing</h2>
            <p className="text-[#94A3B8]">Start free, upgrade when you need more</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white">{PLANS.FREE.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-white">€0</span>
              </div>
              <ul className="space-y-2 text-sm text-[#94A3B8] mb-6">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  Up to 3 projects
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  Visual builder
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  2 exports/month
                </li>
              </ul>
              <Link
                href="/login?mode=register"
                className="block w-full text-center py-2.5 border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] rounded-lg text-sm font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Starter */}
            <div className="bg-[#1A0626] border-2 border-[#4F46E5] rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#4F46E5] text-white text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{PLANS.STARTER.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-white">
                  {formatPrice(PLANS.STARTER.prices!.monthly.amount, "eur")}
                </span>
                <span className="text-[#64748B] text-sm">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-[#94A3B8] mb-6">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  Up to 15 projects
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  10 exports/month
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  MQL5 source code
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center py-2.5 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#6366F1] transition-colors"
              >
                View Plans
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white">{PLANS.PRO.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-white">
                  {formatPrice(PLANS.PRO.prices!.monthly.amount, "eur")}
                </span>
                <span className="text-[#64748B] text-sm">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-[#94A3B8] mb-6">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  Unlimited everything
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  MQL5 source code
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#22D3EE]"
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
                  Priority support
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center py-2.5 border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] rounded-lg text-sm font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to automate your trading?</h2>
          <p className="text-[#94A3B8] mb-8">
            Join traders who build their own Expert Advisors without writing code.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Start Building Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login?mode=register"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Register
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:contact@algo-studio.com"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    contact@algo-studio.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Community</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://whop.com/algostudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Whop
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[rgba(79,70,229,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-[#64748B]">
              © {new Date().getFullYear()} AlgoStudio. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
