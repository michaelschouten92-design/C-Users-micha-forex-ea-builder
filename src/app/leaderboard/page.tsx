import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { LeaderboardTable } from "./leaderboard-table";

export const metadata: Metadata = {
  title: "Live EA Leaderboard | AlgoStudio",
  description:
    "See the top-performing Expert Advisors built with AlgoStudio. Real performance data from live trading accounts.",
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#0D0117]">
      <SiteNav />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Live EA Leaderboard</h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Real performance data from live trading accounts. Only EAs with 50+ trades are shown
              for statistical significance. All data is anonymized.
            </p>
          </div>

          <LeaderboardTable />

          {/* Opt-in CTA */}
          <div className="mt-12 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-3">Want Your EA on the Leaderboard?</h2>
            <p className="text-[#94A3B8] text-sm mb-4 max-w-lg mx-auto">
              Enable leaderboard visibility in your account settings. Your EA name will be
              anonymized and only aggregate performance metrics are shown.
            </p>
            <a
              href="/app/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Go to Settings
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
