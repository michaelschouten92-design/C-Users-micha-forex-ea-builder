"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "algostudio-builder-onboarded";

const STEPS = [
  {
    title: "Welcome to the Strategy Builder",
    description:
      "Build a complete trading bot without writing a single line of code. Drag blocks, tweak settings, and export clean MQL5 (or MQL4). If you ever get stuck, click the Help button in the bottom-right corner of the canvas.",
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
    title: "The Blocks Panel (Left Side)",
    description:
      "On the left you'll find all available blocks organised into three categories: Entry Strategies (your trade signals), Timing (session & spread filters), and Trade Management (trailing stop, breakeven). Use the search bar at the top to quickly find what you need.",
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
          d="M4 6h16M4 12h16M4 18h7"
        />
      </svg>
    ),
  },
  {
    title: "Step 1: Drag an Entry Strategy",
    description:
      "Drag an entry strategy block from the left panel onto the canvas. Try EMA Crossover — it's the simplest to start with. Each entry block already includes entry signals, stop loss, take profit, and position sizing — everything needed for a working EA.",
    icon: (
      <svg
        className="w-10 h-10 text-[#22C55E]"
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
    title: "Step 2: Add Filters & Management",
    description:
      "Optionally drag timing filters (Trading Sessions, Max Spread) to control when your EA trades, and trade management blocks (Trailing Stop, Breakeven) to manage open positions. These are not required — your strategy works with just an entry block.",
    icon: (
      <svg
        className="w-10 h-10 text-[#F59E0B]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
    ),
  },
  {
    title: "Step 3: Configure Block Settings",
    description:
      'Click any block on the canvas to open its settings in the right panel. Adjust parameters like period lengths, SL/TP values, and lot sizes. Tip: check "Optimize in MT5" on any numeric parameter to include it in the MetaTrader 5 Strategy Tester optimisation.',
    icon: (
      <svg
        className="w-10 h-10 text-[#06B6D4]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    title: "Step 4: Strategy Settings",
    description:
      "Scroll down in the left panel to find Strategy Settings. Here you can set max concurrent trades, daily loss limits, trading direction (long/short/both), and apply prop firm preset rules. These apply globally to your entire EA.",
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    title: "Step 5: Export Your EA",
    description:
      'When all blocks show a green "Strategy Complete" badge in the top-right, your strategy is ready. Click the Export button in the bottom bar to download a .mq5 file — this is your complete Expert Advisor source code.',
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
  {
    title: "Step 6: Backtest in MetaTrader 5",
    description:
      'Open MetaTrader 5 and compile the .mq5 file. Launch the Strategy Tester (Ctrl+R), select your EA and symbol, set the model to "Every tick based on real ticks", and run at least 50 trades to get statistically meaningful results. Good luck!',
    icon: (
      <svg
        className="w-10 h-10 text-[#F43F5E]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

function getOnboarded() {
  return typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
}

const subscribe = () => () => {};

export function WelcomeModal({
  forceOpen,
  onClose,
}: { forceOpen?: boolean; onClose?: () => void } = {}) {
  const onboarded = useSyncExternalStore(subscribe, getOnboarded, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const open = forceOpen || (!onboarded && !dismissed);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
    setStep(0);
    onClose?.();
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
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
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-2xl p-8 max-w-lg w-full mx-4 shadow-[0_8px_32px_rgba(79,70,229,0.2)]">
        <div className="flex justify-center mb-6">{current.icon}</div>
        <h2 className="text-xl font-bold text-white text-center mb-3">{current.title}</h2>
        <p className="text-[#94A3B8] text-center text-sm leading-relaxed mb-8">
          {current.description}
        </p>

        {/* Step counter */}
        <p className="text-center text-xs text-[#64748B] mb-2">
          {step + 1} of {STEPS.length}
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
          {step === 0 ? (
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200"
            >
              Skip
            </button>
          ) : (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? dismiss() : setStep(step + 1))}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200"
          >
            {isLast ? "Start Building" : "Next"}
          </button>
        </div>

        {/* Skip link — visible on all steps after the first */}
        {step > 0 && (
          <div className="text-center mt-3">
            <button
              onClick={dismiss}
              className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Skip tutorial
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
