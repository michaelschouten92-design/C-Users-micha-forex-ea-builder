"use client";

import Link from "next/link";
import { useState } from "react";

const LIFECYCLE_STATES = [
  "DRAFT",
  "BACKTESTED",
  "VERIFIED",
  "LIVE_MONITORING",
  "EDGE_AT_RISK",
  "INVALIDATED",
] as const;

interface VerificationScores {
  composite: number;
  walkForwardDegradationPct: number | null;
  walkForwardOosSampleSize: number | null;
  monteCarloRuinProbability: number | null;
  sampleSize: number;
}

interface ThresholdsUsed {
  configVersion: string;
  thresholdsHash: string;
  minTradeCount: number;
  readyConfidenceThreshold: number;
  notDeployableThreshold: number;
  maxSharpeDegradationPct: number;
  extremeSharpeDegradationPct: number;
  minOosTradeCount: number;
  ruinProbabilityCeiling: number;
  monteCarloIterations?: number;
}

interface VerifyResponse {
  verdictResult: {
    strategyId: string;
    strategyVersion: number;
    verdict: "READY" | "UNCERTAIN" | "NOT_DEPLOYABLE";
    reasonCodes: string[];
    scores: VerificationScores;
    thresholdsUsed: ThresholdsUsed;
    warnings: string[];
  };
  lifecycleState: string;
  decision: { kind: string; from?: string; to?: string; reason?: string };
  configSource: "db" | "fallback" | "missing";
  monteCarloSeed?: number;
}

const VERDICT_STYLES: Record<string, string> = {
  READY: "bg-emerald-500/20 text-emerald-400",
  UNCERTAIN: "bg-amber-500/20 text-amber-400",
  NOT_DEPLOYABLE: "bg-red-500/20 text-red-400",
};

const inputClass =
  "w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors";

const textareaClass =
  "w-full px-3 py-2 text-xs font-mono bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg text-[#CBD5E1] placeholder-[#475569] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none resize-none";

const labelClass = "block text-xs text-[#7C8DB0] mb-1";

const sampleBtnClass =
  "px-2 py-1 text-xs rounded border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.5)] transition-colors";

