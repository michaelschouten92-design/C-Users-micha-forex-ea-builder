import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { CoachingCalEmbed } from "./cal-embed";

export const metadata: Metadata = {
  title: "1-on-1 Coaching — AlgoStudio",
  description:
    "Book a private 60-minute coaching session. Get expert strategy review, build guidance, and trading fundamentals for MT5 bot builders.",
  alternates: { canonical: "/coaching" },
  openGraph: {
    title: "1-on-1 Expert Coaching — AlgoStudio",
    description:
      "Private 60-minute sessions with screen sharing. Strategy review, build guidance, and trading fundamentals.",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Coaching", href: "/coaching" },
];

const faqItems = [
  {
    q: "What topics can we cover?",
    a: "Anything related to algorithmic trading and MT5 bot building. That includes strategy review and optimization, hands-on build guidance in AlgoStudio, and trading fundamentals like risk management, backtesting, and MT5 setup.",
  },
  {
    q: "How does the session work?",
    a: "Sessions take place via video call with screen sharing. You book a time slot, pay securely through Stripe, and at the scheduled time we start a private 1-on-1 call. Come with questions, a strategy to review, or a bot you want to build — or all three.",
  },
  {
    q: "What's included in a package deal?",
    a: "The 3-Session Pack (€479) and 5-Session Pack (€749) give you sessions at a discounted per-session rate. After purchasing a pack, email us at support@algo-studio.com with your receipt and we'll set up your sessions. You can book them at your own pace.",
  },
  {
    q: "What's the difference between Elite strategy reviews and paid coaching?",
    a: "Elite members get 1 complimentary strategy review per month as part of their subscription. Paid coaching sessions are deeper, longer (60 minutes), fully on-demand, and available to anyone — not just Elite members. Think of Elite reviews as a perk and coaching as a dedicated deep-dive.",
  },
  {
    q: "Can I get a refund?",
    a: "If you need to reschedule, you can do so up to 24 hours before your session. Cancellations made more than 24 hours in advance are eligible for a full refund. No-shows and late cancellations are non-refundable.",
  },
  {
    q: "Do I need to be an AlgoStudio user?",
    a: "No. Coaching sessions are open to anyone interested in MT5 algorithmic trading. That said, if you're using AlgoStudio, we can make the session much more hands-on by working directly in the platform together.",
  },
];

export default function CoachingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd(breadcrumbs), faqJsonLd(faqItems)]),
        }}
      />

      <SiteNav />

      <main className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* ================================================================ */}
          {/* HERO                                                             */}
          {/* ================================================================ */}
          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              1-on-1 Expert Coaching for MT5 Bot Builders
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              Get personalized guidance on strategy optimization, hands-on build help, and
              accelerated learning — all in a private 60-minute video session.
            </p>
            <a
              href="#book"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Book a Session
            </a>
          </section>

          {/* ================================================================ */}
          {/* WHAT YOU GET                                                      */}
          {/* ================================================================ */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white text-center mb-10">What you get</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Strategy Review",
                  description:
                    "Review and optimization of your trading strategies and bots. We'll go through your logic, identify improvements, and fine-tune parameters.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  ),
                },
                {
                  title: "Build Guidance",
                  description:
                    "Hands-on help building in AlgoStudio. We'll walk through features together, set up your project, and get your bot export-ready.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  ),
                },
                {
                  title: "Trading Fundamentals",
                  description:
                    "Risk management, backtesting methodology, MT5 setup, and core trading concepts — tailored to your experience level.",
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  ),
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
                >
                  <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-5 h-5 text-[#A78BFA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ================================================================ */}
          {/* HOW IT WORKS                                                     */}
          {/* ================================================================ */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white text-center mb-10">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Pick a time slot",
                  description:
                    "Select an available moment in the calendar below. Sessions are 60 minutes.",
                },
                {
                  step: "2",
                  title: "Pay securely",
                  description: "€179 per session via Stripe — or buy a bundle and save up to 16%.",
                },
                {
                  step: "3",
                  title: "Join the call",
                  description:
                    "At the scheduled time, we start a private 1-on-1 video call with screen sharing.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-sm font-bold text-[#A78BFA]">{item.step}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ================================================================ */}
          {/* PRICING CARDS                                                    */}
          {/* ================================================================ */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white text-center mb-10">Pricing</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Single Session */}
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 flex flex-col">
                <h3 className="text-base font-semibold text-white mb-1">Single Session</h3>
                <p className="text-sm text-[#64748B] mb-4">One 60-minute session</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">€179</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    60-minute private session
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    Video call + screen sharing
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    Any topic
                  </li>
                </ul>
                <a
                  href="#book"
                  className="block text-center bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
                >
                  Book Session
                </a>
              </div>

              {/* 3-Pack */}
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.3)] rounded-xl p-6 flex flex-col relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4F46E5] text-white text-xs font-medium px-3 py-1 rounded-full">
                  Save 11%
                </span>
                <h3 className="text-base font-semibold text-white mb-1">3-Session Pack</h3>
                <p className="text-sm text-[#64748B] mb-4">€160 per session</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">€479</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    3 sessions (60 min each)
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    Book at your own pace
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    Save €58 vs single sessions
                  </li>
                </ul>
                <a
                  href="https://buy.stripe.com/28E00j8pv2cV54X2S8f3a01"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
                >
                  Buy 3-Pack
                </a>
              </div>

              {/* 5-Pack */}
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.3)] rounded-xl p-6 flex flex-col relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#22D3EE] text-[#0D0117] text-xs font-medium px-3 py-1 rounded-full">
                  Best Value — Save 16%
                </span>
                <h3 className="text-base font-semibold text-white mb-1">5-Session Pack</h3>
                <p className="text-sm text-[#64748B] mb-4">€150 per session</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">€749</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    5 sessions (60 min each)
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    Book at your own pace
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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
                    Save €146 vs single sessions
                  </li>
                </ul>
                <a
                  href="https://buy.stripe.com/dRm7sL9tz7xf0OH8csf3a02"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
                >
                  Buy 5-Pack
                </a>
              </div>
            </div>
            <p className="text-center text-sm text-[#64748B] mt-6">
              Elite members get 1 complimentary strategy review per month.{" "}
              <Link href="/pricing" className="text-[#22D3EE] hover:underline">
                Learn more &rarr;
              </Link>
            </p>
          </section>

          {/* ================================================================ */}
          {/* CAL.COM BOOKING EMBED                                            */}
          {/* ================================================================ */}
          <section id="book" className="mb-20">
            <h2 className="text-2xl font-bold text-white text-center mb-4">Book your session</h2>
            <p className="text-[#94A3B8] text-center mb-8 max-w-lg mx-auto">
              Choose a time that works for you. Payment is handled securely through Stripe at
              checkout.
            </p>
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-4 min-h-[500px]">
              <CoachingCalEmbed />
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Ready to level up your trading?"
        description="Get personalized expert guidance in a private 1-on-1 session. Strategy review, build help, and trading fundamentals — all tailored to you."
        ctaText="Book Your First Session"
        ctaHref="/coaching#book"
      />

      <Footer />
    </div>
  );
}
