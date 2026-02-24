"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STRATEGY_PRESETS } from "@/lib/strategy-presets";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

/**
 * OnboardingHero — Full welcome experience for brand-new users.
 *
 * Shown when user has 0 projects, 0 backtests, 0 live EAs.
 * Explains what AlgoStudio does, introduces Proof-Based Trading,
 * and provides two clear activation paths.
 */
export function OnboardingHero() {
  const router = useRouter();
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  async function createFromPreset(presetId: string) {
    const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setLoadingPreset(presetId);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
        }),
      });

      if (!res.ok) {
        showError("Failed to create project. Please try again.");
        return;
      }
      const project = await res.json();

      // Save preset buildJson as first version
      await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ buildJson: preset.buildJson }),
      });

      router.push(`/app/projects/${project.id}`);
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      setLoadingPreset(null);
    }
  }

  // Show only 3 beginner-friendly presets
  const starterPresets = STRATEGY_PRESETS.filter((p) =>
    ["ema-crossover", "rsi-reversal", "range-breakout"].includes(p.id)
  ).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(79,70,229,0.15)] border border-[rgba(79,70,229,0.25)] mb-4">
          <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
          <span className="text-xs text-[#A78BFA] font-medium">Proof-Based Trading Platform</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Welcome to AlgoStudio</h2>
        <p className="text-[#94A3B8] text-base max-w-xl mx-auto leading-relaxed">
          Build trading strategies, verify their performance with tamper-proof track records, and
          monitor their health in real time. Every result is provable.
        </p>
      </div>

      {/* How It Works — 4 steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          {
            step: "1",
            label: "Build or Upload",
            desc: "Create a strategy or upload an existing backtest",
            color: "#22D3EE",
          },
          {
            step: "2",
            label: "Health Check",
            desc: "Get an instant quality score for your strategy",
            color: "#A78BFA",
          },
          {
            step: "3",
            label: "Go Live",
            desc: "Deploy to MetaTrader 5 and start tracking",
            color: "#4F46E5",
          },
          {
            step: "4",
            label: "Prove It",
            desc: "Build a verified track record over time",
            color: "#10B981",
          },
        ].map((s) => (
          <div
            key={s.step}
            className="bg-[#1A0626]/60 border border-[rgba(79,70,229,0.12)] rounded-xl px-4 py-4 text-center"
          >
            <div
              className="w-7 h-7 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: `${s.color}20`,
                color: s.color,
                border: `1px solid ${s.color}40`,
              }}
            >
              {s.step}
            </div>
            <p className="text-sm font-medium text-white mb-1">{s.label}</p>
            <p className="text-[11px] text-[#7C8DB0] leading-snug">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Two Paths */}
      <div className="grid md:grid-cols-2 gap-5 mb-8">
        {/* Path 1: Build a Strategy */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(79,70,229,0.15)] flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-[#A78BFA]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Build a Strategy</h3>
              <p className="text-xs text-[#7C8DB0]">No coding required</p>
            </div>
          </div>
          <p className="text-sm text-[#94A3B8] mb-4 leading-relaxed">
            Pick a template, customize the settings, and export a ready-to-use Expert Advisor for
            MetaTrader 5. Takes about 5 minutes.
          </p>

          {/* Quick-start templates */}
          <div className="space-y-2">
            {starterPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => createFromPreset(preset.id)}
                disabled={loadingPreset !== null}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[rgba(79,70,229,0.15)] bg-[rgba(79,70,229,0.05)] hover:border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.1)] transition-all text-left disabled:opacity-50 group"
              >
                <div>
                  <span className="text-sm font-medium text-[#CBD5E1] group-hover:text-white transition-colors">
                    {preset.name}
                  </span>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {preset.buildJson.nodes.length} blocks &middot; Ready to customize
                  </p>
                </div>
                {loadingPreset === preset.id ? (
                  <svg
                    className="animate-spin h-4 w-4 text-[#A78BFA]"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-[#64748B] group-hover:text-[#A78BFA] transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Path 2: Upload a Backtest */}
        <div className="bg-[#1A0626] border border-[rgba(34,211,238,0.2)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(34,211,238,0.15)] flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-[#22D3EE]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Upload a Backtest</h3>
              <p className="text-xs text-[#7C8DB0]">Already have a strategy?</p>
            </div>
          </div>
          <p className="text-sm text-[#94A3B8] mb-4 leading-relaxed">
            Upload your MT5 Strategy Tester report (.html) and get an instant health score. See how
            your strategy measures up across 5 key metrics.
          </p>

          <Link
            href="/app/backtest"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.25)] text-[#22D3EE] hover:bg-[rgba(34,211,238,0.15)] hover:border-[rgba(34,211,238,0.4)] transition-all font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload Backtest Report
          </Link>

          <div className="mt-4 px-4 py-3 rounded-lg bg-[rgba(79,70,229,0.05)] border border-[rgba(79,70,229,0.1)]">
            <p className="text-[11px] text-[#7C8DB0] leading-relaxed">
              <span className="text-[#94A3B8] font-medium">How to get a report:</span> In MetaTrader
              5, run the Strategy Tester, then right-click the results and select &quot;Save as
              Report (.html)&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* Subtle concept introduction */}
      <div className="text-center">
        <p className="text-xs text-[#64748B]">
          AlgoStudio evaluates every strategy through a progression:{" "}
          <span className="text-[#A78BFA]">Testing</span>
          {" → "}
          <span className="text-[#6366F1]">Monitoring</span>
          {" → "}
          <span className="text-[#10B981]">Consistent</span>. Your strategy earns its status through
          real performance.
        </p>
      </div>
    </div>
  );
}
