import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PLANS, formatPrice } from "@/lib/plans";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  return (
    <div id="main-content" className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0D0117]/80 backdrop-blur-md border-b border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">AlgoStudio</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/login?mode=register"
              className="text-sm bg-[#4F46E5] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
            >
              Start Free
            </Link>
          </div>
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

          {/* Builder Preview */}
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
                    algostudio.app/builder
                  </div>
                </div>
              </div>

              {/* Builder UI mockup */}
              <div className="p-3 flex gap-3 min-h-[250px] md:min-h-[300px] overflow-hidden">
                {/* Left sidebar - Components */}
                <div className="hidden lg:block w-40 flex-shrink-0 bg-[#0D0117]/50 rounded-lg p-3 border border-[rgba(79,70,229,0.1)]">
                  <div className="text-xs text-[#64748B] mb-3 font-medium">Components</div>
                  <div className="space-y-2">
                    <div className="bg-[#1A0626] rounded px-3 py-2 text-xs text-[#94A3B8] border border-[rgba(79,70,229,0.2)] cursor-default">
                      Moving Average
                    </div>
                    <div className="bg-[#1A0626] rounded px-3 py-2 text-xs text-[#94A3B8] border border-[rgba(79,70,229,0.2)] cursor-default">
                      RSI
                    </div>
                    <div className="bg-[#1A0626] rounded px-3 py-2 text-xs text-[#94A3B8] border border-[rgba(79,70,229,0.2)] cursor-default">
                      MACD
                    </div>
                    <div className="bg-[#1A0626] rounded px-3 py-2 text-xs text-[#94A3B8] border border-[rgba(79,70,229,0.2)] cursor-default">
                      Bollinger Bands
                    </div>
                    <div className="bg-[#4F46E5]/20 rounded px-3 py-2 text-xs text-[#A78BFA] border border-[#4F46E5]/40 cursor-default">
                      + Add Condition
                    </div>
                  </div>
                </div>

                {/* Main canvas */}
                <div className="flex-1 min-w-0 bg-[#0D0117]/30 rounded-lg p-4 border border-[rgba(79,70,229,0.1)] relative overflow-hidden">
                  {/* Grid pattern */}
                  <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'radial-gradient(circle, #A78BFA 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }} />

                  {/* Strategy blocks */}
                  <div className="relative space-y-3">
                    {/* Entry condition block */}
                    <div className="bg-[#1A0626] rounded-lg p-3 border border-[#22D3EE]/30 shadow-lg shadow-[#22D3EE]/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                        <span className="text-xs font-medium text-[#22D3EE]">Entry Condition</span>
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        MA(20) crosses above MA(50)
                      </div>
                    </div>

                    {/* Connector line */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-[#22D3EE]/50 to-[#4F46E5]/50" />
                    </div>

                    {/* Filter block */}
                    <div className="bg-[#1A0626] rounded-lg p-3 border border-[#A78BFA]/30 shadow-lg shadow-[#A78BFA]/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#A78BFA]" />
                        <span className="text-xs font-medium text-[#A78BFA]">Filter</span>
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        RSI(14) {"<"} 70
                      </div>
                    </div>

                    {/* Connector line */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-[#A78BFA]/50 to-[#22C55E]/50" />
                    </div>

                    {/* Action block */}
                    <div className="bg-[#1A0626] rounded-lg p-3 border border-[#22C55E]/30 shadow-lg shadow-[#22C55E]/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                        <span className="text-xs font-medium text-[#22C55E]">Action</span>
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        Buy 0.1 lots with 50 pip SL
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right sidebar - Properties */}
                <div className="hidden xl:block w-48 flex-shrink-0 bg-[#0D0117]/50 rounded-lg p-3 border border-[rgba(79,70,229,0.1)]">
                  <div className="text-xs text-[#64748B] mb-3 font-medium">Properties</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-[#64748B] block mb-1">Stop Loss</label>
                      <div className="bg-[#1A0626] rounded px-3 py-1.5 text-xs text-white border border-[rgba(79,70,229,0.2)]">
                        50 pips
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] block mb-1">Take Profit</label>
                      <div className="bg-[#1A0626] rounded px-3 py-1.5 text-xs text-white border border-[rgba(79,70,229,0.2)]">
                        100 pips
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748B] block mb-1">Lot Size</label>
                      <div className="bg-[#1A0626] rounded px-3 py-1.5 text-xs text-white border border-[rgba(79,70,229,0.2)]">
                        0.1
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="bg-[#4F46E5] rounded-lg px-3 py-2 text-xs text-white text-center font-medium">
                        Export EA
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                <svg className="w-6 h-6 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Visual Strategy Builder</h3>
              <p className="text-sm text-[#94A3B8]">
                Drag and drop indicators, conditions, and actions. Build complex strategies without touching code.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                <svg className="w-6 h-6 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
            <h2 className="text-3xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-[#94A3B8]">
              From idea to live trading in three steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Design Your Strategy</h3>
              <p className="text-sm text-[#94A3B8]">
                Use our visual builder to define entry and exit conditions with technical indicators.
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

      {/* Pricing Preview */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Simple pricing
            </h2>
            <p className="text-[#94A3B8]">
              Start free, upgrade when you need exports
            </p>
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
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited projects
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Visual builder
                </li>
                <li className="flex items-center gap-2 text-[#64748B]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  No exports
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
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white">{PLANS.STARTER.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-white">{formatPrice(PLANS.STARTER.prices!.monthly.amount, "eur")}</span>
                <span className="text-[#64748B] text-sm">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-[#94A3B8] mb-6">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Up to 3 projects
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  5 exports/month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  MQL5 source code
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center py-2.5 border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] rounded-lg text-sm font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                View Plans
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[#1A0626] border-2 border-[#4F46E5] rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#4F46E5] text-white text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{PLANS.PRO.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-white">{formatPrice(PLANS.PRO.prices!.monthly.amount, "eur")}</span>
                <span className="text-[#64748B] text-sm">/mo</span>
              </div>
              <ul className="space-y-2 text-sm text-[#94A3B8] mb-6">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited everything
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  MQL5 source code
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center py-2.5 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#6366F1] transition-colors"
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
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to automate your trading?
          </h2>
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
      <footer className="py-8 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-[#64748B]">
            © {new Date().getFullYear()} AlgoStudio. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
