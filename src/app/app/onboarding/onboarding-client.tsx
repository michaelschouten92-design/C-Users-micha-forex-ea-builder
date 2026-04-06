"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCsrfHeaders } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────

interface DiscoveredStrategy {
  instanceId: string;
  eaName: string;
  symbol: string | null;
  lifecycleState: string;
  healthStatus: string | null;
  driftDetected: boolean;
}

interface AvailableBaseline {
  fileName: string;
  eaName: string | null;
  symbol: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  healthScore: number;
  createdAt: string;
}

interface GuidedData {
  currentStep: 1 | 2 | 3 | 4 | 5;
  hasTerminal: boolean;
  hasDiscoveredStrategy: boolean;
  hasBaselineLinked: boolean;
  hasMonitoringActive: boolean;
  hasBacktest: boolean;
  availableBaselines: AvailableBaseline[];
  terminal: { broker: string | null; accountNumber: string | null } | null;
  discoveredStrategies: DiscoveredStrategy[];
  monitoringInstance: {
    instanceId: string;
    eaName: string;
    symbol: string | null;
    healthStatus: string | null;
    driftDetected: boolean;
  } | null;
}

interface OnboardingStatus {
  guided: GuidedData;
}

const TOTAL_STEPS = 5;

// ── Polling hook ──────────────────────────────────────────

function useOnboardingStatus() {
  const [data, setData] = useState<GuidedData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/status");
      if (res.ok) {
        const json: OnboardingStatus = await res.json();
        setData(json.guided);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchStatus();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { data, loading, refetch: fetchStatus };
}

// ── Icons ─────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 text-[#818CF8] animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Step indicator ────────────────────────────────────────

function StepIndicator({ step, currentStep }: { step: number; currentStep: number }) {
  const isComplete = step < currentStep;
  const isActive = step === currentStep;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          isComplete
            ? "bg-[#10B981]/15 border border-[#10B981]/30"
            : isActive
              ? "bg-[#4F46E5]/20 border-2 border-[#818CF8]"
              : "bg-[#1A1A2E] border border-[rgba(255,255,255,0.08)]"
        }`}
      >
        {isComplete ? (
          <CheckIcon />
        ) : (
          <span className={isActive ? "text-[#818CF8]" : "text-[#4A4A5A]"}>{step}</span>
        )}
      </div>
      {step < TOTAL_STEPS && (
        <div
          className={`w-6 h-0.5 rounded-full transition-colors ${
            isComplete ? "bg-[#10B981]/40" : "bg-[rgba(255,255,255,0.06)]"
          }`}
        />
      )}
    </div>
  );
}

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div
      className="flex items-center justify-center gap-0 mb-8"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-label={`Onboarding progress: step ${currentStep} of 5`}
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <StepIndicator key={step} step={step} currentStep={currentStep} />
      ))}
    </div>
  );
}

// ── Troubleshoot toggle ──────────────────────────────────

function TroubleshootToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <span className="text-xs font-medium text-[#F59E0B]">
          Not connecting? Check these common issues
        </span>
        <svg
          className={`w-4 h-4 text-[#7C8DB0] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[rgba(255,255,255,0.06)]">
          <TroubleshootItem
            title="WebRequest URL not added"
            description={
              <>
                Go to <strong className="text-white">Tools → Options → Expert Advisors</strong> and
                make sure{" "}
                <code className="text-xs bg-[#0A0118] px-1 py-0.5 rounded text-[#22D3EE]">
                  https://algo-studio.com
                </code>{" "}
                is in the allowed list.
              </>
            }
          />
          <TroubleshootItem
            title="AutoTrading is disabled"
            description={
              <>
                Check that the <strong className="text-white">AutoTrading</strong> button in the MT5
                toolbar is enabled (green icon). The EA needs this to send data.
              </>
            }
          />
          <TroubleshootItem
            title="EA not attached to a chart"
            description={
              <>
                Open any chart, then drag <strong className="text-white">AlgoStudio_Monitor</strong>{" "}
                from the Navigator panel onto it. You should see a smiley face in the top-right
                corner of the chart.
              </>
            }
          />
          <TroubleshootItem
            title="Firewall or VPS blocking outbound traffic"
            description={
              <>
                If you run MT5 on a VPS, make sure outbound HTTPS (port 443) is allowed. Some VPS
                providers block this by default.
              </>
            }
          />
        </div>
      )}
    </div>
  );
}

