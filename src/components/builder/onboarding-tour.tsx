"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "algostudio-tour-completed";

interface TourStep {
  title: string;
  description: string;
  targetSelector: string;
  placement: "bottom" | "right" | "left" | "top";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to the Builder",
    description:
      "Build your trading bot visually. Drag blocks onto the canvas, configure their settings, and export production-ready MQL5 code.",
    targetSelector: "#builder-canvas",
    placement: "bottom",
  },
  {
    title: "Block Toolbar",
    description:
      "Your building blocks live here. Start with an Entry Strategy, then add Filters and Trade Management blocks. Drag them onto the canvas.",
    targetSelector: ".node-toolbar-container",
    placement: "right",
  },
  {
    title: "Canvas",
    description:
      "This is your workspace. Drop blocks here and they will appear as nodes. The canvas auto-saves your work as you build.",
    targetSelector: ".react-flow",
    placement: "bottom",
  },
  {
    title: "Properties Panel",
    description:
      "Click any block on the canvas to open its settings here. Adjust periods, SL/TP, lot sizes, and toggle parameters for MT5 optimization.",
    targetSelector: "#properties-panel",
    placement: "left",
  },
  {
    title: "Export Your EA",
    description:
      "When your strategy shows a green checkmark, click Export Code to generate a ready-to-use .mq5 file for MetaTrader 5.",
    targetSelector: ".export-button-container",
    placement: "top",
  },
];

function getStoredCompletion(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function isWelcomeModalDismissed(): boolean {
  try {
    return (
      typeof window !== "undefined" && localStorage.getItem("algostudio-builder-onboarded") === "1"
    );
  } catch {
    return false;
  }
}

export function OnboardingTour(): React.ReactNode {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (getStoredCompletion()) return;

    // Wait for the welcome modal to be dismissed before showing the tour
    function checkAndActivate(): void {
      if (isWelcomeModalDismissed()) {
        setActive(true);
      }
    }

    // Poll briefly in case the welcome modal is still open
    const timer = setTimeout(checkAndActivate, 1200);
    const interval = setInterval(() => {
      if (isWelcomeModalDismissed() && !getStoredCompletion()) {
        setActive(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const updateSpotlight = useCallback(() => {
    if (!active) return;
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [active, currentStep]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateSpotlight);
    window.addEventListener("resize", updateSpotlight);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateSpotlight);
    };
  }, [updateSpotlight]);

  function completeTour(): void {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private browsing
    }
    setActive(false);
    setCurrentStep(0);
  }

  function handleNext(): void {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  }

  function handlePrev(): void {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  useEffect(() => {
    if (!active) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        completeTour();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  if (!active) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const padding = 8;

  // Compute tooltip position
  const tooltipStyle = computeTooltipPosition(spotlightRect, step.placement, padding);

  return (
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left - padding}
                y={spotlightRect.top - padding}
                width={spotlightRect.width + padding * 2}
                height={spotlightRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {spotlightRect && (
        <div
          className="absolute border-2 border-[#22D3EE] rounded-xl pointer-events-none"
          style={{
            left: spotlightRect.left - padding,
            top: spotlightRect.top - padding,
            width: spotlightRect.width + padding * 2,
            height: spotlightRect.height + padding * 2,
            boxShadow: "0 0 20px rgba(34, 211, 238, 0.4), inset 0 0 20px rgba(34, 211, 238, 0.1)",
          }}
        />
      )}

      {/* Click blocker (allows clicking skip/next/prev but blocks canvas interactions) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip */}
      <div
        className="absolute bg-[#0F172A] border border-[rgba(34,211,238,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-5 w-80 z-[101]"
        style={tooltipStyle}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[#22D3EE] font-medium">
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button
            onClick={completeTour}
            className="text-xs text-[#7C8DB0] hover:text-white transition-colors"
          >
            Skip tour
          </button>
        </div>

        <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">{step.description}</p>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentStep ? "w-5 bg-[#22D3EE]" : "w-1.5 bg-[#334155]"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white border border-[rgba(34,211,238,0.2)] hover:bg-[rgba(34,211,238,0.1)] transition-all duration-200"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-white bg-[#22D3EE] hover:bg-[#06B6D4] transition-all duration-200"
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function computeTooltipPosition(
  rect: DOMRect | null,
  placement: TourStep["placement"],
  padding: number
): React.CSSProperties {
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const tooltipWidth = 320;
  const gap = 16;

  switch (placement) {
    case "bottom":
      return {
        top: rect.bottom + padding + gap,
        left: Math.max(
          16,
          Math.min(
            rect.left + rect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )
        ),
      };
    case "top":
      return {
        bottom: window.innerHeight - rect.top + padding + gap,
        left: Math.max(
          16,
          Math.min(
            rect.left + rect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )
        ),
      };
    case "right":
      return {
        top: Math.max(16, rect.top + rect.height / 2 - 100),
        left: rect.right + padding + gap,
      };
    case "left":
      return {
        top: Math.max(16, rect.top + rect.height / 2 - 100),
        right: window.innerWidth - rect.left + padding + gap,
      };
  }
}
