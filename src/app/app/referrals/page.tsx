"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";

interface ReferralStats {
  total: number;
  active: number;
  pending: number;
}

interface Referral {
  id: string;
  email: string;
  date: string;
  status: "active" | "pending";
}

interface ReferralData {
  referralCode: string;
  stats: ReferralStats;
  referrals: Referral[];
}

export default function ReferralsPage() {
  const { data, isLoading } = useSWR<ReferralData>("/api/referrals", fetcher);
  const [copied, setCopied] = useState(false);

  const referralLink = data?.referralCode ? `https://algostudio.io/?ref=${data.referralCode}` : "";

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareTwitter() {
    const text = encodeURIComponent(
      "I'm building automated trading strategies with AlgoStudio. Try it out:"
    );
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(
      `Check out AlgoStudio for building automated forex EAs: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function handleShareEmail() {
    const subject = encodeURIComponent("Try AlgoStudio - Visual EA Builder");
    const body = encodeURIComponent(
      `Hey,\n\nI've been using AlgoStudio to build automated trading strategies visually. You should try it:\n\n${referralLink}\n\nNo coding required!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors"
              >
                AlgoStudio
              </Link>
              <span className="text-[#7C8DB0]">/</span>
              <span className="text-[#94A3B8]">Referrals</span>
            </div>
            <Link href="/app" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-[#94A3B8] mb-8">
          Invite friends and earn rewards when they join AlgoStudio.
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 animate-pulse"
              >
                <div className="h-4 bg-[#1E293B] rounded w-1/3 mb-3" />
                <div className="h-3 bg-[#1E293B] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Referral Link */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Your Referral Link</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg px-4 py-3 text-sm text-[#22D3EE] font-mono truncate">
                  {referralLink || "Loading..."}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_16px_rgba(79,70,229,0.3)]"
                >
                  {copied ? (
                    <>
                      <svg
                        className="w-4 h-4"
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
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleShareTwitter}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] hover:text-white transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] hover:text-white transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={handleShareEmail}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] hover:text-white transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
                <p className="text-sm text-[#94A3B8] mb-1">Total Referrals</p>
                <p className="text-2xl font-bold text-white">{data?.stats.total ?? 0}</p>
              </div>
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
                <p className="text-sm text-[#94A3B8] mb-1">Active (Paid)</p>
                <p className="text-2xl font-bold text-[#22D3EE]">{data?.stats.active ?? 0}</p>
              </div>
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
                <p className="text-sm text-[#94A3B8] mb-1">Pending</p>
                <p className="text-2xl font-bold text-[#F59E0B]">{data?.stats.pending ?? 0}</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-gradient-to-r from-[#4F46E5]/10 via-[#A78BFA]/10 to-[#22D3EE]/10 border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">How It Works</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="bg-[#4F46E5] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </span>
                  <p className="text-sm text-[#CBD5E1]">
                    Share your unique referral link with friends and fellow traders.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-[#4F46E5] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </span>
                  <p className="text-sm text-[#CBD5E1]">
                    When they sign up using your link, they are linked to your account.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-[#4F46E5] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </span>
                  <p className="text-sm text-[#CBD5E1]">
                    <strong className="text-[#22D3EE]">Get 1 month of Pro free</strong> for every 3
                    referrals who sign up. Active paid referrals earn even more rewards.
                  </p>
                </div>
              </div>
            </div>

            {/* Referral List */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[rgba(79,70,229,0.2)]">
                <h2 className="text-lg font-semibold text-white">Your Referrals</h2>
              </div>
              {!data?.referrals || data.referrals.length === 0 ? (
                <div className="p-8 text-center">
                  <svg
                    className="w-10 h-10 text-[#475569] mx-auto mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-sm text-[#7C8DB0]">
                    No referrals yet. Share your link to get started!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#7C8DB0]">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Email</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.referrals.map((referral) => (
                        <tr key={referral.id} className="border-t border-[rgba(79,70,229,0.1)]">
                          <td className="px-5 py-3 text-[#CBD5E1]">
                            {new Date(referral.date).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-[#CBD5E1] font-mono text-xs">
                            {referral.email}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                referral.status === "active"
                                  ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                                  : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                              }`}
                            >
                              {referral.status === "active" ? "Active" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
