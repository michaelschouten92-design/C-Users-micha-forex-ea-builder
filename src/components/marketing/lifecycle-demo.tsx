"use client";

import { useEffect, useRef, useState } from "react";

interface PhaseDetail {
  evaluations: { current: number; required: number };
  trades: { current: number; required: number };
}

interface Phase {
  key: string;
  label: string;
  color: string;
  bgMuted: string;
  borderMuted: string;
  description: string;
  detail: PhaseDetail | null;
  pulse?: boolean;
  glow?: boolean;
}

const phases: Phase[] = [
  {
    key: "NEW",
    label: "New",
    color: "#7C8DB0",
    bgMuted: "rgba(124,141,176,0.1)",
    borderMuted: "rgba(124,141,176,0.3)",
    description: "Strategy deployed. Collecting initial data.",
    detail: null,
  },
  {
    key: "PROVING",
    label: "Proving",
    color: "#6366F1",
    bgMuted: "rgba(99,102,241,0.1)",
    borderMuted: "rgba(99,102,241,0.3)",
    description: "Health monitored. Building track record.",
    detail: {
      evaluations: { current: 3, required: 5 },
      trades: { current: 47, required: 30 },
    },
    pulse: true,
  },
  {
    key: "PROVEN",
    label: "Proven",
    color: "#10B981",
    bgMuted: "rgba(16,185,129,0.1)",
    borderMuted: "rgba(16,185,129,0.3)",
    description: "5 consecutive healthy evaluations. Edge verified.",
    detail: null,
    glow: true,
  },
  {
    key: "RETIRED",
    label: "Retired",
    color: "#EF4444",
    bgMuted: "rgba(239,68,68,0.1)",
    borderMuted: "rgba(239,68,68,0.3)",
    description: "Edge degraded. Auto-retired to protect capital.",
    detail: null,
  },
];

