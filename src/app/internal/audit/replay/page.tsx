"use client";

import Link from "next/link";
import { useState } from "react";

interface ChainResult {
  ok: boolean;
  chainLength: number;
  breakAtSequence?: number;
  error?: string;
}

interface VerificationResult {
  status: "OK" | "FAILED" | "NOT_VERIFIABLE";
  expectedHash?: string;
  actualHash?: string;
  details?: string;
}

interface ProofEvent {
  sequence: number;
  type: string;
  createdAt: string;
  eventHash: string;
  prevEventHash: string;
  payload: Record<string, unknown>;
}

interface ReplayData {
  recordId: string;
  chain: ChainResult;
  runType: "verification" | "monitoring" | "unknown";
  extracted: Record<string, unknown>;
  snapshotVerification: VerificationResult;
  configVerification: VerificationResult;
  events: ProofEvent[];
}

const inputClass =
  "w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors";

const labelClass = "block text-xs text-[#7C8DB0] mb-1";

const RUN_TYPE_STYLES: Record<string, string> = {
  verification: "bg-[#4F46E5]/20 text-[#A78BFA]",
  monitoring: "bg-amber-500/20 text-amber-300",
  unknown: "bg-[#475569]/20 text-[#94A3B8]",
};

function VerificationBanner({ label, result }: { label: string; result: VerificationResult }) {
  const styles = {
    OK: "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)] text-[#22C55E]",
    FAILED: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#EF4444]",
    NOT_VERIFIABLE: "bg-[rgba(148,163,184,0.1)] border-[rgba(148,163,184,0.3)] text-[#94A3B8]",
  };

  const icons = { OK: "\u2713", FAILED: "\u2717", NOT_VERIFIABLE: "\u2014" };

  const explainers = {
    OK: "Integrity checks passed.",
    FAILED:
      "Computation failed or integrity mismatch detected. Treat as tampering or system error.",
    NOT_VERIFIABLE:
      "Not enough stored inputs to recompute deterministically. Proof chain may still be valid.",
  };

  return (
    <div className={`p-3 rounded-lg border text-sm ${styles[result.status]}`}>
      <div className="flex items-center gap-2 font-medium">
        <span className="text-lg">{icons[result.status]}</span>
        <span>
          {label}: {result.status}
        </span>
      </div>
      <div className="mt-1 text-xs opacity-70">{explainers[result.status]}</div>
      {result.details && <div className="mt-1 text-xs opacity-80">{result.details}</div>}
      {result.expectedHash && (
        <div className="mt-1 text-xs font-mono opacity-70">
          expected: {result.expectedHash.slice(0, 16)}&hellip;
          {result.actualHash && <> | actual: {result.actualHash.slice(0, 16)}&hellip;</>}
        </div>
      )}
    </div>
  );
}

function ExtractedPayload({ extracted }: { extracted: Record<string, unknown> }) {
  const entries = Object.entries(extracted);
  if (entries.length === 0) {
    return <span className="text-[#475569] text-xs">No extracted payload</span>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className="text-[#7C8DB0]">{key}: </span>
          <span className="text-white font-mono">
            {typeof value === "string"
              ? value.length > 64
                ? value.slice(0, 64) + "\u2026"
                : value
              : JSON.stringify(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EventRow({ event, index }: { event: ProofEvent; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const payloadEntries = Object.entries(event.payload);

  return (
    <tr className="border-b border-[rgba(79,70,229,0.1)] align-top">
      <td className="py-2 pr-3 text-[#A78BFA] font-mono">{event.sequence}</td>
      <td className="py-2 pr-3 text-[#94A3B8] font-mono whitespace-nowrap">
        {new Date(event.createdAt).toLocaleString()}
      </td>
      <td className="py-2 pr-3 text-white font-mono text-xs">{event.type}</td>
      <td className="py-2 pr-3 text-[#94A3B8] font-mono" title={event.eventHash}>
        {event.eventHash.slice(0, 12)}&hellip;
      </td>
      <td className="py-2">
        {payloadEntries.length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[#22D3EE] hover:text-[#67E8F9] transition-colors text-xs"
            >
              {expanded ? "collapse" : `expand (${payloadEntries.length} keys)`}
            </button>
            {expanded && (
              <div className="mt-1 p-2 bg-[#0F0318] rounded text-xs space-y-0.5">
                {payloadEntries.map(([key, value]) => (
                  <div key={key}>
                    <span className="text-[#7C8DB0]">{key}: </span>
                    <span className="text-[#CBD5E1] font-mono">
                      {typeof value === "string"
                        ? value.length > 80
                          ? value.slice(0, 80) + "\u2026"
                          : value
                        : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[#475569] text-xs">empty</span>
        )}
      </td>
    </tr>
  );
}

function AuditReplayForm() {
  const [recordId, setRecordId] = useState("");
  const [internalApiKey, setInternalApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReplayData | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({ recordId: recordId.trim() });
      const res = await fetch(`/api/internal/audit/replay?${params.toString()}`, {
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

      setData(json as ReplayData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Record ID</label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            className={inputClass}
            placeholder="e.g. a1b2c3d4-e5f6-..."
            required
          />
        </div>

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

        <button
          type="submit"
          disabled={loading || !recordId.trim()}
          className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {loading ? "Replaying\u2026" : "Replay Audit"}
        </button>

        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-xs whitespace-pre-wrap">
            {error}
          </div>
        )}
      </form>

      {data && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-white">{data.recordId}</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${RUN_TYPE_STYLES[data.runType]}`}
            >
              {data.runType}
            </span>
          </div>

          {/* Chain verification banner */}
          <div
            className={`p-3 rounded-lg border text-sm font-medium ${
              data.chain.ok
                ? "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)] text-[#22C55E]"
                : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#EF4444]"
            }`}
          >
            <div>
              {data.chain.ok
                ? `CHAIN VALID \u2014 ${data.chain.chainLength} event${data.chain.chainLength !== 1 ? "s" : ""}`
                : `CHAIN BROKEN \u2014 break at seq #${data.chain.breakAtSequence}`}
            </div>
            <div className="mt-1 text-xs font-normal opacity-70">
              {data.chain.ok
                ? "Integrity checks passed."
                : "Computation failed or integrity mismatch detected. Treat as tampering or system error."}
            </div>
            {data.chain.error && (
              <div className="mt-1 text-xs font-normal opacity-80">{data.chain.error}</div>
            )}
          </div>

          {/* Config + Snapshot verification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <VerificationBanner label="Config Integrity" result={data.configVerification} />
            <VerificationBanner label="Snapshot Integrity" result={data.snapshotVerification} />
          </div>

          {/* Extracted payload */}
          <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-2">
            <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
              Extracted Run Payload
            </h3>
            <ExtractedPayload extracted={data.extracted} />
          </div>

          {/* Proof events table */}
          <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-2">
            <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
              Proof Events ({data.events.length})
            </h3>

            {data.events.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">No chained events found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[rgba(79,70,229,0.2)] text-[#7C8DB0] uppercase tracking-wider">
                      <th className="py-2 pr-3">Seq</th>
                      <th className="py-2 pr-3">Created At</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Hash</th>
                      <th className="py-2">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((evt, i) => (
                      <EventRow key={i} event={evt} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditReplayPage() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Algo Studio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Audit Replay
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/internal/proof-events"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Proof Events
              </Link>
              <Link
                href="/internal/ops"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Ops
              </Link>
              <Link
                href="/app"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AuditReplayForm />
      </main>
    </div>
  );
}
