"use client";

import { useState } from "react";
import Link from "next/link";
import { getCsrfHeaders } from "@/lib/api-client";
import { EXAMPLE_PROMPTS } from "@/lib/ai-strategy-generator";

interface GenerationResult {
  summary: string;
  remaining: number | null;
  projectUrl?: string;
}

export default function AIGeneratorPage() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [buildJson, setBuildJson] = useState<unknown>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    setBuildJson(null);

    try {
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ description }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || "Generation failed");
      }

      setBuildJson(data.buildJson);
      setResult({
        summary: data.summary,
        remaining: data.remaining,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenInBuilder() {
    if (!buildJson) return;
    setCreatingProject(true);
    setError("");

    try {
      // Create a new project
      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          name: `AI: ${description.slice(0, 60)}`,
          description: `AI-generated strategy from: "${description}"`,
        }),
      });

      if (!projectRes.ok) {
        const data = await projectRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create project");
      }

      const project = await projectRes.json();

      // Save the build JSON as version 1
      const versionRes = await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ buildJson }),
      });

      if (!versionRes.ok) {
        const data = await versionRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save strategy");
      }

      // Redirect to builder
      window.location.href = `/app/projects/${project.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open in builder");
    } finally {
      setCreatingProject(false);
    }
  }

  function handleExampleClick(prompt: string) {
    setDescription(prompt);
    setShowExamples(false);
    setResult(null);
    setError("");
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors"
              >
                AlgoStudio
              </Link>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                AI Generator
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/app"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/app/community"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Marketplace
              </Link>
              <Link
                href="/app/settings"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">AI Strategy Generator</h1>
          <p className="text-[#94A3B8] text-lg">
            Describe your trading strategy in plain English and get a ready-to-use node layout.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label
              htmlFor="strategy-description"
              className="block text-sm font-medium text-[#CBD5E1] mb-2"
            >
              Describe your trading strategy
            </label>
            <textarea
              id="strategy-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              placeholder="e.g., EMA crossover on H4 with RSI filter during London session..."
              rows={4}
              required
              minLength={5}
              maxLength={1000}
              className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200 resize-none"
            />
            <div className="flex justify-between mt-1">
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="text-xs text-[#A78BFA] hover:text-[#C4B5FD] transition-colors"
              >
                {showExamples ? "Hide examples" : "Show example prompts"}
              </button>
              <span className="text-[10px] text-[#7C8DB0]">{description.length}/1000</span>
            </div>
          </div>

          {/* Example Prompts */}
          {showExamples && (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg p-4">
              <p className="text-xs text-[#94A3B8] mb-3 font-medium">Click an example to use it:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleExampleClick(prompt)}
                    className="text-xs px-3 py-1.5 bg-[rgba(79,70,229,0.15)] border border-[rgba(79,70,229,0.3)] rounded-full text-[#A78BFA] hover:bg-[rgba(79,70,229,0.25)] hover:text-[#C4B5FD] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] text-sm">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            type="submit"
            disabled={loading || description.trim().length < 5}
            className="w-full bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating strategy...
              </span>
            ) : (
              "Generate Strategy"
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-8 space-y-4">
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Generated Strategy</h2>

              <div className="space-y-2 mb-6">
                {result.summary.split("\n").map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#22D3EE] mt-0.5 shrink-0">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm text-[#CBD5E1]">{line}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleOpenInBuilder}
                disabled={creatingProject}
                className="w-full bg-[#22D3EE] text-[#0D0117] px-6 py-3 rounded-lg font-semibold hover:bg-[#67E8F9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {creatingProject ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Creating project...
                  </span>
                ) : (
                  "Open in Builder"
                )}
              </button>

              {/* Backtest This Strategy button */}
              <Link
                href="/app/backtest"
                className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6366F1] transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Backtest This Strategy
              </Link>

              {result.remaining !== null && (
                <p className="text-xs text-[#7C8DB0] mt-3 text-center">
                  {result.remaining} generation{result.remaining !== 1 ? "s" : ""} remaining today
                  (Free plan).{" "}
                  <Link href="/pricing" className="text-[#A78BFA] hover:underline">
                    Upgrade for unlimited
                  </Link>
                </p>
              )}
            </div>

            {/* Parameter Range Suggestions */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3">
                Suggested Parameter Ranges for Optimization
              </h3>
              <p className="text-xs text-[#7C8DB0] mb-4">
                Based on the generated strategy type, here are recommended optimization ranges to
                try in the backtest optimizer.
              </p>
              <div className="space-y-2">
                {(() => {
                  const desc = description.toLowerCase();
                  const suggestions: { param: string; range: string; note: string }[] = [];

                  if (
                    desc.includes("ema") ||
                    desc.includes("moving average") ||
                    desc.includes("ma ")
                  ) {
                    suggestions.push(
                      {
                        param: "Fast MA Period",
                        range: "5 - 50, step 5",
                        note: "Shorter for scalping, longer for swing",
                      },
                      {
                        param: "Slow MA Period",
                        range: "20 - 200, step 10",
                        note: "Should be > fast period",
                      }
                    );
                  }
                  if (desc.includes("rsi")) {
                    suggestions.push(
                      { param: "RSI Period", range: "7 - 21, step 2", note: "Standard is 14" },
                      {
                        param: "RSI Overbought",
                        range: "65 - 80, step 5",
                        note: "Higher = fewer signals",
                      },
                      {
                        param: "RSI Oversold",
                        range: "20 - 35, step 5",
                        note: "Lower = fewer signals",
                      }
                    );
                  }
                  if (desc.includes("bollinger") || desc.includes("bb")) {
                    suggestions.push(
                      { param: "BB Period", range: "14 - 30, step 2", note: "Standard is 20" },
                      {
                        param: "BB Deviation",
                        range: "1.5 - 3.0, step 0.5",
                        note: "Standard is 2.0",
                      }
                    );
                  }
                  if (desc.includes("macd")) {
                    suggestions.push(
                      { param: "MACD Fast", range: "8 - 16, step 2", note: "Standard is 12" },
                      { param: "MACD Slow", range: "20 - 30, step 2", note: "Standard is 26" },
                      { param: "MACD Signal", range: "7 - 12, step 1", note: "Standard is 9" }
                    );
                  }
                  if (desc.includes("breakout")) {
                    suggestions.push(
                      {
                        param: "Lookback Period",
                        range: "10 - 50, step 5",
                        note: "Higher = stronger breakouts",
                      },
                      {
                        param: "ATR Multiplier",
                        range: "1.0 - 3.0, step 0.5",
                        note: "For SL/TP distance",
                      }
                    );
                  }

                  // Always suggest risk parameters
                  suggestions.push(
                    {
                      param: "Risk %",
                      range: "0.5 - 3.0, step 0.5",
                      note: "Per-trade risk as % of balance",
                    },
                    { param: "SL Pips", range: "10 - 50, step 5", note: "Tighter for scalping" }
                  );

                  return suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 px-3 rounded bg-[rgba(79,70,229,0.05)] border border-[rgba(79,70,229,0.1)]"
                    >
                      <div>
                        <span className="text-xs font-medium text-[#CBD5E1]">{s.param}</span>
                        <span className="text-[10px] text-[#7C8DB0] ml-2">{s.note}</span>
                      </div>
                      <span className="text-xs text-[#A78BFA] font-mono">{s.range}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-1">Keyword Detection</h3>
            <p className="text-xs text-[#7C8DB0]">
              Recognizes indicators (EMA, RSI, MACD, Bollinger), sessions (London, NY, Tokyo),
              timeframes, and risk management.
            </p>
          </div>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-1">Ready-to-Export</h3>
            <p className="text-xs text-[#7C8DB0]">
              Generated strategies use entry strategy nodes with built-in risk management. Export to
              MQL5/MQL4 immediately.
            </p>
          </div>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-1">Fully Customizable</h3>
            <p className="text-xs text-[#7C8DB0]">
              Open in the builder to fine-tune every parameter. Adjust periods, timeframes, risk,
              and add more nodes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
