"use client";

import { useState, useRef, useEffect } from "react";

const STEPS = [
  {
    title: "Strategy Baseline",
    description:
      "Upload a backtest so AlgoStudio can extract the statistical fingerprint of your strategy.",
  },
  {
    title: "Monitor EA",
    description:
      "Install the Monitor EA in MT5 to send immutable live trade facts. It does not place trades.",
  },
  {
    title: "Live Edge Monitoring",
    description:
      "AlgoStudio compares live behavior against the baseline and can trigger governance actions when edge confidence degrades.",
  },
];

export function OnboardingHelpButton() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
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
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl w-[90vw] max-w-lg p-6">
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

          <div className="space-y-5">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-[rgba(79,70,229,0.15)] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[#818CF8]">{i + 1}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{step.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              AlgoStudio does not place trades. It monitors strategies running in external terminals
              and provides governance signals based on observed behavior.
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
