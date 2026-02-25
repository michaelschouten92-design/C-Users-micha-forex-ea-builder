"use client";

import Link from "next/link";

/**
 * Blurred health score preview for unauthenticated visitors.
 * Shows enough detail to demonstrate value, gates full results behind signup.
 */
export function HealthScorePreview() {
  return (
    <div className="relative">
      {/* Visible preview section */}
      <div className="bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-2xl overflow-hidden">
        <div className="px-6 py-6">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-3">
            Your Strategy Health Score
          </p>

          {/* Overall score — visible */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1A0626" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeDasharray="78 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">78%</span>
              </div>
            </div>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30">
                Healthy
              </span>
              <p className="text-xs text-[#7C8DB0] mt-1">Based on 847 trades over 164 days</p>
            </div>
          </div>

          {/* Metric bars — partially visible */}
          <div className="space-y-2.5 mb-6">
            {[
              { label: "Return", pct: 82, color: "#10B981" },
              { label: "Drawdown", pct: 85, color: "#10B981" },
            ].map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7C8DB0]">{m.label}</span>
                  <span className="text-white font-medium">{m.pct}%</span>
                </div>
                <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Blurred section */}
          <div className="relative">
            <div className="blur-[6px] pointer-events-none select-none" aria-hidden="true">
              <div className="space-y-2.5 mb-4">
                {[
                  { label: "Win Rate", pct: 71 },
                  { label: "Volatility", pct: 74 },
                  { label: "Trade Frequency", pct: 76 },
                ].map((m) => (
                  <div key={m.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#7C8DB0]">{m.label}</span>
                      <span className="text-white font-medium">{m.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#10B981]"
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[rgba(79,70,229,0.1)] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7C8DB0]">Drift Detection</span>
                  <span className="text-[#10B981]">No drift</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7C8DB0]">Expectancy</span>
                  <span className="text-white">+0.042%/trade</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7C8DB0]">Score Trend</span>
                  <span className="text-white">Stable</span>
                </div>
              </div>
            </div>

            {/* Signup overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-white font-medium mb-3">
                  Sign up free to see your full evaluation
                </p>
                <Link
                  href="/login?mode=register&redirect=/app/evaluate"
                  className="inline-block bg-[#4F46E5] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
                >
                  Get Your Strategy Evaluated — Free
                </Link>
                <p className="text-[10px] text-[#7C8DB0] mt-2">No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
