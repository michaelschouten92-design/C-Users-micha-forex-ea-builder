"use client";

import Link from "next/link";
import { useState } from "react";

interface ProofEvent {
  createdAt: string;
  type: string;
  sessionId: string | null;
  payload: Record<string, unknown> | null;
  sequence: number | null;
  eventHash: string | null;
  prevEventHash: string | null;
}

interface ChainVerification {
  valid: boolean;
  chainLength: number;
  breakAtSequence?: number;
  error?: string;
}

const inputClass =
  "w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors";

const labelClass = "block text-xs text-[#7C8DB0] mb-1";

function ProofEventsForm() {
  const [strategyId, setStrategyId] = useState("");
  const [internalApiKey, setInternalApiKey] = useState("");
  const [limit, setLimit] = useState("");
  const [verifyChain, setVerifyChain] = useState(false);
  const [recordId, setRecordId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ProofEvent[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [chainVerification, setChainVerification] = useState<ChainVerification | null>(null);

  function toggleExpand(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEvents(null);
    setExpanded(new Set());
    setChainVerification(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({ strategyId });
      if (limit.trim()) {
        params.set("limit", limit.trim());
      }
      if (verifyChain) {
        params.set("verify", "true");
        if (recordId.trim()) {
          params.set("recordId", recordId.trim());
        }
      }

      const res = await fetch(`/api/internal/proof-events?${params.toString()}`, {
        headers: { "x-internal-api-key": internalApiKey },
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized \u2014 check your API key");
        } else if (res.status === 400) {
          setError(json.error || "Bad request");
        } else if (res.status === 429) {
          setError("Rate limited \u2014 try again shortly");
        } else {
          setError(json.error || "Unexpected error");
        }
        return;
      }

      setEvents(json.data as ProofEvent[]);
      if (json.chainVerification) {
        setChainVerification(json.chainVerification as ChainVerification);
      }
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

        {/* Limit */}
        <div>
          <label className={labelClass}>Limit (optional)</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className={inputClass}
            placeholder="50"
            min={1}
            max={200}
          />
        </div>

        {/* Verify hash chain */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="verifyChain"
            checked={verifyChain}
            onChange={(e) => setVerifyChain(e.target.checked)}
            className="accent-[#4F46E5]"
          />
          <label htmlFor="verifyChain" className="text-xs text-[#7C8DB0]">
            Verify hash chain
          </label>
        </div>

        {/* Record ID for verification */}
        {verifyChain && (
          <div>
            <label className={labelClass}>Record ID (required for verify)</label>
            <input
              type="text"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              className={inputClass}
              placeholder="e.g. a1b2c3d4-e5f6-..."
              required={verifyChain}
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !strategyId.trim()}
          className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {loading ? "Loading\u2026" : "Load Events"}
        </button>

        {/* Error display */}
        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-xs whitespace-pre-wrap">
            {error}
          </div>
        )}
      </form>

      {/* Chain verification banner */}
      {chainVerification && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            chainVerification.valid
              ? "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22C55E]"
              : "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444]"
          }`}
        >
          {chainVerification.valid
            ? `CHAIN VALID \u2014 ${chainVerification.chainLength} event${chainVerification.chainLength !== 1 ? "s" : ""}`
            : `CHAIN BROKEN \u2014 break at seq #${chainVerification.breakAtSequence}${chainVerification.error ? `: ${chainVerification.error}` : ""}`}
        </div>
      )}

      {/* Results table */}
      {events && (
        <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-2">
          <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider mb-2">
            {events.length} event{events.length !== 1 && "s"}
          </h3>

          {events.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">No events found for this strategy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[rgba(79,70,229,0.2)] text-[#7C8DB0] uppercase tracking-wider">
                    <th className="py-2 pr-4">Seq</th>
                    <th className="py-2 pr-4">Created At</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Hash</th>
                    <th className="py-2 pr-4">Record ID</th>
                    <th className="py-2">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt, i) => (
                    <tr key={i} className="border-b border-[rgba(79,70,229,0.1)] align-top">
                      <td className="py-2 pr-4 text-[#A78BFA] font-mono">
                        {evt.sequence ?? "\u2014"}
                      </td>
                      <td className="py-2 pr-4 text-[#94A3B8] font-mono whitespace-nowrap">
                        {new Date(evt.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-white font-mono">{evt.type}</td>
                      <td
                        className="py-2 pr-4 text-[#94A3B8] font-mono"
                        title={evt.eventHash ?? undefined}
                      >
                        {evt.eventHash ? evt.eventHash.slice(0, 12) : "\u2014"}
                      </td>
                      <td className="py-2 pr-4 text-[#94A3B8] font-mono">
                        {evt.sessionId ?? "\u2014"}
                      </td>
                      <td className="py-2">
                        {evt.payload ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(i)}
                            className="text-[#22D3EE] hover:text-[#67E8F9] transition-colors"
                          >
                            {expanded.has(i) ? "collapse" : "expand"}
                          </button>
                        ) : (
                          <span className="text-[#475569]">null</span>
                        )}
                        {expanded.has(i) && evt.payload && (
                          <pre className="mt-2 p-2 bg-[#0F0318] rounded text-[#CBD5E1] overflow-x-auto">
                            {JSON.stringify(evt.payload, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProofAuditViewPage() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Proof Audit View
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

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <ProofEventsForm />
      </main>
    </div>
  );
}
