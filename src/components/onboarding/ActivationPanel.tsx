"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OnboardingStep } from "./OnboardingStep";

interface OnboardingStatus {
  hasBacktest: boolean;
  monitorConnected: boolean;
  baselineLinked: boolean;
  firstLinkable: { instanceId: string; label: string } | null;
}

function getActiveStep(s: OnboardingStatus): 1 | 2 | 3 {
  if (!s.hasBacktest) return 1;
  if (!s.monitorConnected) return 2;
  return 3;
}

export function ActivationPanel() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [successDismissed, setSuccessDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("algostudio:monitoring-banner-dismissed") === "1";
  });
  const [panelDismissed, setPanelDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("algostudio:onboarding-dismissed") === "1";
  });

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/onboarding/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setStatus(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    fetchStatus();

    // Refetch when user returns to this tab (e.g., after connecting terminal in another tab)
    function onFocus() {
      fetchStatus();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (loading || !status || panelDismissed) return null;

  // ── Success state: activation complete ──
  if (status.baselineLinked) {
    if (successDismissed) return null;
    return (
      <div className="rounded-xl border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.04)] p-4 mb-6 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-6 h-6 rounded-full bg-[#10B981]/15 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-[#10B981]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#10B981]">Monitoring Active</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Your live deployment is now being verified against its baseline.
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            AlgoStudio will surface edge drift, governance status, and incidents here.
          </p>
        </div>
        <button
          onClick={() => {
            setSuccessDismissed(true);
            localStorage.setItem("algostudio:monitoring-banner-dismissed", "1");
          }}
          className="flex-shrink-0 text-[#64748B] hover:text-white transition-colors p-1"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  }

  const completedCount = [
    status.hasBacktest,
    status.monitorConnected,
    status.baselineLinked,
  ].filter(Boolean).length;
  const activeStep = getActiveStep(status);

  return (
    <div className="rounded-xl border border-[rgba(79,70,229,0.2)] bg-[rgba(79,70,229,0.04)] p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Start Monitoring Your Strategy</h3>
          <p className="text-xs text-[#7C8DB0] mt-0.5">
            AlgoStudio verifies whether your live strategy still matches its historical edge.{" "}
            {completedCount}/3 steps completed.
          </p>
        </div>
        <button
          onClick={() => {
            setPanelDismissed(true);
            localStorage.setItem("algostudio:onboarding-dismissed", "1");
          }}
          className="flex-shrink-0 text-[#64748B] hover:text-white transition-colors p-1"
          aria-label="Dismiss onboarding"
          title="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-1.5">
        <OnboardingStep
          stepNumber={1}
          label="Upload Backtest"
          description="Create the statistical baseline for your strategy."
          completed={status.hasBacktest}
          active={activeStep === 1}
        />
        <OnboardingStep
          stepNumber={2}
          label="Connect Monitor EA"
          description="Send live trade facts from your MT5 terminal to AlgoStudio."
          completed={status.monitorConnected}
          active={activeStep === 2}
        />
        <OnboardingStep
          stepNumber={3}
          label="Link Baseline"
          description="Attach the strategy baseline to a live deployment to begin edge monitoring."
          completed={status.baselineLinked}
          active={activeStep === 3}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-[rgba(79,70,229,0.12)]">
        {(activeStep === 1 || activeStep === 2) && (
          <Link
            href="/app/onboarding"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#818CF8] hover:text-white transition-colors"
          >
            {activeStep === 1 ? "Start Setup" : "Setup Monitor EA"}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
        {activeStep === 3 && status.firstLinkable && (
          <div>
            <p className="text-xs text-[#94A3B8] mb-2">One step away from live edge monitoring.</p>
            <Link
              href={`/app/live?relink=${status.firstLinkable.instanceId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#4F46E5] text-white px-3 py-1.5 rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Link Baseline
              <span className="text-[10px] font-normal text-white/60">
                {status.firstLinkable.label}
              </span>
            </Link>
          </div>
        )}
        {activeStep === 3 && !status.firstLinkable && (
          <div>
            <p className="text-xs text-[#94A3B8] mb-1">No live deployment available to link yet.</p>
            <p className="text-[11px] text-[#7C8DB0]">
              A deployment appears automatically when the Monitor EA detects a running strategy on
              your terminal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