function makeTrades(count: number): string {
  const trades = Array.from({ length: count }, (_, i) => ({
    pair: "EURUSD",
    pnl: 100,
    entryTime: `2024-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
  }));
  return JSON.stringify(trades, null, 2);
}

interface SamplePayload {
  strategyId: string;
  strategyVersion: string;
  currentLifecycleState: string;
  tradeHistory: string;
  backtestParameters: string;
  intermediateResults: string;
}

const SAMPLES: { label: string; style: string; payload: SamplePayload }[] = [
  {
    label: "READY sample",
    style: "text-emerald-400",
    payload: {
      strategyId: "sample-ready",
      strategyVersion: "1",
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(30),
      backtestParameters: "{}",
      intermediateResults: JSON.stringify({ robustnessScores: { composite: 1.0 } }, null, 2),
    },
  },
  {
    label: "UNCERTAIN sample",
    style: "text-amber-400",
    payload: {
      strategyId: "sample-uncertain",
      strategyVersion: "1",
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(30),
      backtestParameters: "{}",
      intermediateResults: JSON.stringify({ robustnessScores: { composite: 0.5 } }, null, 2),
    },
  },
  {
    label: "NOT_DEPLOYABLE sample",
    style: "text-red-400",
    payload: {
      strategyId: "sample-not-deployable",
      strategyVersion: "1",
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(10),
      backtestParameters: "{}",
      intermediateResults: "",
    },
  },
];

function tryParseJson(
  value: string,
  fieldName: string
): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(value) };
  } catch {
    return { ok: false, error: `${fieldName}: Invalid JSON` };
  }
}

/** Infer D1 tier from reason codes and scores — avoids adding tier to the API surface. */
function inferD1Tier(res: VerifyResponse): string {
  const codes = res.verdictResult.reasonCodes;
  const deg = res.verdictResult.scores.walkForwardDegradationPct;
  const oos = res.verdictResult.scores.walkForwardOosSampleSize;
  const t = res.verdictResult.thresholdsUsed;
  if (deg === null) return "—";
  if (codes.includes("WALK_FORWARD_DEGRADATION_EXTREME")) {
    if (deg > t.extremeSharpeDegradationPct) return "D1c (extreme)";
    return "D1a (moderate + sufficient OOS)";
  }
  if (codes.includes("WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE")) return "D1b (moderate + thin OOS)";
  return `pass (${deg}% <= ${t.maxSharpeDegradationPct}%${oos !== null ? `, OOS=${oos}` : ""})`;
}

function VerifyForm() {
  const [internalApiKey, setInternalApiKey] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [strategyVersion, setStrategyVersion] = useState("");
  const [currentLifecycleState, setCurrentLifecycleState] = useState<string>("BACKTESTED");
  const [tradeHistory, setTradeHistory] = useState("");
  const [backtestParameters, setBacktestParameters] = useState("");
  const [intermediateResults, setIntermediateResults] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  function loadSample(p: SamplePayload) {
    setStrategyId(p.strategyId);
    setStrategyVersion(p.strategyVersion);
    setCurrentLifecycleState(p.currentLifecycleState);
    setTradeHistory(p.tradeHistory);
    setBacktestParameters(p.backtestParameters);
    setIntermediateResults(p.intermediateResults);
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Parse JSON fields
    const parsedTrades = tryParseJson(tradeHistory || "[]", "Trade History");
    if (!parsedTrades.ok) {
      setError(parsedTrades.error);
      return;
    }

    const parsedBacktest = tryParseJson(backtestParameters || "{}", "Backtest Parameters");
    if (!parsedBacktest.ok) {
      setError(parsedBacktest.error);
      return;
    }

    let parsedIntermediate: unknown | undefined;
    if (intermediateResults.trim()) {
      const parsed = tryParseJson(intermediateResults, "Intermediate Results");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      parsedIntermediate = parsed.data;
    }

    const requestBody: Record<string, unknown> = {
      strategyId,
      strategyVersion: Number(strategyVersion),
      currentLifecycleState,
      tradeHistory: parsedTrades.data,
      backtestParameters: parsedBacktest.data,
    };
    if (parsedIntermediate !== undefined) {
      requestBody.intermediateResults = parsedIntermediate;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/internal/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalApiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized — check your API key");
        } else if (res.status === 400) {
          setError(
            json.details ? JSON.stringify(json.details, null, 2) : json.error || "Bad request"
          );
        } else if (res.status === 429) {
          setError("Rate limited — try again shortly");
        } else {
          setError(json.error || "Unexpected error");
        }
        return;
      }

      setResult(json as VerifyResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sample payload buttons */}
      <div className="flex gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => loadSample(s.payload)}
            className={`${sampleBtnClass} ${s.style}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* API Key */}
        <div>
          <label className={labelClass}>Internal API Key</label>
          <input
            type="password"
            value={internalApiKey}
            onChange={(e) => setInternalApiKey(e.target.value)}
            className={inputClass}
            placeholder="Enter x-internal-api-key"
            required
          />
        </div>

        {/* Strategy ID + Version row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Strategy ID</label>
            <input
              type="text"
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className={inputClass}
              placeholder="e.g. strat_abc123"
              required
              minLength={1}
            />
          </div>
          <div>
            <label className={labelClass}>Strategy Version</label>
            <input
              type="number"
              value={strategyVersion}
              onChange={(e) => setStrategyVersion(e.target.value)}
              className={inputClass}
              placeholder="e.g. 1"
              required
              min={1}
              step={1}
            />
          </div>
        </div>

        {/* Lifecycle State */}
        <div>
          <label className={labelClass}>Current Lifecycle State</label>
          <select
            value={currentLifecycleState}
            onChange={(e) => setCurrentLifecycleState(e.target.value)}
            className={inputClass}
          >
            {LIFECYCLE_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Trade History */}
        <div>
          <label className={labelClass}>Trade History (JSON array)</label>
          <textarea
            value={tradeHistory}
            onChange={(e) => setTradeHistory(e.target.value)}
            className={`${textareaClass} h-48`}
            placeholder={`[\n  { "pair": "EURUSD", "pnl": 120, "entryTime": "2024-01-15T10:00:00Z" },\n  { "pair": "GBPUSD", "pnl": -40, "entryTime": "2024-01-16T14:30:00Z" }\n]`}
          />
        </div>

        {/* Backtest Parameters */}
        <div>
          <label className={labelClass}>Backtest Parameters (JSON object)</label>
          <textarea
            value={backtestParameters}
            onChange={(e) => setBacktestParameters(e.target.value)}
            className={`${textareaClass} h-32`}
            placeholder="{}"
          />
        </div>

        {/* Intermediate Results */}
        <div>
          <label className={labelClass}>Intermediate Results (JSON object, optional)</label>
          <textarea
            value={intermediateResults}
            onChange={(e) => setIntermediateResults(e.target.value)}
            className={`${textareaClass} h-32`}
            placeholder={`{ "robustnessScores": { "composite": 0.82 } }`}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !internalApiKey || !strategyId || !strategyVersion}
          className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {submitting ? "Verifying\u2026" : "Run Verification"}
        </button>

        {/* Error display */}
        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-xs whitespace-pre-wrap">
            {error}
          </div>
        )}
      </form>

      {/* Result card */}
      {result && (
        <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-4">
          {/* Verdict */}
          <div>
            <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider mb-2">Verdict</h3>
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-bold ${VERDICT_STYLES[result.verdictResult.verdict] ?? "bg-gray-500/20 text-gray-400"}`}
              >
                {result.verdictResult.verdict}
              </span>
              <span className="text-xs text-[#94A3B8]">
                {result.verdictResult.reasonCodes.join(", ")}
              </span>
            </div>
            {result.verdictResult.warnings.length > 0 && (
              <div className="mt-2 text-xs text-amber-400">
                Warnings: {result.verdictResult.warnings.join("; ")}
              </div>
            )}
          </div>

          {/* Lifecycle */}
          <div>
            <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider mb-2">Lifecycle</h3>
            <div className="text-sm text-white">
              State: <span className="font-mono text-[#22D3EE]">{result.lifecycleState}</span>
              <span className="mx-3 text-[#475569]">|</span>
              Decision: <span className="font-mono text-[#22D3EE]">{result.decision.kind}</span>
              {result.decision.reason && (
                <span className="ml-1 text-[#7C8DB0]">({result.decision.reason})</span>
              )}
            </div>
          </div>

          {/* Scores */}
          <div>
            <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider mb-2">Scores</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(result.verdictResult.scores).map(([key, val]) => (
                <div key={key} className="bg-[#0F0318] rounded px-2 py-1.5">
                  <span className="text-[#7C8DB0]">{key}:</span>{" "}
                  <span className="text-white font-mono">
                    {val === null ? "null" : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Details */}
          <div>
            <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider mb-2">
              Verification Details
            </h3>
            <div className="space-y-3">
              {/* Config */}
              <div className="bg-[#0F0318] rounded p-3 space-y-1.5">
                <h4 className="text-xs text-[#A78BFA] font-medium">Config</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                  <div>
                    <span className="text-[#7C8DB0]">configVersion: </span>
                    <span className="text-white font-mono">
                      {result.verdictResult.thresholdsUsed.configVersion}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7C8DB0]">configSource: </span>
                    <span className="text-white font-mono">{result.configSource}</span>
                  </div>
                  <div>
                    <span className="text-[#7C8DB0]">thresholdsHash: </span>
                    <span
                      className="text-white font-mono"
                      title={result.verdictResult.thresholdsUsed.thresholdsHash}
                    >
                      {result.verdictResult.thresholdsUsed.thresholdsHash.slice(0, 16)}&hellip;
                    </span>
                  </div>
                </div>
              </div>

              {/* D1 Walk-Forward */}
              <div className="bg-[#0F0318] rounded p-3 space-y-1.5">
                <h4 className="text-xs text-[#A78BFA] font-medium">D1 Walk-Forward Degradation</h4>
                {result.verdictResult.scores.walkForwardDegradationPct !== null ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <div>
                        <span className="text-[#7C8DB0]">degradation: </span>
                        <span className="text-white font-mono">
                          {result.verdictResult.scores.walkForwardDegradationPct}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7C8DB0]">OOS trades: </span>
                        <span className="text-white font-mono">
                          {result.verdictResult.scores.walkForwardOosSampleSize ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7C8DB0]">max: </span>
                        <span className="text-white font-mono">
                          {result.verdictResult.thresholdsUsed.maxSharpeDegradationPct}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7C8DB0]">extreme: </span>
                        <span className="text-white font-mono">
                          {result.verdictResult.thresholdsUsed.extremeSharpeDegradationPct}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[#7C8DB0]">tier: </span>
                      <span className="text-white font-mono">{inferD1Tier(result)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#475569]">Not evaluated (no walk-forward data)</p>
                )}
              </div>

              {/* D2 Monte Carlo */}
              <div className="bg-[#0F0318] rounded p-3 space-y-1.5">
                <h4 className="text-xs text-[#A78BFA] font-medium">D2 Monte Carlo Ruin</h4>
                {result.verdictResult.scores.monteCarloRuinProbability !== null ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    <div>
                      <span className="text-[#7C8DB0]">ruinProbability: </span>
                      <span
                        className={`font-mono ${result.verdictResult.scores.monteCarloRuinProbability > result.verdictResult.thresholdsUsed.ruinProbabilityCeiling ? "text-red-400" : "text-white"}`}
                      >
                        {result.verdictResult.scores.monteCarloRuinProbability.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#7C8DB0]">ceiling: </span>
                      <span className="text-white font-mono">
                        {result.verdictResult.thresholdsUsed.ruinProbabilityCeiling}
                      </span>
                    </div>
                    {result.verdictResult.thresholdsUsed.monteCarloIterations != null && (
                      <div>
                        <span className="text-[#7C8DB0]">iterations: </span>
                        <span className="text-white font-mono">
                          {result.verdictResult.thresholdsUsed.monteCarloIterations.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {result.monteCarloSeed != null && (
                      <div>
                        <span className="text-[#7C8DB0]">seed: </span>
                        <span className="text-white font-mono">{result.monteCarloSeed}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#475569]">Not evaluated (no MC data or seed)</p>
                )}
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div>
            <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider mb-2">Thresholds</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(result.verdictResult.thresholdsUsed).map(([key, val]) => (
                <div key={key} className="bg-[#0F0318] rounded px-2 py-1.5">
                  <span className="text-[#7C8DB0]">{key}:</span>{" "}
                  <span className="text-white font-mono">
                    {val === null || val === undefined ? "null" : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreLiveRitualPage() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Pre-Live Ritual
              </span>
            </div>
            <Link
              href="/app"
              className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <VerifyForm />
      </main>
    </div>
  );
}