function TroubleshootItem({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="flex gap-3 pt-3">
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mt-0.5">
        <svg
          className="w-3 h-3 text-[#F59E0B]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <div>
        <p className="text-xs font-medium text-white">{title}</p>
        <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ── Step 1: Connect MT5 ───────────────────────────────────

function StepConnectTerminal({ complete }: { complete: boolean }) {
  return (
    <div className="space-y-5">
      <StepHeader
        stepNumber={1}
        title="Connect your MT5 terminal"
        subtitle={
          complete
            ? "Terminal connected"
            : "Install the AlgoStudio Monitor EA to start sending live data."
        }
        complete={complete}
      />

      {!complete && (
        <>
          <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-5 space-y-4">
            <h4 className="text-sm font-medium text-white">Quick Setup</h4>
            <ol className="space-y-3 text-sm text-[#94A3B8]">
              <li className="flex gap-3">
                <StepBullet n={1} />
                <span>
                  Download{" "}
                  <a
                    href="/downloads/AlgoStudio_Monitor.ex5"
                    download
                    className="text-[#22D3EE] hover:underline font-medium"
                  >
                    AlgoStudio_Monitor.ex5
                  </a>{" "}
                  and copy it to your MetaTrader{" "}
                  <code className="text-xs bg-[#0A0118] px-1.5 py-0.5 rounded text-[#CBD5E1]">
                    MQL5/Experts
                  </code>{" "}
                  folder.
                </span>
              </li>
              <li className="flex gap-3">
                <StepBullet n={2} />
                <span>
                  In MetaTrader, go to{" "}
                  <strong className="text-white">
                    Tools &rarr; Options &rarr; Expert Advisors
                  </strong>{" "}
                  and enable <strong className="text-white">Allow WebRequest for listed URL</strong>
                  . Add:{" "}
                  <code className="text-xs bg-[#0A0118] px-1.5 py-0.5 rounded text-[#22D3EE]">
                    https://algo-studio.com
                  </code>
                </span>
              </li>
              <li className="flex gap-3">
                <StepBullet n={3} />
                <span>
                  Attach <strong className="text-white">AlgoStudio_Monitor</strong> to any chart and
                  enable <strong className="text-white">AutoTrading</strong>.
                </span>
              </li>
            </ol>

            <a
              href="/downloads/AlgoStudio_Monitor.ex5"
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#6366F1] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Monitor EA
            </a>
          </div>

          <WaitingPulse message="Waiting for terminal connection..." />

          <TroubleshootToggle />
        </>
      )}

      {complete && <SuccessBanner message="Terminal connected. Heartbeat received." />}
    </div>
  );
}

// ── Step 2: Waiting for trades ────────────────────────────

function StepWaitingForTrades({
  complete,
  terminal,
}: {
  complete: boolean;
  terminal: { broker: string | null; accountNumber: string | null } | null;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        stepNumber={2}
        title="Waiting for trading activity"
        subtitle={
          complete
            ? "Strategy detected from trade activity"
            : "AlgoStudio will auto-discover strategies from your trade history."
        }
        complete={complete}
      />

      <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-5 space-y-3">
        <StatusRow label="Terminal" value="Connected" ok />
        <StatusRow label="Heartbeat" value="Receiving" ok />
        {terminal?.broker && <StatusRow label="Broker" value={terminal.broker} ok />}
        {terminal?.accountNumber && (
          <StatusRow label="Account" value={`#${terminal.accountNumber}`} ok />
        )}
        <StatusRow
          label="Strategy detection"
          value={complete ? "Strategy discovered" : "Waiting for trades..."}
          ok={complete}
        />
      </div>

      {!complete && (
        <WaitingPulse message="Monitoring trade activity... A strategy will appear once trades are detected." />
      )}

      {complete && <SuccessBanner message="Strategy auto-discovered from trade activity." />}
    </div>
  );
}

// ── Step 3: Strategy discovered ───────────────────────────

function StepStrategyDiscovered({
  complete,
  strategies,
}: {
  complete: boolean;
  strategies: DiscoveredStrategy[];
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        stepNumber={3}
        title="Strategy discovered"
        subtitle={
          complete
            ? "Strategy ready for baseline linking"
            : "Your strategy has been detected. Review it below."
        }
        complete={complete}
      />

      {strategies.length > 0 && !complete && (
        <div className="space-y-3">
          {strategies.map((s) => (
            <div
              key={s.instanceId}
              className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white truncate">
                      {s.symbol ?? s.eaName}
                    </span>
                    {s.symbol && s.eaName !== s.symbol && (
                      <span className="text-xs text-[#7C8DB0]">{s.eaName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8]" />
                      Discovered
                    </span>
                    <span className="text-[10px] text-[#7C8DB0]">
                      Needs baseline to activate monitoring
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {complete && <SuccessBanner message="Strategy discovered and ready for baseline linking." />}

      {!complete && strategies.length > 0 && (
        <div className="rounded-xl bg-[rgba(79,70,229,0.04)] border border-[rgba(79,70,229,0.12)] p-4 space-y-2">
          <p className="text-xs font-medium text-[#818CF8]">What happens next?</p>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            Once you link a baseline backtest, AlgoStudio will continuously compare your live
            results against it. You&apos;ll get:
          </p>
          <ul className="space-y-1.5 text-[11px] text-[#94A3B8]">
            <li className="flex items-start gap-2">
              <span className="text-[#10B981] mt-0.5">&#10003;</span>
              <span>
                <strong className="text-white">Edge Score</strong> — see if your live performance
                matches your backtest
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10B981] mt-0.5">&#10003;</span>
              <span>
                <strong className="text-white">Drift Detection</strong> — get alerted when your
                strategy starts behaving differently
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10B981] mt-0.5">&#10003;</span>
              <span>
                <strong className="text-white">Health Scoring</strong> — a 0–100 score tracking your
                strategy&apos;s reliability over time
              </span>
            </li>
          </ul>
        </div>
      )}

      {!complete && strategies.length === 0 && (
        <WaitingPulse message="Waiting for strategy discovery..." />
      )}
    </div>
  );
}

// ── Step 4: Link baseline ─────────────────────────────────

function InlineBacktestUpload({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      setError("Please upload an HTML file from MT5 Strategy Tester.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large (max 5 MB).");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backtest/upload", {
        method: "POST",
        headers: getCsrfHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Upload failed");
      }
      setSuccess(true);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (success) {
    return <SuccessBanner message="Backtest uploaded. Evaluating your strategy..." />;
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      className={`relative rounded-xl border-2 border-dashed transition-colors p-6 text-center ${
        dragging
          ? "border-[#4F46E5] bg-[rgba(79,70,229,0.08)]"
          : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.15)]"
      }`}
    >
      {uploading ? (
        <div className="flex items-center justify-center gap-2">
          <SpinnerIcon />
          <span className="text-sm text-[#94A3B8]">Uploading and analyzing...</span>
        </div>
      ) : (
        <>
          <svg
            className="w-8 h-8 mx-auto mb-2 text-[#7C8DB0]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <p className="text-sm text-[#94A3B8] mb-1">Drag your MT5 backtest report here</p>
          <p className="text-[11px] text-[#7C8DB0] mb-3">or click to browse</p>
          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#6366F1] transition-colors cursor-pointer">
            Choose File
            <input
              type="file"
              accept=".html,.htm"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        </>
      )}
      {error && <p className="mt-3 text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
}

function StepLinkBaseline({
  complete,
  strategies,
  hasBacktest,
  availableBaselines,
  onRefresh,
}: {
  complete: boolean;
  strategies: DiscoveredStrategy[];
  hasBacktest: boolean;
  availableBaselines: AvailableBaseline[];
  onRefresh: () => void;
}) {
  // Find the first strategy that doesn't have a baseline yet (not in monitoring states)
  const MONITORING_STATES = new Set(["LIVE_MONITORING", "EDGE_AT_RISK", "INVALIDATED"]);
  const linkableStrategy = strategies.find((s) => !MONITORING_STATES.has(s.lifecycleState));
  const displayStrategy = linkableStrategy ?? strategies[0];
  const hasLinkableBaseline = availableBaselines.length > 0;
  const bestBaseline = availableBaselines[0] ?? null;

  return (
    <div className="space-y-5">
      <StepHeader
        stepNumber={4}
        title={
          complete
            ? "Baseline linked"
            : hasLinkableBaseline
              ? "Baseline ready to link"
              : "Add a baseline backtest"
        }
        subtitle={
          complete
            ? "Baseline linked to strategy"
            : hasLinkableBaseline
              ? "Link your backtest baseline to activate monitoring for your discovered strategy."
              : "AlgoStudio compares live behavior against a baseline backtest. This enables health scoring, drift detection, and edge-at-risk alerts."
        }
        complete={complete}
      />

      {!complete && !hasLinkableBaseline && (
        <>
          <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-5 space-y-4">
            <p className="text-sm text-[#94A3B8]">
              Upload your strategy&apos;s backtest report from MT5 Strategy Tester. AlgoStudio uses
              it to detect when live performance drifts from what you tested.
            </p>
            <InlineBacktestUpload onUploaded={onRefresh} />
          </div>
        </>
      )}

      {!complete && hasLinkableBaseline && (
        <>
          <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-5 space-y-4">
            {/* Show best available baseline */}
            {bestBaseline && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-[#10B981]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {bestBaseline.eaName ?? bestBaseline.symbol}
                    {bestBaseline.eaName && bestBaseline.symbol !== bestBaseline.eaName && (
                      <span className="text-[#7C8DB0] font-normal"> ({bestBaseline.symbol})</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-[#7C8DB0]">
                    <span>{bestBaseline.totalTrades} trades</span>
                    <span>WR {(bestBaseline.winRate * 100).toFixed(0)}%</span>
                    <span>PF {bestBaseline.profitFactor.toFixed(2)}</span>
                    <span>Score {bestBaseline.healthScore}</span>
                  </div>
                </div>
              </div>
            )}

            {displayStrategy && (
              <div className="flex items-center justify-between pt-3 border-t border-[rgba(79,70,229,0.1)]">
                <div className="min-w-0">
                  <p className="text-xs text-[#7C8DB0]">Link to strategy</p>
                  <p className="text-sm font-medium text-white truncate">
                    {displayStrategy.symbol ?? displayStrategy.eaName}
                  </p>
                </div>
                <Link
                  href={`/app/live?relink=${displayStrategy.instanceId}`}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#6366F1] transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Link baseline backtest
                </Link>
              </div>
            )}
          </div>

          <WaitingPulse message="Waiting for baseline to be linked..." />
        </>
      )}

      {complete && (
        <SuccessBanner message="Baseline linked. Strategy is being activated for monitoring." />
      )}
    </div>
  );
}

// ── Step 5: Monitoring active ─────────────────────────────

function StepMonitoringActive({
  instance,
}: {
  instance: {
    instanceId: string;
    eaName: string;
    symbol: string | null;
    healthStatus: string | null;
    driftDetected: boolean;
  } | null;
}) {
  const healthLabel =
    instance?.healthStatus === "HEALTHY"
      ? "Healthy"
      : instance?.healthStatus === "WARNING"
        ? "Warning"
        : instance?.healthStatus === "DEGRADED"
          ? "Edge at Risk"
          : instance?.healthStatus === "INSUFFICIENT_DATA"
            ? "Collecting data"
            : "Awaiting first evaluation";

  const healthColor =
    instance?.healthStatus === "HEALTHY"
      ? "#10B981"
      : instance?.healthStatus === "WARNING"
        ? "#F59E0B"
        : instance?.healthStatus === "DEGRADED"
          ? "#EF4444"
          : "#7C8DB0";

  return (
    <div className="space-y-5">
      <StepHeader
        stepNumber={5}
        title="Monitoring active"
        subtitle="Your strategy is now being monitored against its baseline."
        complete
      />

      <div className="rounded-xl bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.2)] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#10B981]/15 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[#10B981]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white">Strategy monitoring active</p>
            {instance && (
              <p className="text-xs text-[#7C8DB0] mt-0.5">
                {instance.eaName}
                {instance.symbol ? ` (${instance.symbol})` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(16,185,129,0.1)]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Health</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: healthColor }} />
              <span className="text-sm font-medium" style={{ color: healthColor }}>
                {healthLabel}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Drift</p>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${instance?.driftDetected ? "bg-[#EF4444]" : "bg-[#10B981]"}`}
              />
              <span
                className={`text-sm font-medium ${instance?.driftDetected ? "text-[#EF4444]" : "text-[#10B981]"}`}
              >
                {instance?.driftDetected ? "Detected" : "Not detected"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/app/live"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#6366F1] transition-colors"
        >
          Go to Command Center
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        {instance && (
          <Link
            href={`/app/strategy/${instance.instanceId}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[rgba(79,70,229,0.3)] text-[#A78BFA] text-sm font-medium hover:bg-[#4F46E5]/10 transition-colors"
          >
            View Strategy Detail
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────

function StepHeader({
  stepNumber,
  title,
  subtitle,
  complete,
}: {
  stepNumber: number;
  title: string;
  subtitle: string;
  complete: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
        Step {stepNumber} of {TOTAL_STEPS}
      </p>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-sm text-[#94A3B8] mt-1">{subtitle}</p>
    </div>
  );
}

function StepBullet({ n }: { n: number }) {
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4F46E5]/20 text-[#A78BFA] text-xs flex items-center justify-center font-medium mt-0.5">
      {n}
    </span>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#7C8DB0]">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-[#10B981]" : "bg-[#F59E0B] animate-pulse"}`}
        />
        <span className={ok ? "text-[#10B981] font-medium" : "text-[#F59E0B]"}>{value}</span>
      </div>
    </div>
  );
}

function WaitingPulse({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[rgba(79,70,229,0.06)] border border-[rgba(79,70,229,0.12)] px-4 py-3">
      <div className="relative flex-shrink-0">
        <span className="block w-2.5 h-2.5 rounded-full bg-[#818CF8] animate-pulse" />
        <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#818CF8] animate-ping opacity-30" />
      </div>
      <p className="text-xs text-[#94A3B8]">{message}</p>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] px-4 py-3">
      <div className="w-5 h-5 rounded-full bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
        <CheckIcon />
      </div>
      <p className="text-xs text-[#10B981] font-medium">{message}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export function OnboardingClient() {
  const { data, loading, refetch } = useOnboardingStatus();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Setting up AlgoStudio</h1>
          <p className="text-sm text-[#7C8DB0] mt-2">Loading your setup progress...</p>
        </div>
        <div className="flex justify-center py-12">
          <SpinnerIcon />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#7C8DB0]">Unable to load onboarding status. Please refresh.</p>
      </div>
    );
  }

  const currentStep = data.currentStep;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">
          {currentStep === 5 ? "You're all set" : "Get started with AlgoStudio"}
        </h1>
        <p className="text-sm text-[#7C8DB0] mt-2">
          {currentStep === 5
            ? "Your strategy is being monitored."
            : "Connect your terminal and start monitoring in minutes."}
        </p>
      </div>

      {/* Progress */}
      <ProgressBar currentStep={currentStep} />

      {/* Active step content — show completed steps collapsed, active step expanded */}
      {currentStep >= 2 && <StepConnectTerminal complete />}
      {currentStep === 1 && <StepConnectTerminal complete={false} />}

      {currentStep >= 3 && <StepWaitingForTrades complete terminal={data.terminal} />}
      {currentStep === 2 && <StepWaitingForTrades complete={false} terminal={data.terminal} />}

      {currentStep >= 4 && (
        <StepStrategyDiscovered complete strategies={data.discoveredStrategies} />
      )}
      {currentStep === 3 && (
        <StepStrategyDiscovered complete={false} strategies={data.discoveredStrategies} />
      )}

      {currentStep >= 5 && (
        <StepLinkBaseline
          complete
          strategies={data.discoveredStrategies}
          hasBacktest={data.hasBacktest}
          availableBaselines={data.availableBaselines}
          onRefresh={refetch}
        />
      )}
      {currentStep === 4 && (
        <StepLinkBaseline
          complete={false}
          strategies={data.discoveredStrategies}
          hasBacktest={data.hasBacktest}
          availableBaselines={data.availableBaselines}
          onRefresh={refetch}
        />
      )}

      {currentStep === 5 && <StepMonitoringActive instance={data.monitoringInstance} />}
    </div>
  );
}
