"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { STRATEGY_PRESETS } from "@/lib/strategy-presets";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

// ── Types ──────────────────────────────────────────────────
type OnboardingPath = "backtest" | "live" | "validate";
type OnboardingStep = "scope" | "baseline" | "authority";

const STEPS: OnboardingStep[] = ["scope", "baseline", "authority"];

const STEP_LABELS: Record<OnboardingStep, string> = {
  scope: "Scope",
  baseline: "Baseline",
  authority: "Authority",
};

const PATH_CONFIG = {
  backtest: {
    title: "I Have a Validated Backtest",
    subtitle: "Upload your MT5 report to establish a statistical baseline.",
    icon: "upload",
    accentColor: "#22D3EE",
  },
  live: {
    title: "I'm Already Trading Live",
    subtitle: "Connect your running EA and bring it under structural control.",
    icon: "signal",
    accentColor: "#10B981",
  },
  validate: {
    title: "I Want to Validate First",
    subtitle: "Build a strategy, run a backtest, then establish authority.",
    icon: "shield",
    accentColor: "#A78BFA",
  },
} as const;

// ── Main Component ─────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pathParam = searchParams.get("path");
  const stepParam = searchParams.get("step");

  // Validate path and step against known values — fail-closed to scope
  const VALID_STEPS: ReadonlySet<string> = new Set(STEPS);
  const currentPath: OnboardingPath | null =
    pathParam && pathParam in PATH_CONFIG ? (pathParam as OnboardingPath) : null;
  const currentStep: OnboardingStep =
    currentPath && stepParam && VALID_STEPS.has(stepParam)
      ? (stepParam as OnboardingStep)
      : currentPath
        ? "baseline"
        : "scope";

  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  const navigate = useCallback(
    (path: OnboardingPath | null, step: OnboardingStep) => {
      const params = new URLSearchParams();
      if (path) params.set("path", path);
      if (step !== "scope") params.set("step", step);
      const qs = params.toString();
      router.push(`/app/onboarding${qs ? `?${qs}` : ""}`);
    },
    [router]
  );

  const selectPath = useCallback(
    (path: OnboardingPath) => {
      navigate(path, "baseline");
    },
    [navigate]
  );

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem("algostudio-onboarding-complete", "true");
    } catch {
      // localStorage unavailable — proceed anyway
    }
    router.push("/app");
  }, [router]);

  async function createFromPreset(presetId: string) {
    const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setLoadingPreset(presetId);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
        }),
      });

      if (!res.ok) {
        showError("Failed to create project. Please try again.");
        return;
      }
      const project = await res.json();

      await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ buildJson: preset.buildJson }),
      });

      router.push(`/app/projects/${project.id}`);
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      setLoadingPreset(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-20">
      {/* ── Step Indicator ── */}
      <StepIndicator currentStep={currentStep} currentPath={currentPath} onNavigate={navigate} />

      <div className="w-full max-w-4xl mt-10">
        {currentStep === "scope" && <ScopeStep onSelect={selectPath} />}
        {currentStep === "baseline" && currentPath === "backtest" && (
          <BacktestBaselineStep onNext={() => navigate("backtest", "authority")} />
        )}
        {currentStep === "baseline" && currentPath === "live" && (
          <LiveBaselineStep onNext={() => navigate("live", "authority")} />
        )}
        {currentStep === "baseline" && currentPath === "validate" && (
          <ValidateBaselineStep
            onNext={() => navigate("validate", "authority")}
            onCreatePreset={createFromPreset}
            loadingPreset={loadingPreset}
          />
        )}
        {currentStep === "authority" && currentPath && (
          <AuthorityStep path={currentPath} onComplete={completeOnboarding} />
        )}
      </div>
    </div>
  );
}

