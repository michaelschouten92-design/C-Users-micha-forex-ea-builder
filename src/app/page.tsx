import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "AlgoStudio — The Control Layer for Live Algorithmic Strategies",
  description:
    "Deterministic lifecycle governance for live algorithmic trading. Enforce RUN/PAUSE/STOP decisions, detect structural deviation, and maintain audit-grade verification.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — The Control Layer for Live Algorithmic Strategies",
    description:
      "Deterministic lifecycle governance for live algorithmic trading. Enforce RUN/PAUSE/STOP decisions, detect structural deviation, and maintain audit-grade verification.",
  },
};

const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "Proof", href: "/verified" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
] as const;

const CTA_HREF = "/register";
const DOCS_HREF = "/docs";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-[#0D0117] text-white">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0117]/80 backdrop-blur-md border-b border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            AlgoStudio
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#94A3B8] hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href={CTA_HREF}
              className="text-sm font-medium px-5 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Establish Control
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ── A) HERO ── */}
        <section className="pt-36 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              The Control Layer for Live
              <br />
              Algorithmic Strategies.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#94A3B8] max-w-3xl mx-auto leading-relaxed">
              Backtests do not govern live capital.
              <br className="hidden md:block" />
              AlgoStudio enforces deterministic lifecycle authority when real-world performance
              diverges from its validated statistical behavior.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={CTA_HREF}
                className="px-8 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors text-base"
              >
                Establish Control
              </Link>
              <a
                href="#architecture"
                className="px-8 py-3 border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] font-medium rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors text-base"
              >
                View Architecture
              </a>
            </div>
          </div>
        </section>

        {/* ── B) THE PROBLEM ── */}
        <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.05)]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center">
              Most Strategies Don&apos;t Fail Loudly. They Decay.
            </h2>
            <div className="mt-8 text-[#94A3B8] text-lg leading-relaxed space-y-6">
              <p>
                Live markets evolve. Edges erode. Regimes shift.
                <br />
                Yet most strategies continue trading — not because they remain justified, but
                because no structural control layer exists.
              </p>
              <p>Monitoring notifies. It does not decide.</p>
              <p className="text-[#CBD5E1] font-medium">The real risk is silent continuation.</p>
            </div>
          </div>
        </section>

        {/* ── C) THE SHIFT ── */}
        <section className="py-20 px-6 bg-[#1A0626]/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Control Must Be Structural.</h2>
            <p className="mt-8 text-[#94A3B8] text-lg leading-relaxed">
              Not emotional. Not discretionary. Not reactive. Structural.
            </p>
            <p className="mt-4 text-[#94A3B8] text-lg leading-relaxed">
              AlgoStudio exists to introduce deterministic lifecycle governance between your
              strategy and your capital.
            </p>
          </div>
        </section>

        {/* ── D) CONTROL ARCHITECTURE ── */}
        <section id="architecture" className="py-20 px-6 scroll-mt-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">The Strategy Stack</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Traditional */}
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <span className="text-xs font-medium tracking-wider uppercase text-[#64748B]">
                  Traditional
                </span>
                <div className="mt-6 flex flex-col items-center gap-3">
                  <span className="text-[#CBD5E1] font-mono text-sm">Strategy</span>
                  <span className="text-[#64748B]">↓</span>
                  <span className="text-[#CBD5E1] font-mono text-sm">Broker</span>
                  <span className="text-[#64748B]">↓</span>
                  <span className="text-[#CBD5E1] font-mono text-sm">Capital</span>
                </div>
                <p className="mt-6 text-sm text-[#64748B] text-center">No governing authority.</p>
              </div>

              {/* AlgoStudio Model */}
              <div className="rounded-xl border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.05)] p-8">
                <span className="text-xs font-medium tracking-wider uppercase text-[#A78BFA]">
                  AlgoStudio Model
                </span>
                <div className="mt-6 flex flex-col items-center gap-3">
                  <span className="text-[#CBD5E1] font-mono text-sm">Strategy</span>
                  <span className="text-[#A78BFA]">↓</span>
                  <span className="px-4 py-2 rounded-lg border border-[rgba(79,70,229,0.4)] bg-[rgba(79,70,229,0.1)] text-[#A78BFA] font-mono text-sm font-medium">
                    Control Layer (AlgoStudio)
                  </span>
                  <span className="text-[#A78BFA]">↓</span>
                  <span className="text-[#CBD5E1] font-mono text-sm">Broker</span>
                  <span className="text-[#A78BFA]">↓</span>
                  <span className="text-[#CBD5E1] font-mono text-sm">Capital</span>
                </div>
                <p className="mt-6 text-sm text-[#94A3B8] text-center">
                  The strategy executes. The control layer decides.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── E) THREE FOUNDATIONS ── */}
        <section className="py-20 px-6 bg-[#1A0626]/30">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <h3 className="text-lg font-bold text-white">Deterministic Authority</h3>
                <p className="mt-4 text-[#94A3B8] text-sm leading-relaxed">
                  Explicit RUN / PAUSE / STOP lifecycle decisions — rule-based, not emotional.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <h3 className="text-lg font-bold text-white">Structural Deviation Monitoring</h3>
                <p className="mt-4 text-[#94A3B8] text-sm leading-relaxed">
                  Continuous evaluation of live statistical behavior versus validated assumptions.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <h3 className="text-lg font-bold text-white">Audit-Grade Verification</h3>
                <p className="mt-4 text-[#94A3B8] text-sm leading-relaxed">
                  Cryptographically recorded, reproducible lifecycle decisions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── F) HOW IT WORKS ── */}
        <section id="how-it-works" className="py-20 px-6 scroll-mt-16">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-10">
              {[
                "Anchor governance to validated statistical baselines",
                "Detect structural live deviation",
                "Enforce lifecycle decisions",
                "Log every transition",
              ].map((step, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <span className="flex-shrink-0 w-10 h-10 rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                    {i + 1}
                  </span>
                  <p className="text-lg text-[#CBD5E1] pt-1.5">{step}</p>
                </div>
              ))}
            </div>
            <p className="mt-14 text-center text-[#94A3B8] text-base">
              Control without auditability is opinion. AlgoStudio provides both.
            </p>
          </div>
        </section>

        {/* ── G) WHO IT'S FOR ── */}
        <section className="py-20 px-6 bg-[#1A0626]/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">
              Built for Operators.
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <h3 className="text-sm font-medium tracking-wider uppercase text-[#A78BFA] mb-6">
                  Built for
                </h3>
                <ul className="space-y-4 text-[#CBD5E1] text-sm">
                  <li className="flex gap-3 items-start">
                    <span className="text-[#A78BFA] mt-0.5">—</span>
                    Systematic traders running live strategies
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-[#A78BFA] mt-0.5">—</span>
                    Fund managers overseeing algorithmic portfolios
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-[#A78BFA] mt-0.5">—</span>
                    Prop firm traders operating rule-based systems
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <h3 className="text-sm font-medium tracking-wider uppercase text-[#64748B] mb-6">
                  Not designed for
                </h3>
                <ul className="space-y-4 text-[#64748B] text-sm">
                  <li className="flex gap-3 items-start">
                    <span className="mt-0.5">—</span>
                    Signal chasing
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="mt-0.5">—</span>
                    Blind trust in backtests
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="mt-0.5">—</span>
                    Emotional override of statistical thresholds
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="mt-0.5">—</span>
                    Discretion over discipline
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-10 text-center text-[#94A3B8] text-base">
              If you treat algorithmic trading as infrastructure — you are the intended operator.
            </p>
          </div>
        </section>

        {/* ── H) INSTITUTIONAL CLOSING ── */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-lg md:text-xl text-[#94A3B8] leading-relaxed space-y-6">
              <p>
                Execution is not governance. Validation is not authority.
                <br />
                Monitoring is not control.
              </p>
              <p className="text-[#CBD5E1]">
                Lifecycle governance is the next standard in algorithmic trading.
              </p>
              <p className="text-[#CBD5E1]">AlgoStudio is built for that standard.</p>
            </div>
          </div>
        </section>

        {/* ── I) FINAL CTA ── */}
        <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Establish Deterministic Control.</h2>
            <p className="mt-4 text-[#94A3B8] text-lg">
              Start governing your live strategies today.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={CTA_HREF}
                className="px-8 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors text-base"
              >
                Create Account
              </Link>
              <Link
                href={DOCS_HREF}
                className="px-8 py-3 border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] font-medium rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors text-base"
              >
                Explore Documentation
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
