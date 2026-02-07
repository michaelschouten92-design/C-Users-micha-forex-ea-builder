"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "algostudio-builder-onboarded";

const STEPS = [
  {
    title: "Welcome to the Strategy Builder",
    description:
      "Build trading strategies visually by connecting blocks. No coding required.",
    icon: (
      <svg className="w-10 h-10 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "1. Start with a Timing block",
    description:
      "Drag a timing block (e.g. \"Always\" or \"Trading Sessions\") onto the canvas. This controls when your EA is active.",
    icon: (
      <svg className="w-10 h-10 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "2. Add Indicators or Price Action",
    description:
      "Connect indicator blocks (RSI, Moving Average, Stochastic, etc.) to define your entry conditions.",
    icon: (
      <svg className="w-10 h-10 text-[#A78BFA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "3. Place Trade & Risk blocks",
    description:
      "Add Place Buy/Sell blocks, then connect Stop Loss and Take Profit. Finally, export your .mq5 file for MetaTrader 5.",
    icon: (
      <svg className="w-10 h-10 text-[#34D399]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_8px_32px_rgba(79,70,229,0.2)]">
        <div className="flex justify-center mb-6">{current.icon}</div>
        <h2 className="text-xl font-bold text-white text-center mb-3">
          {current.title}
        </h2>
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