// ── Step Indicator ─────────────────────────────────────────
function StepIndicator({
  currentStep,
  currentPath,
  onNavigate,
}: {
  currentStep: OnboardingStep;
  currentPath: OnboardingPath | null;
  onNavigate: (path: OnboardingPath | null, step: OnboardingStep) => void;
}) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        const isClickable = isComplete && currentPath;

        return (
          <div key={step} className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (isClickable) {
                  if (step === "scope") onNavigate(null, "scope");
                  else onNavigate(currentPath, step);
                }
              }}
              disabled={!isClickable}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "bg-[rgba(79,70,229,0.15)] border border-[rgba(79,70,229,0.4)] text-white"
                  : isComplete
                    ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10B981] cursor-pointer hover:border-[rgba(16,185,129,0.5)]"
                    : "bg-transparent border border-[rgba(79,70,229,0.1)] text-[#64748B]"
              }`}
            >
              {isComplete ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    isActive ? "bg-[#4F46E5] text-white" : "bg-[rgba(79,70,229,0.1)] text-[#64748B]"
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
            </button>

            {i < STEPS.length - 1 && (
              <div
                className={`w-6 sm:w-10 h-px ${
                  i < currentIndex ? "bg-[#10B981]" : "bg-[rgba(79,70,229,0.15)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Scope (Path Selection) ─────────────────────────
function ScopeStep({ onSelect }: { onSelect: (path: OnboardingPath) => void }) {
  return (
    <div>
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(79,70,229,0.15)] border border-[rgba(79,70,229,0.25)] mb-4">
          <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
          <span className="text-xs text-[#A78BFA] font-medium">Strategy Control Layer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          Establish Control Over Your Strategy.
        </h1>
        <p className="text-[#94A3B8] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          AlgoStudio governs the lifecycle of live algorithmic strategies. Choose where you are
          today — we&apos;ll guide you to structural authority.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {(
          Object.entries(PATH_CONFIG) as [OnboardingPath, (typeof PATH_CONFIG)[OnboardingPath]][]
        ).map(([key, config]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="group text-left bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{
                backgroundColor: `${config.accentColor}15`,
                border: `1px solid ${config.accentColor}30`,
              }}
            >
              <PathIcon icon={config.icon} color={config.accentColor} />
            </div>
            <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#CBD5E1] transition-colors">
              {config.title}
            </h3>
            <p className="text-sm text-[#7C8DB0] leading-relaxed">{config.subtitle}</p>
            <div
              className="mt-4 flex items-center gap-1.5 text-xs font-medium"
              style={{ color: config.accentColor }}
            >
              <span>Get started</span>
              <svg
                className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-[#64748B]">
        Every path leads to the same outcome:{" "}
        <span className="text-[#A78BFA]">deterministic lifecycle authority</span> over your
        strategy.
      </p>
    </div>
  );
}

// ── Step 2A: Backtest Baseline ─────────────────────────────
function BacktestBaselineStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-2xl mx-auto">
      <StepHeader
        title="Establish Your Statistical Baseline"
        description="Upload your MT5 Strategy Tester report. AlgoStudio will extract key performance metrics and create a validated baseline for lifecycle governance."
        accentColor="#22D3EE"
      />

      <div className="mt-8 bg-[#1A0626] border border-[rgba(34,211,238,0.2)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3">What happens next</h3>
        <ol className="space-y-3">
          {[
            "Upload your .html/.htm backtest report",
            "AlgoStudio scores it across 5 structural metrics",
            "Your baseline becomes the anchor for all future deviation checks",
          ].map((text, i) => (
            <li key={i} className="flex gap-3 items-start text-sm text-[#94A3B8]">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.25)] flex items-center justify-center text-[10px] font-bold text-[#22D3EE]">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 mb-3 text-xs text-[#94A3B8]">
        Submit the baseline this strategy will be governed against.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/app/evaluate"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.25)] text-[#22D3EE] hover:bg-[rgba(34,211,238,0.15)] hover:border-[rgba(34,211,238,0.4)] transition-all font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload Backtest Report
        </Link>
        <SkipButton onClick={onNext} />
      </div>

      <HelpBox>
        In MetaTrader 5, run the Strategy Tester, then right-click the results and select &quot;Save
        as Report (.html)&quot;.
      </HelpBox>
    </div>
  );
}

// ── Step 2B: Live Baseline ─────────────────────────────────
function LiveBaselineStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-2xl mx-auto">
      <StepHeader
        title="Bring Your Live Strategy Under Control"
        description="Connect your running MetaTrader 5 EA to AlgoStudio. We'll start monitoring its live statistical behavior and establish structural governance."
        accentColor="#10B981"
      />

      <div className="mt-8 bg-[#1A0626] border border-[rgba(16,185,129,0.2)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3">How connection works</h3>
        <ol className="space-y-3">
          {[
            "Generate a secure API key from your AlgoStudio dashboard",
            "Add the AlgoStudio bridge EA to your MetaTrader 5 chart",
            "Your EA begins sending heartbeats — AlgoStudio governs the lifecycle",
          ].map((text, i) => (
            <li key={i} className="flex gap-3 items-start text-sm text-[#94A3B8]">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] flex items-center justify-center text-[10px] font-bold text-[#10B981]">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 mb-3 text-xs text-[#94A3B8]">
        Submit the baseline this strategy will be governed against.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/app/live"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] text-[#10B981] hover:bg-[rgba(16,185,129,0.15)] hover:border-[rgba(16,185,129,0.4)] transition-all font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Go to Command Center
        </Link>
        <SkipButton onClick={onNext} />
      </div>

      <HelpBox>
        You can also upload a historical backtest first to establish a validated baseline before
        going live. This is recommended for stronger statistical anchoring.
      </HelpBox>
    </div>
  );
}

// ── Step 2C: Validate Baseline ─────────────────────────────
function ValidateBaselineStep({
  onNext,
  onCreatePreset,
  loadingPreset,
}: {
  onNext: () => void;
  onCreatePreset: (presetId: string) => void;
  loadingPreset: string | null;
}) {
  const starterPresets = STRATEGY_PRESETS.filter((p) =>
    ["ema-crossover", "rsi-reversal", "range-breakout"].includes(p.id)
  ).slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto">
      <StepHeader
        title="Build, Test, Then Deploy With Authority"
        description="Start with a strategy template or build your own. Run a backtest to establish a statistical baseline before live deployment."
        accentColor="#A78BFA"
      />

      <p className="mt-8 mb-4 text-xs text-[#94A3B8] text-center">
        Submit the baseline this strategy will be governed against.
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Option A: Template */}
        <div className="bg-[#1A0626] border border-[rgba(167,139,250,0.2)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Start from a template</h3>
          <p className="text-xs text-[#7C8DB0] mb-4">No coding required</p>
          <div className="space-y-2">
            {starterPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onCreatePreset(preset.id)}
                disabled={loadingPreset !== null}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[rgba(79,70,229,0.15)] bg-[rgba(79,70,229,0.05)] hover:border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.1)] transition-all text-left disabled:opacity-50 group"
              >
                <span className="text-sm text-[#CBD5E1] group-hover:text-white transition-colors">
                  {preset.name}
                </span>
                {loadingPreset === preset.id ? (
                  <Spinner />
                ) : (
                  <svg
                    className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#A78BFA] transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Option B: Upload */}
        <div className="bg-[#1A0626] border border-[rgba(34,211,238,0.2)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Upload an existing backtest</h3>
          <p className="text-xs text-[#7C8DB0] mb-4">Already have an MT5 report?</p>
          <Link
            href="/app/evaluate"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.25)] text-[#22D3EE] hover:bg-[rgba(34,211,238,0.15)] hover:border-[rgba(34,211,238,0.4)] transition-all font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload Report
          </Link>
          <p className="mt-3 text-[11px] text-[#64748B] leading-relaxed">
            Upload your .html/.htm Strategy Tester report to get an instant health score and
            baseline.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <SkipButton onClick={onNext} />
      </div>
    </div>
  );
}

