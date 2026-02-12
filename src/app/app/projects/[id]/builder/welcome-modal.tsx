"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "algostudio-builder-onboarded";

const STEPS = [
  {
    title: "Welcome to the Strategy Builder",
    description: "Build trading strategies visually by connecting blocks. No coding required.",
    icon: (
      <svg
        className="w-10 h-10 text-[#4F46E5]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
  {
    title: "1. Add an Entry Strategy",
    description:
      "Drag an entry strategy block (EMA Crossover, Range Breakout, RSI Reversal, etc.) onto the canvas. It includes signals, stop loss, take profit and position sizing.",
    icon: (
      <svg
        className="w-10 h-10 text-[#10B981]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
  {
    title: "2. Configure & Export",
    description:
      "Adjust the settings to your liking. Optionally add a timing block to limit trading hours, or trade management blocks (trailing stop, breakeven). Then export your .mq5 file.",
    icon: (
      <svg
        className="w-10 h-10 text-[#A78BFA]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    ),
  },
];

function getOnboarded() {
  return typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
}

const subscribe = () => () => {};

export function WelcomeModal() {
  const onboarded = useSyncExternalStore(subscribe, getOnboarded, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const open = !onboarded && !dismissed;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        localStorage.setItem(STORAGE_KEY, "1");
        setDismissed(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_8px_32px_rgba(79,70,229,0.2)]">
        <div className="flex justify-center mb-6">{current.icon}</div>
        <h2 className="text-xl font-bold text-white text-center mb-3">{current.title}</h2>
        <p className="text-[#94A3B8] text-center text-sm leading-relaxed mb-8">
          {current.description}
        </p>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === step ? "bg-[#4F46E5] w-6" : "bg-[#334155]"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200"
          >
            Skip
          </button>
          <button
            onClick={() => (isLast ? dismiss() : setStep(step + 1))}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200"
          >
            {isLast ? "Start Building" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
