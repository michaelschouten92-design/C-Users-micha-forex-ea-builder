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

const VERDICT_STYLES: Record<string, string> = {
  READY: "text-emerald-400",
  UNCERTAIN: "text-amber-400",
  NOT_DEPLOYABLE: "text-red-400",
};

/** Keys safe to display for any event payload. */
const PAYLOAD_WHITELIST = new Set([
  "eventType",
  "verdict",
  "reasonCodes",
  "configVersion",
  "configSource",
  "thresholdsHash",
  "monteCarloSeed",
  "monteCarloIterations",
  "recordId",
  "strategyId",
  "strategyVersion",
  "timestamp",
  "tradeSnapshotHash",
  "tradeFactCount",
  "snapshotRange",
  "dataSources",
]);

/** Keys explicitly excluded — never shown even in "details" view. */
const PAYLOAD_BLOCKLIST = new Set(["ipHash", "userAgent", "referrer", "userId", "sessionId"]);

const MAX_STRING_LEN = 80;
const MAX_ARRAY_DISPLAY = 10;

/** Render a single payload value with capping for large strings/arrays. */
function renderValue(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "string") {
    return value.length > MAX_STRING_LEN ? value.slice(0, MAX_STRING_LEN) + "\u2026" : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length <= MAX_ARRAY_DISPLAY) return JSON.stringify(value);
    const preview = JSON.stringify(value.slice(0, MAX_ARRAY_DISPLAY));
    return preview.slice(0, -1) + `, \u2026 (${value.length} items)]`;
  }
  const s = JSON.stringify(value);
  return s.length > MAX_STRING_LEN ? s.slice(0, MAX_STRING_LEN) + "\u2026" : s;
}

/**
 * Filter a payload to whitelisted keys only, redacting blocked keys.
 * Unknown keys (not in whitelist or blocklist) are shown as "[redacted]".
 */
function filterPayload(payload: Record<string, unknown>): { key: string; display: string }[] {
  const entries: { key: string; display: string }[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (PAYLOAD_BLOCKLIST.has(key)) continue;
    if (PAYLOAD_WHITELIST.has(key)) {
      entries.push({ key, display: renderValue(value) });
    } else {
      entries.push({ key, display: "[redacted]" });
    }
  }
  return entries;
}

function isRunCompletedPayload(
  type: string,
  payload: Record<string, unknown> | null
): payload is Record<string, unknown> {
  return type === "VERIFICATION_RUN_COMPLETED" && payload !== null;
}

function RunCompletedSummary({ payload }: { payload: Record<string, unknown> }) {
  const verdict = payload.verdict as string | undefined;
  const reasonCodes = payload.reasonCodes as string[] | undefined;
  const configVersion = payload.configVersion as string | null | undefined;
  const configSource = payload.configSource as string | undefined;
  const thresholdsHash = payload.thresholdsHash as string | null | undefined;
  const mcSeed = payload.monteCarloSeed as number | undefined;
  const mcIter = payload.monteCarloIterations as number | undefined;

  return (
    <div className="space-y-1 text-xs">
      {verdict && (
        <div>
          <span className="text-[#7C8DB0]">verdict: </span>
          <span className={`font-mono font-bold ${VERDICT_STYLES[verdict] ?? "text-white"}`}>
            {verdict}
          </span>
        </div>
      )}
      {reasonCodes && (
        <div>
          <span className="text-[#7C8DB0]">reasons: </span>
          <span className="text-white font-mono">{reasonCodes.join(", ")}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {configVersion != null && (
          <div>
            <span className="text-[#7C8DB0]">configVersion: </span>
            <span className="text-white font-mono">{configVersion}</span>
          </div>
        )}
        {configSource && (
          <div>
            <span className="text-[#7C8DB0]">configSource: </span>
            <span className="text-white font-mono">{configSource}</span>
          </div>
        )}
        {thresholdsHash != null && (
          <div>
            <span className="text-[#7C8DB0]">thresholdsHash: </span>
            <span className="text-white font-mono" title={thresholdsHash}>
              {thresholdsHash.slice(0, 12)}&hellip;
            </span>
          </div>
        )}
      </div>
      {(mcSeed != null || mcIter != null) && (
        <div className="flex gap-x-4">
          {mcSeed != null && (
            <div>
              <span className="text-[#7C8DB0]">mcSeed: </span>
              <span className="text-white font-mono">{mcSeed}</span>
            </div>
          )}
          {mcIter != null && (
            <div>
              <span className="text-[#7C8DB0]">mcIterations: </span>
              <span className="text-white font-mono">{mcIter.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Whitelisted detail rows for any payload (non-RUN_COMPLETED events, or expanded RUN_COMPLETED). */
function SafePayloadDetails({ payload }: { payload: Record<string, unknown> }) {
  const rows = filterPayload(payload);
  if (rows.length === 0) {
    return <span className="text-[#475569] text-xs">empty payload</span>;
  }
  return (
    <div className="mt-2 p-2 bg-[#0F0318] rounded text-xs overflow-x-auto space-y-0.5">
      {rows.map(({ key, display }) => (
        <div key={key}>
          <span className="text-[#7C8DB0]">{key}: </span>
          <span
            className={`font-mono ${display === "[redacted]" ? "text-[#475569] italic" : "text-[#CBD5E1]"}`}
          >
            {display}
          </span>
        </div>
      ))}
    </div>
  );
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
                    <th className="py-2">Summary</th>
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
                        {isRunCompletedPayload(evt.type, evt.payload) ? (
                          <div>
                            <RunCompletedSummary payload={evt.payload} />
                            <button
                              type="button"
                              onClick={() => toggleExpand(i)}
                              className="mt-1 text-[#22D3EE] hover:text-[#67E8F9] transition-colors text-xs"
                            >
                              {expanded.has(i) ? "hide details" : "show details"}
                            </button>
                            {expanded.has(i) && <SafePayloadDetails payload={evt.payload} />}
                          </div>
                        ) : evt.payload ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleExpand(i)}
                              className="text-[#22D3EE] hover:text-[#67E8F9] transition-colors"
                            >
                              {expanded.has(i) ? "collapse" : "expand"}
                            </button>
                            {expanded.has(i) && <SafePayloadDetails payload={evt.payload} />}
                          </div>
                        ) : (
                          <span className="text-[#475569]">null</span>
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
