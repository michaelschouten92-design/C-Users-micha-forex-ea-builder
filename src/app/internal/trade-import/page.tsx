"use client";

import Link from "next/link";
import { useState } from "react";

interface ImportResult {
  insertedCount: number;
  skippedCount: number;
  tradeFactCount: number;
  tradeSnapshotHash: string;
  backtestRunId?: string;
}

const inputClass =
  "w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors";

const labelClass = "block text-xs text-[#7C8DB0] mb-1";

function TradeImportForm() {
  const [strategyId, setStrategyId] = useState("");
  const [source, setSource] = useState<"BACKTEST" | "LIVE">("BACKTEST");
  const [backtestRunId, setBacktestRunId] = useState("");
  const [symbolFallback, setSymbolFallback] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [csv, setCsv] = useState("");
  const [internalApiKey, setInternalApiKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const balance = Number(initialBalance);
      if (!Number.isFinite(balance) || balance <= 0) {
        setError("Initial balance must be a positive number");
        return;
      }

      const res = await fetch("/api/internal/trades/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalApiKey,
        },
        body: JSON.stringify({
          strategyId,
          source,
          csv,
          ...(backtestRunId.trim() && { backtestRunId: backtestRunId.trim() }),
          ...(symbolFallback.trim() && { symbolFallback: symbolFallback.trim() }),
          initialBalance: balance,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized — check your API key");
        } else if (res.status === 429) {
          setError("Rate limited — try again shortly");
        } else if (json.details && Array.isArray(json.details)) {
          setError(`${json.message ?? "Error"}\n${json.details.join("\n")}`);
        } else {
          setError(json.message || json.error || "Unexpected error");
        }
        return;
      }

      setResult(json as ImportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Strategy ID */}
        <div>
          <label className={labelClass}>Strategy ID</label>
          <input
            type="text"
            value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)}
            className={inputClass}
            placeholder="e.g. strat_abc123"
            required
          />
        </div>

        {/* Source */}
        <div>
          <label className={labelClass}>Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as "BACKTEST" | "LIVE")}
            className={inputClass}
          >
            <option value="BACKTEST">BACKTEST</option>
            <option value="LIVE">LIVE</option>
          </select>
        </div>

        {/* Backtest Run ID */}
        <div>
          <label className={labelClass}>Backtest Run ID (optional)</label>
          <input
            type="text"
            value={backtestRunId}
            onChange={(e) => setBacktestRunId(e.target.value)}
            className={inputClass}
            placeholder="e.g. run_abc123"
          />
        </div>

        {/* Symbol Fallback */}
        <div>
          <label className={labelClass}>Symbol Fallback (optional)</label>
          <input
            type="text"
            value={symbolFallback}
            onChange={(e) => setSymbolFallback(e.target.value)}
            className={inputClass}
            placeholder="e.g. EURUSD"
          />
        </div>

        {/* Initial Balance */}
        <div>
          <label className={labelClass}>Initial Balance</label>
          <input
            type="text"
            inputMode="decimal"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            className={inputClass}
            placeholder="e.g. 10000"
            required
          />
        </div>

        {/* Internal API Key */}
        <div>
          <label className={labelClass}>Internal API Key</label>
          <input
            type="password"
            value={internalApiKey}
            onChange={(e) => setInternalApiKey(e.target.value)}
            className={inputClass}
            placeholder="Enter x-internal-api-key"
            autoComplete="off"
            required
          />
        </div>

        {/* CSV */}
        <div>
          <label className={labelClass}>CSV Data</label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className={`${inputClass} min-h-[200px] font-mono text-xs`}
            placeholder={`ticket,openTime,type,volume,price,profit\n1001,2025-01-15T10:30:00Z,buy,0.1,1.1234,50.25`}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
        >
          {loading ? "Importing…" : "Import CSV"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded space-y-2">
          <h3 className="text-sm font-medium text-emerald-400">Import Successful</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#7C8DB0]">Inserted: </span>
              <span className="text-white font-mono">{result.insertedCount}</span>
            </div>
            <div>
              <span className="text-[#7C8DB0]">Skipped (duplicates): </span>
              <span className="text-white font-mono">{result.skippedCount}</span>
            </div>
            <div>
              <span className="text-[#7C8DB0]">Total Facts: </span>
              <span className="text-white font-mono">{result.tradeFactCount}</span>
            </div>
            {result.backtestRunId && (
              <div>
                <span className="text-[#7C8DB0]">Backtest Run ID: </span>
                <span className="text-white font-mono">{result.backtestRunId}</span>
              </div>
            )}
          </div>
          <div>
            <span className="text-[#7C8DB0] text-xs">Snapshot Hash: </span>
            <span className="text-[#22D3EE] font-mono text-xs break-all">
              {result.tradeSnapshotHash}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TradeImportPage() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Trade Import
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

      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <TradeImportForm />
      </main>
    </div>
  );
}