export function LifecycleDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(1); // Default to PROVING

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selected = phases[selectedPhase];

  return (
    <div ref={containerRef}>
      {/* Desktop: Horizontal pipeline */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between gap-0">
          {phases.map((phase, i) => (
            <div key={phase.key} className="flex items-center flex-1 last:flex-initial">
              {/* Node */}
              <button
                onClick={() => setSelectedPhase(i)}
                className={`relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 cursor-pointer min-w-[140px] ${
                  isVisible ? "fade-up-hidden is-visible" : "fade-up-hidden"
                } ${
                  selectedPhase === i ? "bg-opacity-100 scale-105" : "hover:scale-[1.02]"
                } ${phase.key === "PROVING" ? "animate-proving-pulse" : ""}`}
                style={{
                  backgroundColor: selectedPhase === i ? phase.bgMuted : "rgba(13,1,23,0.5)",
                  borderColor: selectedPhase === i ? phase.color : phase.borderMuted,
                  animationDelay: `${i * 150}ms`,
                  ...(phase.glow && selectedPhase === i
                    ? { boxShadow: `0 0 20px rgba(16,185,129,0.3)` }
                    : {}),
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                <span className="text-sm font-semibold" style={{ color: phase.color }}>
                  {phase.label}
                </span>
                <span className="text-xs text-[#94A3B8] text-center leading-tight">
                  {phase.description}
                </span>
              </button>

              {/* Connector line */}
              {i < phases.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 bg-[rgba(79,70,229,0.15)] rounded-full overflow-hidden relative">
                  {isVisible && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full animate-line-draw"
                      style={{
                        backgroundColor: phases[i + 1].color,
                        animationDelay: `${(i + 1) * 200 + 300}ms`,
                        animationFillMode: "backwards",
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical pipeline */}
      <div className="md:hidden flex flex-col items-center gap-0">
        {phases.map((phase, i) => (
          <div key={phase.key} className="flex flex-col items-center w-full">
            <button
              onClick={() => setSelectedPhase(i)}
              className={`relative w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                isVisible ? "fade-up-hidden is-visible" : "fade-up-hidden"
              } ${phase.key === "PROVING" ? "animate-proving-pulse" : ""}`}
              style={{
                backgroundColor: selectedPhase === i ? phase.bgMuted : "rgba(13,1,23,0.5)",
                borderColor: selectedPhase === i ? phase.color : phase.borderMuted,
                animationDelay: `${i * 150}ms`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: phase.color }}
              />
              <div className="text-left">
                <span className="text-sm font-semibold block" style={{ color: phase.color }}>
                  {phase.label}
                </span>
                <span className="text-xs text-[#94A3B8]">{phase.description}</span>
              </div>
            </button>

            {/* Vertical connector */}
            {i < phases.length - 1 && (
              <div className="w-[2px] h-6 bg-[rgba(79,70,229,0.15)] relative overflow-hidden">
                {isVisible && (
                  <div
                    className="absolute inset-x-0 top-0 animate-line-draw-v"
                    style={{
                      backgroundColor: phases[i + 1].color,
                      animationDelay: `${(i + 1) * 200 + 300}ms`,
                      animationFillMode: "backwards",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail panel — shows expanded info for selected phase */}
      {selected.detail && (
        <div
          className={`mt-8 p-6 rounded-xl border-2 transition-all duration-300 ${
            isVisible ? "fade-up-hidden is-visible" : "fade-up-hidden"
          }`}
          style={{
            backgroundColor: selected.bgMuted,
            borderColor: selected.borderMuted,
            animationDelay: "700ms",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selected.color }} />
            <span className="text-sm font-semibold" style={{ color: selected.color }}>
              {selected.label} Phase — Progress
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Evaluations progress */}
            <div className="bg-[rgba(13,1,23,0.5)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#94A3B8]">Healthy Evaluations</span>
                <span className="text-xs font-mono text-white">
                  {selected.detail.evaluations.current}/{selected.detail.evaluations.required}
                </span>
              </div>
              <div className="h-2 bg-[#1A0626] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(selected.detail.evaluations.current / selected.detail.evaluations.required) * 100}%`,
                    backgroundColor: selected.color,
                  }}
                />
              </div>
              <p className="text-xs text-[#64748B] mt-2">
                {selected.detail.evaluations.required - selected.detail.evaluations.current} more to
                reach Proven status
              </p>
            </div>

            {/* Trades progress */}
            <div className="bg-[rgba(13,1,23,0.5)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#94A3B8]">Trade Sample</span>
                <span className="text-xs font-mono text-white">
                  {selected.detail.trades.current}/{selected.detail.trades.required}
                </span>
              </div>
              <div className="h-2 bg-[#1A0626] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: "100%",
                    backgroundColor: "#10B981",
                  }}
                />
              </div>
              <p className="text-xs text-[#10B981] mt-2 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Minimum trade count passed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Non-PROVING selected — show description panel */}
      {!selected.detail && (
        <div
          className={`mt-8 p-6 rounded-xl border transition-all duration-300 ${
            isVisible ? "fade-up-hidden is-visible" : "fade-up-hidden"
          }`}
          style={{
            backgroundColor: selected.bgMuted,
            borderColor: selected.borderMuted,
            animationDelay: "700ms",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selected.color }} />
            <span className="text-sm font-semibold" style={{ color: selected.color }}>
              {selected.label} Phase
            </span>
          </div>
          <p className="text-sm text-[#94A3B8]">{selected.description}</p>
          {selected.key === "PROVEN" && (
            <p className="text-xs text-[#10B981] mt-3">
              This strategy has passed 5 consecutive healthy evaluations and is considered to have a
              verified edge.
            </p>
          )}
          {selected.key === "RETIRED" && (
            <p className="text-xs text-[#EF4444] mt-3">
              Health score dropped below threshold. The strategy was automatically retired to
              protect capital.
            </p>
          )}
          {selected.key === "NEW" && (
            <p className="text-xs text-[#7C8DB0] mt-3">
              Gathering initial trade data. The strategy will move to Proving once enough trades are
              collected for evaluation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
