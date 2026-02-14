import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Thank You — AlgoStudio Coaching",
  robots: { index: false, follow: false },
};

export default function CoachingThankYouPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Success icon */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[rgba(16,185,129,0.15)] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#10B981]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Payment confirmed!</h1>
            <p className="text-lg text-[#94A3B8]">
              Thank you for purchasing a coaching pack. Follow the steps below to book your
              sessions.
            </p>
          </div>

          {/* Steps */}
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.2)] rounded-xl p-6 md:p-8 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Next steps</h2>
            <ol className="space-y-6">
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-[#4F46E5] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </span>
                <div>
                  <h3 className="text-white font-medium mb-1">Check your email</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    You&apos;ll receive a payment confirmation from Stripe. Keep this as your
                    receipt.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-[#4F46E5] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </span>
                <div>
                  <h3 className="text-white font-medium mb-1">Send us your receipt</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Forward your Stripe receipt to{" "}
                    <a
                      href="mailto:support@algo-studio.com"
                      className="text-[#22D3EE] hover:underline"
                    >
                      support@algo-studio.com
                    </a>
                    . We&apos;ll set up your sessions within 24 hours.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-[#4F46E5] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </span>
                <div>
                  <h3 className="text-white font-medium mb-1">Receive your booking link</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    We&apos;ll send you a personal booking link so you can schedule your sessions at
                    your own pace.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-[#4F46E5] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  4
                </span>
                <div>
                  <h3 className="text-white font-medium mb-1">Prepare for your session</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Come with your questions, a strategy to review, or a bot you want to build. The
                    more specific, the more we can cover in 60 minutes.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Contact info */}
          <div className="bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 text-center mb-8">
            <p className="text-sm text-[#94A3B8]">
              Questions? Reach out at{" "}
              <a href="mailto:support@algo-studio.com" className="text-[#22D3EE] hover:underline">
                support@algo-studio.com
              </a>
            </p>
          </div>

          {/* Back link */}
          <div className="text-center">
            <Link
              href="/coaching"
              className="text-sm text-[#A78BFA] hover:text-[#C4B5FD] transition-colors"
            >
              &larr; Back to coaching
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
