"use client";

import { useState, useSyncExternalStore, useCallback } from "react";

const DISMISSED_KEY = "algostudio-status-intro-dismissed";

/**
 * StatusIntroCard — Introduces the Strategy Status system naturally.
 *
 * Shown the first time a user has live EAs on their dashboard.
 * Explains the TESTING → MONITORING → CONSISTENT progression
 * as the platform's core concept, not a feature list.
 */
export function StatusIntroCard() {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
  }, []);
  const isDismissedFromStorage = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(DISMISSED_KEY) === "true",
    () => true // Server snapshot: hidden to avoid hydration mismatch
  );
  const [localDismissed, setLocalDismissed] = useState(false);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setLocalDismissed(true);
  }

  if (isDismissedFromStorage || localDismissed) return null;

  return (
    <div className="mb-6 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-2">
            How AlgoStudio evaluates your strategies
          </h4>
          <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
            Every live strategy goes through an evaluation process. As your EA trades and builds a
            track record, AlgoStudio continuously assesses its performance against its baseline.
            Strategies earn their status — nothing is given for free.
          </p>

          {/* Status progression */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              {
                label: "Testing",
                color: "#A78BFA",
                desc: "New strategy, collecting initial data",
              },
              {
                label: "Monitoring",
                color: "#6366F1",
                desc: "Enough data to track, under observation",
              },
              {
                label: "Consistent",
                color: "#10B981",
                desc: "Matches its baseline performance",
              },
            ].map((status, i) => (
              <div key={status.label} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(15,23,42,0.5)] border border-[rgba(79,70,229,0.15)]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-[11px] font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                </div>
                {i < 2 && (
                  <svg
                    className="w-3 h-3 text-[#334155] flex-shrink-0"
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
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#64748B] mt-3">
            If performance degrades, the status changes to reflect that — giving you an early
            warning before a drawdown becomes a problem.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="text-[#64748B] hover:text-[#94A3B8] transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
