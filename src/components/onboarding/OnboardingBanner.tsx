"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ── Types (subset of /api/onboarding/status → guided) ─────

interface GuidedData {
  currentStep: 1 | 2 | 3 | 4 | 5;
  hasBacktest: boolean;
  availableBaselines: { fileName: string }[];
  discoveredStrategies: {
    instanceId: string;
    eaName: string;
    symbol: string | null;
  }[];
}

const TOTAL_STEPS = 5;
const POLL_INTERVAL_MS = 8_000;

// ── Banner config per step ────────────────────────────────

interface BannerState {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

function getBannerState(step: number, g: GuidedData): BannerState {
  switch (step) {
    case 1:
      return {
        title: "Finish your setup",
        description: "Connect your MT5 terminal to start monitoring your first strategy.",
        ctaLabel: "Start setup",
        ctaHref: "/app/onboarding",
      };
    case 2:
      return {
        title: "Terminal connected",
        description: "Your terminal is online. Waiting for the first trading activity.",
        ctaLabel: "View setup",
        ctaHref: "/app/onboarding",
      };
    case 3: {
      const hasLinkable = g.availableBaselines.length > 0;
      const strategy = g.discoveredStrategies[0];
      if (hasLinkable && strategy) {
        return {
          title: "Baseline ready to link",
          description: "Your backtest is ready. Link it to activate strategy monitoring.",
          ctaLabel: "Link baseline backtest",
          ctaHref: `/app/live?relink=${strategy.instanceId}`,
        };
      }
      return {
        title: "Add a baseline backtest",
        description: "Upload your MT5 backtest report so AlgoStudio can monitor your strategy.",
        ctaLabel: g.hasBacktest ? "Continue setup" : "Upload backtest",
        ctaHref: g.hasBacktest ? "/app/onboarding" : "/app/evaluate",
      };
    }
    case 4:
      return {
        title: "Almost ready",
        description: "Your baseline is linked. Waiting for monitoring activation to complete.",
        ctaLabel: "View setup",
        ctaHref: "/app/onboarding",
      };
    default:
      return { title: "", description: "", ctaLabel: "", ctaHref: "" };
  }
}

// ── Component ─────────────────────────────────────────────

export function OnboardingBanner() {
  const [guided, setGuided] = useState<GuidedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("algostudio-onboarding-banner-dismissed") === "true";
    } catch {
      return false;
    }
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/status");
      if (res.ok) {
        const json = await res.json();
        setGuided(json.guided);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while onboarding is incomplete
  useEffect(() => {
    if (!guided || guided.currentStep === 5 || dismissed) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [guided, dismissed, fetchStatus]);

  if (loading || !guided || dismissed) return null;

  const currentStep = guided.currentStep;

  // Onboarding complete — render nothing
  if (currentStep === 5) return null;

  const banner = getBannerState(currentStep, guided);

  return (
    <div className="rounded-xl border border-[rgba(79,70,229,0.2)] bg-[rgba(79,70,229,0.04)] p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-[#4F46E5]/20 border border-[#818CF8]/40 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-[#818CF8]">{currentStep}</span>
            </div>
            <h3 className="text-sm font-semibold text-white">{banner.title}</h3>
          </div>
          <p className="text-xs text-[#94A3B8] pl-7">{banner.description}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-2.5 pl-7">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1 rounded-full transition-all ${
                  step < currentStep
                    ? "w-5 bg-[#10B981]"
                    : step === currentStep
                      ? "w-5 bg-[#818CF8]"
                      : "w-3 bg-[rgba(255,255,255,0.08)]"
                }`}
              />
            ))}
            <span className="text-[10px] text-[#7C8DB0] ml-1">
              {currentStep - 1}/{TOTAL_STEPS}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-7 sm:pl-0">
          <Link
            href={banner.ctaHref}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F46E5] text-white text-xs font-medium hover:bg-[#6366F1] transition-colors"
          >
            {banner.ctaLabel}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem("algostudio-onboarding-banner-dismissed", "true");
              } catch {
                /* ignore */
              }
            }}
            className="p-1.5 text-[#7C8DB0] hover:text-white transition-colors rounded"
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
      </div>
    </div>
  );
}
