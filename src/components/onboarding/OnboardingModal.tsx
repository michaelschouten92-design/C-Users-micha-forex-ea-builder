"use client";

import { useState, useRef, useEffect } from "react";

// ── Step status types ──

interface StepStatus {
  hasBacktest: boolean;
  monitorConnected: boolean;
  hasTrades: boolean;
  baselineLinked: boolean;
}

type StepState = "completed" | "active" | "waiting" | "upcoming";

function getStepState(status: StepStatus | null, step: number): StepState {
  if (!status) return "upcoming";

  switch (step) {
    case 1:
      return status.hasBacktest ? "completed" : "active";
    case 2:
      if (!status.hasBacktest) return "upcoming";
      return status.monitorConnected ? "completed" : "active";
    case 3:
      if (!status.monitorConnected) return "upcoming";
      return status.hasTrades ? "completed" : "waiting";
    case 4:
      if (!status.hasTrades) return "upcoming";
      return status.baselineLinked ? "completed" : "active";
    case 5:
      if (!status.baselineLinked) return "upcoming";
      return "completed";
    default:
      return "upcoming";
  }
}

// ── Step indicator icon ──

function StepIcon({ step, state }: { step: number; state: StepState }) {
  if (state === "completed") {
    return (
      <div className="w-6 h-6 rounded-full bg-[#10B981]/15 flex items-center justify-center">
        <svg
          className="w-3.5 h-3.5 text-[#10B981]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (state === "waiting") {
    return (
      <div className="w-6 h-6 rounded-full bg-[rgba(79,70,229,0.2)] border border-[rgba(79,70,229,0.4)] flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className="w-6 h-6 rounded-full bg-[rgba(79,70,229,0.2)] border border-[rgba(79,70,229,0.4)] flex items-center justify-center">
        <span className="text-[10px] font-bold text-[#818CF8]">{step}</span>
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
      <span className="text-[10px] font-medium text-[#4A4A5A]">{step}</span>
    </div>
  );
}

// ── Steps definition ──

const STEPS = [
  {
    step: 1,
    title: "Upload Backtest",
    description:
      "Upload your MT5 backtest report to establish a statistical baseline for your strategy.",
  },
  {
    step: 2,
    title: "Connect Monitor EA",
    description:
      "Install the Monitor EA in your MT5 terminal. It reads trade data — it cannot place orders.",
  },
  {
    step: 3,
    title: "Waiting for first trade",
    description:
      "Your Monitor EA is connected and listening. Strategies appear automatically once your EA closes a trade. This can take minutes to days depending on your strategy.",
  },
  {
    step: 4,
    title: "Link Baseline",
    description: "Match each live strategy to its backtest baseline to activate edge monitoring.",
  },
  {
    step: 5,
    title: "Live Edge Monitoring",
    description:
      "AlgoStudio compares live behavior against the baseline and signals when edge confidence degrades.",
  },
];

const GOOD_TO_KNOW = [
  {
    q: "Does the Monitor EA place trades?",
    a: "No. It only reads trade data from your terminal. It cannot open, modify, or close positions.",
  },
  {
    q: "What happens when drift is detected?",
    a: "AlgoStudio notifies you. It never intervenes in your trading. You decide what action to take.",
  },
  {
    q: "Can I monitor multiple strategies on one account?",
    a: "Yes. AlgoStudio groups trades by symbol and magic number automatically.",
  },
  {
    q: "How long until my strategy appears?",
    a: "It depends on your strategy's trading frequency. It appears after the first closed trade is detected.",
  },
];

// ── Main component ──

export function OnboardingHelpButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StepStatus | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      // Fetch live status when modal opens
      fetch("/api/onboarding/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setStatus({
              hasBacktest: data.hasBacktest,
              monitorConnected: data.monitorConnected,
              hasTrades: data.hasTrades ?? false,
              baselineLinked: data.baselineLinked,
            });
          }
        })
        .catch(() => {});
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => setOpen(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full border border-[rgba(255,255,255,0.12)] text-[#71717A] hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-colors flex items-center justify-center text-xs font-medium"
        aria-label="How AlgoStudio Works"
        title="How AlgoStudio Works"
      >
        ?
      </button>

      <dialog
        ref={dialogRef}
        className="bg-transparent p-0 backdrop:bg-black/60"
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl w-[90vw] max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">How AlgoStudio Works</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-[#64748B] hover:text-white transition-colors p-1"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Steps with live status */}
          <div className="space-y-1">
            {STEPS.map(({ step, title, description }) => {
              const state = getStepState(status, step);
              return (
                <div
                  key={step}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    state === "active" || state === "waiting"
                      ? "bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.25)]"
                      : "border border-transparent"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <StepIcon step={step} state={state} />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        state === "completed"
                          ? "text-[#52525B] line-through"
                          : state === "active" || state === "waiting"
                            ? "text-white"
                            : "text-[#52525B]"
                      }`}
                    >
                      {title}
                      {state === "waiting" && (
                        <span className="ml-2 text-[10px] font-normal text-[#10B981] no-underline">
                          Listening...
                        </span>
                      )}
                    </p>
                    {state !== "completed" && (
                      <p
                        className={`text-xs mt-0.5 leading-relaxed ${
                          state === "active" || state === "waiting"
                            ? "text-[#94A3B8]"
                            : "text-[#3F3F46]"
                        }`}
                      >
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Good to know */}
          <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <h3 className="text-xs font-semibold text-[#7C8DB0] uppercase tracking-wider mb-3">
              Good to know
            </h3>
            <div className="space-y-3">
              {GOOD_TO_KNOW.map(({ q, a }, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-[#CBD5E1]">{q}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
