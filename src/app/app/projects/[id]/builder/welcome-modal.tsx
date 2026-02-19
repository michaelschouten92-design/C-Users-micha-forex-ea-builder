"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "algostudio-builder-onboarded";
const STEP_KEY = "algostudio-builder-onboard-step";

const STEPS = [
  {
    title: "Welcome to the Strategy Builder",
    description:
      "Build a complete trading bot without writing a single line of code. Drag blocks, tweak settings, and export clean MQL5 (or MQL4). If you ever get stuck, click the Help button in the bottom-right corner of the canvas.",
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg1)" />
        <path
          d="M40 18 L44 30 H56 L46 38 L50 50 L40 42 L30 50 L34 38 L24 30 H36 Z"
          fill="#4F46E5"
          opacity="0.15"
        />
        <path d="M40 24V25" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
        <path d="M52.5 27.5L51.8 28.2" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
        <path d="M56 40H55" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
        <path d="M25 40H24" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
        <path d="M28.2 28.2L27.5 27.5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M34.5 52H45.5M40 28V29a7 7 0 01-3 5.745l-.774.774A4.5 4.5 0 0035 38.691V40a3 3 0 006 0v-1.309a4.5 4.5 0 00-1.226-3.172L39 34.745A7 7 0 0140 29z"
          stroke="#A78BFA"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "The Blocks Panel (Left Side)",
    description:
      "On the left you'll find all available blocks organized into three categories: Entry Strategies (your trade signals), Timing (session & spread filters), and Trade Management (trailing stop, breakeven). Use the search bar at the top to quickly find what you need.",
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg2)" />
        {/* Three colored blocks representing categories */}
        <rect x="22" y="22" width="16" height="10" rx="3" fill="#10B981" opacity="0.8" />
        <rect x="22" y="35" width="16" height="10" rx="3" fill="#F59E0B" opacity="0.8" />
        <rect x="22" y="48" width="16" height="10" rx="3" fill="#A78BFA" opacity="0.8" />
        {/* Lines representing labels */}
        <rect x="42" y="25" width="16" height="2" rx="1" fill="#10B981" opacity="0.4" />
        <rect x="42" y="29" width="10" height="2" rx="1" fill="#10B981" opacity="0.2" />
        <rect x="42" y="38" width="14" height="2" rx="1" fill="#F59E0B" opacity="0.4" />
        <rect x="42" y="42" width="10" height="2" rx="1" fill="#F59E0B" opacity="0.2" />
        <rect x="42" y="51" width="12" height="2" rx="1" fill="#A78BFA" opacity="0.4" />
        <rect x="42" y="55" width="8" height="2" rx="1" fill="#A78BFA" opacity="0.2" />
      </svg>
    ),
  },
  {
    title: "Step 1: Drag an Entry Strategy",
    description:
      "Drag an entry strategy block from the left panel onto the canvas. Try EMA Crossover — it's the simplest to start with. Each entry block already includes entry signals, stop loss, take profit, and position sizing — everything needed for a working EA.",
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg3)" />
        {/* Block being dragged */}
        <rect
          x="38"
          y="30"
          width="22"
          height="14"
          rx="3"
          fill="#22C55E"
          opacity="0.2"
          stroke="#22C55E"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />
        <rect x="41" y="34" width="12" height="2" rx="1" fill="#22C55E" opacity="0.5" />
        <rect x="41" y="38" width="8" height="2" rx="1" fill="#22C55E" opacity="0.3" />
        {/* Cursor */}
        <path
          d="M28 26 L28 42 L33 37 L39 38 L36 32 L41 28 Z"
          fill="white"
          opacity="0.9"
          stroke="#22C55E"
          strokeWidth="1"
        />
        {/* Dotted drag trail */}
        <line
          x1="20"
          y1="50"
          x2="32"
          y2="38"
          stroke="#22C55E"
          strokeWidth="1.5"
          strokeDasharray="2 3"
          opacity="0.4"
        />
      </svg>
    ),
  },
  {
    title: "Step 2: Add Filters & Management",
    description:
      "Optionally drag timing filters (Trading Sessions, Max Spread) to control when your EA trades, and trade management blocks (Trailing Stop, Breakeven) to manage open positions. These are not required — your strategy works with just an entry block.",
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg4" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg4)" />
        {/* Two blocks with connection line */}
        <rect
          x="16"
          y="30"
          width="20"
          height="14"
          rx="3"
          fill="#F59E0B"
          opacity="0.2"
          stroke="#F59E0B"
          strokeWidth="1.5"
        />
        <rect x="19" y="34" width="10" height="2" rx="1" fill="#F59E0B" opacity="0.5" />
        <rect x="19" y="38" width="7" height="2" rx="1" fill="#F59E0B" opacity="0.3" />
        <rect
          x="44"
          y="30"
          width="20"
          height="14"
          rx="3"
          fill="#A78BFA"
          opacity="0.2"
          stroke="#A78BFA"
          strokeWidth="1.5"
        />
        <rect x="47" y="34" width="10" height="2" rx="1" fill="#A78BFA" opacity="0.5" />
        <rect x="47" y="38" width="7" height="2" rx="1" fill="#A78BFA" opacity="0.3" />
        {/* Connection line with animated dot */}
        <line x1="36" y1="37" x2="44" y2="37" stroke="#4F46E5" strokeWidth="2" />
        <circle cx="40" cy="37" r="2.5" fill="#4F46E5" />
      </svg>
    ),
  },
  {
    title: "Step 3: Configure Block Settings",
    description:
      'Click any block on the canvas to open its settings in the right panel. Adjust parameters like period lengths, SL/TP values, and lot sizes. Tip: check "Optimize in MT5" on any numeric parameter to include it in the MetaTrader 5 Strategy Tester optimisation.',
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg5" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg5)" />
        {/* Block */}
        <rect
          x="18"
          y="26"
          width="22"
          height="14"
          rx="3"
          fill="#06B6D4"
          opacity="0.2"
          stroke="#06B6D4"
          strokeWidth="1.5"
        />
        <rect x="21" y="30" width="12" height="2" rx="1" fill="#06B6D4" opacity="0.5" />
        <rect x="21" y="34" width="8" height="2" rx="1" fill="#06B6D4" opacity="0.3" />
        {/* Slider / toggle controls */}
        <rect x="46" y="26" width="18" height="3" rx="1.5" fill="#334155" />
        <circle cx="58" cy="27.5" r="2.5" fill="#06B6D4" />
        <rect x="46" y="33" width="18" height="3" rx="1.5" fill="#334155" />
        <circle cx="52" cy="34.5" r="2.5" fill="#06B6D4" />
        <rect x="46" y="40" width="18" height="3" rx="1.5" fill="#334155" />
        <circle cx="55" cy="41.5" r="2.5" fill="#06B6D4" />
        {/* Arrow from block to controls */}
        <path
          d="M42 33 L44 33"
          stroke="#06B6D4"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.5"
        />
      </svg>
    ),
  },
  {
    title: "Step 4: Strategy Settings",
    description:
      "Scroll down in the left panel to find Strategy Settings. Here you can set max concurrent trades, daily loss limits, trading direction (long/short/both), and apply prop firm preset rules. These apply globally to your entire EA.",
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg6" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg6)" />
        {/* Checklist */}
        <rect
          x="24"
          y="20"
          width="32"
          height="40"
          rx="4"
          fill="#1E293B"
          stroke="#4F46E5"
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Checkmark items */}
        <circle
          cx="31"
          cy="29"
          r="3"
          fill="#4F46E5"
          opacity="0.3"
          stroke="#4F46E5"
          strokeWidth="1"
        />
        <path
          d="M29.5 29 L30.5 30 L33 27.5"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="37" y="27.5" width="14" height="2" rx="1" fill="#4F46E5" opacity="0.4" />
        <circle
          cx="31"
          cy="38"
          r="3"
          fill="#4F46E5"
          opacity="0.3"
          stroke="#4F46E5"
          strokeWidth="1"
        />
        <path
          d="M29.5 38 L30.5 39 L33 36.5"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="37" y="36.5" width="12" height="2" rx="1" fill="#4F46E5" opacity="0.4" />
        <circle
          cx="31"
          cy="47"
          r="3"
          fill="#4F46E5"
          opacity="0.3"
          stroke="#4F46E5"
          strokeWidth="1"
        />
        <path
          d="M29.5 47 L30.5 48 L33 45.5"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="37" y="45.5" width="10" height="2" rx="1" fill="#4F46E5" opacity="0.4" />
      </svg>
    ),
  },
  {
    title: "Step 5: Export Your EA",
    description:
      'When all blocks show a green "Strategy Complete" badge in the top-right, your strategy is ready. Click the Export button in the bottom bar to download a .mq5 file — this is your complete Expert Advisor source code.',
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg7" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg7)" />
        {/* File icon */}
        <path
          d="M28 22 H44 L52 30 V56 A3 3 0 0 1 49 59 H28 A3 3 0 0 1 25 56 V25 A3 3 0 0 1 28 22Z"
          fill="#1E293B"
          stroke="#A78BFA"
          strokeWidth="1.5"
        />
        <path d="M44 22 V30 H52" stroke="#A78BFA" strokeWidth="1.5" fill="none" />
        {/* .mq5 label */}
        <text x="32" y="45" fill="#A78BFA" fontSize="8" fontFamily="monospace" fontWeight="bold">
          .mq5
        </text>
        {/* Download arrow */}
        <path d="M40 50 L40 58" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M36 55 L40 59 L44 55"
          stroke="#A78BFA"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Step 6: Backtest in MetaTrader 5",
    description:
      'Open MetaTrader 5 and compile the .mq5 file. Launch the Strategy Tester (Ctrl+R), select your EA and symbol, set the model to "Every tick based on real ticks", and run at least 50 trades to get statistically meaningful results. Good luck!',
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="wg8" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#wg8)" />
        {/* Candlesticks */}
        <line x1="22" y1="32" x2="22" y2="52" stroke="#EF4444" strokeWidth="1" />
        <rect x="20" y="36" width="4" height="10" fill="#EF4444" opacity="0.8" />
        <line x1="30" y1="28" x2="30" y2="48" stroke="#22C55E" strokeWidth="1" />
        <rect x="28" y="32" width="4" height="8" fill="#22C55E" opacity="0.8" />
        <line x1="38" y1="24" x2="38" y2="46" stroke="#22C55E" strokeWidth="1" />
        <rect x="36" y="28" width="4" height="10" fill="#22C55E" opacity="0.8" />
        <line x1="46" y1="30" x2="46" y2="50" stroke="#EF4444" strokeWidth="1" />
        <rect x="44" y="34" width="4" height="8" fill="#EF4444" opacity="0.8" />
        <line x1="54" y1="22" x2="54" y2="44" stroke="#22C55E" strokeWidth="1" />
        <rect x="52" y="26" width="4" height="10" fill="#22C55E" opacity="0.8" />
        {/* Uptrend line */}
        <path
          d="M18 50 L30 42 L38 34 L46 38 L58 24"
          stroke="#F43F5E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
    ),
  },
];

function getOnboarded() {
  try {
    return typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const subscribe = () => () => {};

export function WelcomeModal({
  forceOpen,
  onClose,
}: { forceOpen?: boolean; onClose?: () => void } = {}) {
  const onboarded = useSyncExternalStore(subscribe, getOnboarded, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(STEP_KEY) : null;
      return saved ? Math.min(parseInt(saved, 10) || 0, STEPS.length - 1) : 0;
    } catch {
      return 0;
    }
  });
  const open = forceOpen || (!onboarded && !dismissed);

  // Persist step progress
  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(STEP_KEY, String(step));
    } catch {
      /* private browsing */
    }
  }, [step, open]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      localStorage.removeItem(STEP_KEY);
    } catch {
      /* private browsing */
    }
    setDismissed(true);
    setStep(0);
    onClose?.();
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        try {
          localStorage.setItem(STORAGE_KEY, "1");
          localStorage.removeItem(STEP_KEY);
        } catch {
          /* private browsing */
        }
        setDismissed(true);
        setStep(0);
        onClose?.();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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
        <p className="text-center text-xs text-[#7C8DB0] mb-2">
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
              className="text-xs text-[#7C8DB0] hover:text-[#94A3B8] transition-colors"
            >
              Skip tutorial
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
