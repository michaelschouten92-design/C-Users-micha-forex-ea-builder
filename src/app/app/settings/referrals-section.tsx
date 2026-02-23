"use client";

import { useState } from "react";
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

export function ReferralsSection() {
  const { data, isLoading, error } = useSWR<ReferralData>("/api/referrals", fetcher);
  const [copied, setCopied] = useState(false);

  const referralLink = data?.referralCode ? `https://algostudio.io/?ref=${data.referralCode}` : "";

  async function handleCopy() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text from a temporary input for manual copy
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  if (isLoading) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-[#1E293B] rounded w-1/3 mb-4" />
        <div className="h-4 bg-[#1E293B] rounded w-2/3 mb-3" />
        <div className="h-10 bg-[#1E293B] rounded w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(239,68,68,0.2)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Referral Program</h2>
        <p className="text-sm text-[#EF4444]">
          Failed to load referral data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Referral Program</h2>
      <p className="text-sm text-[#94A3B8] mb-4">
        Invite friends and earn rewards. Get{" "}
        <strong className="text-[#22D3EE]">1 month of Pro free</strong> for every 3 referrals who
        sign up.
      </p>

      {/* Referral Link */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg px-3 py-2 text-sm text-[#22D3EE] font-mono truncate">
          {referralLink || "Loading..."}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] transition-all duration-200"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Share Buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={handleShareTwitter}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#CBD5E1] bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] hover:text-white transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#CBD5E1] bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] hover:text-white transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </button>
        <button
          onClick={handleShareEmail}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#CBD5E1] bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] hover:text-white transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#0F172A] rounded-lg p-3 text-center">
          <p className="text-xs text-[#7C8DB0] mb-0.5">Total</p>
          <p className="text-lg font-bold text-white">{data?.stats.total ?? 0}</p>
        </div>
        <div className="bg-[#0F172A] rounded-lg p-3 text-center">
          <p className="text-xs text-[#7C8DB0] mb-0.5">Active</p>
          <p className="text-lg font-bold text-[#22D3EE]">{data?.stats.active ?? 0}</p>
        </div>
        <div className="bg-[#0F172A] rounded-lg p-3 text-center">
          <p className="text-xs text-[#7C8DB0] mb-0.5">Pending</p>
          <p className="text-lg font-bold text-[#F59E0B]">{data?.stats.pending ?? 0}</p>
        </div>
      </div>

      {/* Referral List */}
      {data?.referrals && data.referrals.length > 0 && (
        <div className="border-t border-[rgba(79,70,229,0.2)] pt-4">
          <h3 className="text-sm font-medium text-[#CBD5E1] mb-3">Your Referrals</h3>
          <div className="space-y-2">
            {data.referrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between text-sm py-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[#94A3B8] text-xs">
                    {new Date(referral.date).toLocaleDateString()}
                  </span>
                  <span className="text-[#CBD5E1] font-mono text-xs">{referral.email}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    referral.status === "active"
                      ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                      : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                  }`}
                >
                  {referral.status === "active" ? "Active" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
