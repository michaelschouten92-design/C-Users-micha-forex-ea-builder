"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";

interface OnboardingChecklistProps {
  hasProjects: boolean;
  hasBacktests: boolean;
  hasExports: boolean;
  hasLiveEAs: boolean;
  tier: "FREE" | "PRO" | "ELITE";
  firstProjectId: string | null;
}

interface Step {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  cta: string;
}

const DISMISSED_KEY = "algostudio-checklist-dismissed";

/**
 * OnboardingChecklist — Activation progress tracker.
 *
 * Shown on the dashboard for users who have started but haven't
 * completed the core activation path. Auto-detects progress from
 * server-side data. Dismissable via localStorage.
 */
export function OnboardingChecklist({
  hasProjects,
  hasBacktests,
  hasExports,
  hasLiveEAs,
  tier,
  firstProjectId,
}: OnboardingChecklistProps) {
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

  const steps: Step[] = [
    {
      id: "account",
      label: "Create your account",
      description: "You're in. Welcome to AlgoStudio.",
      completed: true, // Always true — they're logged in
      href: "/app",
      cta: "Done",
    },
    {
      id: "strategy",
      label: hasBacktests ? "Upload a backtest" : "Build or upload a strategy",
      description: hasBacktests
        ? "Your backtest is uploaded and scored."
        : hasProjects
          ? "Your first strategy is ready."
          : "Pick a template or upload an MT5 backtest report.",
      completed: hasProjects || hasBacktests,
      href: hasProjects && firstProjectId ? `/app/projects/${firstProjectId}` : "/app/evaluate",
      cta: hasProjects ? "Open Builder" : "Get Started",
    },
    {
      id: "health",
      label: "Review your evaluation",
      description: hasBacktests
        ? "See how your strategy scores across 5 key metrics."
        : "Upload a backtest report to get an instant health analysis.",
      completed: hasBacktests,
      href: "/app/evaluate",
      cta: hasBacktests ? "View Score" : "Evaluate",
    },
    {
      id: "export",
      label: "Export your EA",
      description: hasExports
        ? "Your Expert Advisor is exported and ready for MetaTrader 5."
        : "Generate a ready-to-use .mq5 file for MetaTrader 5.",
      completed: hasExports,
      href: hasProjects && firstProjectId ? `/app/projects/${firstProjectId}` : "/app",
      cta: hasExports ? "Done" : "Export",
    },
    {
      id: "live",
      label: "Go live and start monitoring",
      description:
        tier === "FREE"
          ? "Upgrade to Pro to start tracking live performance."
          : hasLiveEAs
            ? "Your strategy is live. Track record building in progress."
            : "Deploy your EA and start building a verified track record.",
      completed: hasLiveEAs,
      href: tier === "FREE" ? "/pricing" : "/app/monitor",
      cta: tier === "FREE" ? "See Plans" : hasLiveEAs ? "View Dashboard" : "Set Up",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allComplete = completedCount === steps.length;
  const progressPct = (completedCount / steps.length) * 100;

  // Find next incomplete step
  const nextStep = steps.find((s) => !s.completed);

  // Auto-dismiss when all steps are done
  if (allComplete) {
    return null;
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Getting started</h3>
          <p className="text-xs text-[#7C8DB0] mt-0.5">
            {completedCount} of {steps.length} complete
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
          aria-label="Dismiss checklist"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-[#4F46E5] to-[#22D3EE] rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const isNext = step.id === nextStep?.id;
          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isNext ? "bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)]" : ""
              }`}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {step.completed ? (
                  <div className="w-5 h-5 rounded-full bg-[#22D3EE]/20 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-[#22D3EE]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                      isNext ? "border-[#A78BFA] text-[#A78BFA]" : "border-[#334155] text-[#334155]"
                    }`}
                  >
                    {i + 1}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.completed
                      ? "text-[#64748B] line-through"
                      : isNext
                        ? "text-white"
                        : "text-[#94A3B8]"
                  }`}
                >
                  {step.label}
                </p>
                {isNext && <p className="text-xs text-[#7C8DB0] mt-0.5">{step.description}</p>}
              </div>

              {/* Action */}
              {isNext && !step.completed && (
                <Link
                  href={step.href}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-md bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-colors font-medium"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