// ── Step 3: Authority ──────────────────────────────────────
function AuthorityStep({ path, onComplete }: { path: OnboardingPath; onComplete: () => void }) {
  const contextLines: Record<OnboardingPath, string> = {
    backtest:
      "Your backtest baseline anchors all future deviation checks. When live performance diverges from this validated behavior, AlgoStudio enforces structural decisions.",
    live: "Your live EA is now under observation. AlgoStudio monitors its statistical behavior and will enforce lifecycle decisions when deviation thresholds are breached.",
    validate:
      "Once your strategy is backtested and deployed, AlgoStudio will govern its lifecycle — enforcing RUN, PAUSE, or STOP based on structural deviation.",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <StepHeader
        title="Establish Deterministic Authority"
        description="AlgoStudio governs your strategy's lifecycle with rule-based decisions. No discretion. No emotion. Structural control."
        accentColor="#4F46E5"
      />

      <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">{contextLines[path]}</p>

        <div className="space-y-4">
          {[
            {
              label: "RUN",
              desc: "Strategy continues — live behavior remains within validated statistical boundaries.",
              color: "#10B981",
            },
            {
              label: "PAUSE",
              desc: "Structural deviation detected — strategy is temporarily halted pending review.",
              color: "#F59E0B",
            },
            {
              label: "STOP",
              desc: "Strategy invalidated under deterministic rules — permission to run is revoked to preserve capital.",
              color: "#EF4444",
            },
          ].map((state) => (
            <div
              key={state.label}
              className="flex items-start gap-3 px-4 py-3 rounded-lg"
              style={{ backgroundColor: `${state.color}08`, border: `1px solid ${state.color}20` }}
            >
              <span
                className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                style={{ color: state.color, backgroundColor: `${state.color}15` }}
              >
                {state.label}
              </span>
              <p className="text-sm text-[#94A3B8]">{state.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors text-base"
        >
          Establish Control
        </button>
        <p className="mt-3 text-xs text-[#64748B]">
          You can configure specific deviation thresholds from your strategy dashboard.
        </p>
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────────
function StepHeader({
  title,
  description,
  accentColor,
}: {
  title: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div className="text-center">
      <div
        className="inline-block w-1.5 h-1.5 rounded-full mb-4"
        style={{ backgroundColor: accentColor }}
      />
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{title}</h2>
      <p className="text-[#94A3B8] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center sm:items-end gap-1">
      <button
        onClick={onClick}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[rgba(79,70,229,0.2)] text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-all text-sm"
      >
        Skip for now
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span className="text-[11px] text-[#64748B]">
        You can place a strategy under governance at any time.
      </span>
    </div>
  );
}

function HelpBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 px-4 py-3 rounded-lg bg-[rgba(79,70,229,0.05)] border border-[rgba(79,70,229,0.1)]">
      <p className="text-[11px] text-[#7C8DB0] leading-relaxed">
        <span className="text-[#94A3B8] font-medium">Tip: </span>
        {children}
      </p>
    </div>
  );
}

function PathIcon({ icon, color }: { icon: string; color: string }) {
  switch (icon) {
    case "upload":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      );
    case "signal":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
    case "shield":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    default:
      return null;
  }
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-[#A78BFA]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
