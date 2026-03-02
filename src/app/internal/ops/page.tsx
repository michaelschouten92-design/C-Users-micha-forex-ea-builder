"use client";

import Link from "next/link";
import { useState } from "react";

interface IncidentRow {
  id: string;
  strategyId: string;
  status: string;
  severity: string;
  openedAt: string;
  ackDeadlineAt: string;
  escalationCount: number;
  triggerRecordId: string;
  reasonCodes: string[];
}

interface OverrideRow {
  id: string;
  strategyId: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  expiresAt: string;
  recordId: string;
}

interface HoldRow {
  instanceId: string;
  strategyId: string | null;
  operatorHold: string;
  updatedAt: string;
  monitoringSuppressedUntil: string | null;
}

interface OverviewData {
  incidents: {
    counts: { open: number; acknowledged: number; escalated: number; overdueAck: number };
    rows: IncidentRow[];
  };
  overrides: { rows: OverrideRow[] };
  holds: { rows: HoldRow[] };
  outbox: {
    counts: { pending: number; failed: number; sending: number };
    nextAttemptAt: string | null;
  };
}

interface ProcessResult {
  type: "success" | "error";
  label: string;
  message: string;
}

const inputClass =
  "w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors";

const cardClass = "p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3";

const thClass = "py-2 pr-3 text-[#7C8DB0] uppercase tracking-wider text-left font-normal";

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diff / 60_000);
  if (mins < 0) return `${Math.abs(mins)}m ago`;
  return `in ${mins}m`;
}

function CountBadge({ label, count, warn }: { label: string; count: number; warn?: boolean }) {
  const color = warn && count > 0 ? "text-amber-400 font-bold" : "text-white";
  return (
    <div>
      <span className="text-[#7C8DB0]">{label}: </span>
      <span className={`font-mono ${color}`}>{count}</span>
    </div>
  );
}

function IncidentCard({ data }: { data: OverviewData["incidents"] }) {
  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Incidents</h3>
      <div className="flex flex-wrap gap-4 text-xs">
        <CountBadge label="Open" count={data.counts.open} />
        <CountBadge label="Acknowledged" count={data.counts.acknowledged} />
        <CountBadge label="Escalated" count={data.counts.escalated} />
        <CountBadge label="Overdue ACK" count={data.counts.overdueAck} warn />
      </div>
      {data.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[rgba(79,70,229,0.2)]">
                <th className={thClass}>ID</th>
                <th className={thClass}>Strategy</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Severity</th>
                <th className={thClass}>ACK Deadline</th>
                <th className={thClass}>Esc.</th>
                <th className={thClass}>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-2 pr-3 font-mono">
                    <Link
                      href={`/internal/incidents/${r.id}`}
                      className="text-[#A78BFA] hover:text-[#22D3EE] underline transition-colors"
                    >
                      {r.id.slice(0, 10)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 font-mono text-white">{r.strategyId}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        r.status === "ESCALATED" ? "text-red-400 font-bold" : "text-amber-400"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1]">{r.severity}</td>
                  <td className="py-2 pr-3 font-mono">
                    <span
                      className={
                        isOverdue(r.ackDeadlineAt) ? "text-red-400 font-bold" : "text-[#CBD5E1]"
                      }
                    >
                      {relativeTime(r.ackDeadlineAt)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono">{r.escalationCount}</td>
                  <td className="py-2 pr-3 text-[#94A3B8] font-mono">{r.reasonCodes.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.rows.length === 0 && (
        <p className="text-xs text-[#64748B]">No open or escalated incidents.</p>
      )}
    </div>
  );
}

function OverrideCard({ data }: { data: OverviewData["overrides"] }) {
  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
        Overrides ({data.rows.length})
      </h3>
      {data.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[rgba(79,70,229,0.2)]">
                <th className={thClass}>ID</th>
                <th className={thClass}>Strategy</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Requested By</th>
                <th className={thClass}>Approved By</th>
                <th className={thClass}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-2 pr-3 font-mono">
                    <Link
                      href={`/internal/overrides/${r.id}`}
                      className="text-[#A78BFA] hover:text-[#22D3EE] underline transition-colors"
                    >
                      {r.id.slice(0, 10)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 font-mono text-white">{r.strategyId}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={r.status === "APPROVED" ? "text-emerald-400" : "text-amber-400"}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1]">{r.requestedBy}</td>
                  <td className="py-2 pr-3 text-[#CBD5E1]">{r.approvedBy ?? "\u2014"}</td>
                  <td className="py-2 pr-3 font-mono">
                    <span
                      className={
                        isOverdue(r.expiresAt) ? "text-red-400 font-bold" : "text-[#CBD5E1]"
                      }
                    >
                      {relativeTime(r.expiresAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.rows.length === 0 && (
        <p className="text-xs text-[#64748B]">No pending or approved overrides.</p>
      )}
    </div>
  );
}

function HoldCard({ data }: { data: OverviewData["holds"] }) {
  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
        Operator Holds ({data.rows.length})
      </h3>
      {data.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[rgba(79,70,229,0.2)]">
                <th className={thClass}>Instance</th>
                <th className={thClass}>Strategy</th>
                <th className={thClass}>Hold</th>
                <th className={thClass}>Updated</th>
                <th className={thClass}>Suppressed Until</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.instanceId} className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-2 pr-3 font-mono text-[#A78BFA]">
                    {r.instanceId.slice(0, 10)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-white">{r.strategyId ?? "\u2014"}</td>
                  <td className="py-2 pr-3 text-red-400 font-bold">{r.operatorHold}</td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono">{formatTime(r.updatedAt)}</td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono">
                    {r.monitoringSuppressedUntil
                      ? formatTime(r.monitoringSuppressedUntil)
                      : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.rows.length === 0 && <p className="text-xs text-[#64748B]">No halted instances.</p>}
    </div>
  );
}

function OutboxCard({ data }: { data: OverviewData["outbox"] }) {
  const total = data.counts.pending + data.counts.failed + data.counts.sending;
  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Alert Outbox</h3>
      <div className="flex flex-wrap gap-4 text-xs">
        <CountBadge label="Pending" count={data.counts.pending} />
        <CountBadge label="Failed" count={data.counts.failed} warn />
        <CountBadge label="Sending" count={data.counts.sending} />
      </div>
      {data.nextAttemptAt && (
        <div className="text-xs">
          <span className="text-[#7C8DB0]">Next attempt: </span>
          <span className="text-white font-mono">{relativeTime(data.nextAttemptAt)}</span>
        </div>
      )}
      {total === 0 && <p className="text-xs text-[#64748B]">Outbox empty.</p>}
    </div>
  );
}

function ProcessorButtons({
  apiKey,
  onResult,
}: {
  apiKey: string;
  onResult: (r: ProcessResult) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function runProcessor(label: string, url: string) {
    setLoading(label);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ limit: 20 }),
      });
      const json = await res.json();
      if (!res.ok) {
        onResult({ type: "error", label, message: json.error || `Error ${res.status}` });
      } else {
        const parts = Object.entries(json)
          .filter(([k]) => k !== "errors")
          .map(([k, v]) => `${k}: ${v}`);
        const errors = json.errors as string[] | undefined;
        let msg = parts.join(", ");
        if (errors && errors.length > 0) {
          msg += ` (${errors.length} error${errors.length > 1 ? "s" : ""})`;
        }
        onResult({ type: "success", label, message: msg });
      }
    } catch (err) {
      onResult({
        type: "error",
        label,
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setLoading(null);
    }
  }

  const processors = [
    { label: "Process Incidents", url: "/api/internal/incidents/process" },
    { label: "Process Notifications", url: "/api/internal/notifications/process" },
    { label: "Process Override Expiry", url: "/api/internal/monitoring/override/process-expiry" },
  ];

  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Processors</h3>
      <div className="flex flex-wrap gap-2">
        {processors.map(({ label, url }) => (
          <button
            key={label}
            type="button"
            disabled={loading !== null}
            onClick={() => runProcessor(label, url)}
            className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
          >
            {loading === label ? "Running\u2026" : label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OpsPage() {
  const [apiKey, setApiKey] = useState("");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processResults, setProcessResults] = useState<ProcessResult[]>([]);

  async function fetchOverview() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/ops/overview", {
        headers: { "x-internal-api-key": apiKey },
      });
      if (!res.ok) {
        const json = await res.json();
        if (res.status === 401) setError("Unauthorized \u2014 check your API key");
        else if (res.status === 429) setError("Rate limited \u2014 try again shortly");
        else setError(json.error || `Error ${res.status}`);
        return;
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleProcessResult(r: ProcessResult) {
    setProcessResults((prev) => [r, ...prev].slice(0, 10));
    fetchOverview();
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Ops Dashboard
              </span>
            </div>
            <div className="flex gap-4">
              <Link
                href="/internal/proof-events"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Proof Audit
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

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Auth + Load */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={inputClass}
              placeholder="Internal API Key"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            disabled={loading || !apiKey.trim()}
            onClick={fetchOverview}
            className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-6 py-2 rounded transition-colors whitespace-nowrap"
          >
            {loading ? "Loading\u2026" : "Load Overview"}
          </button>
        </div>

        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* 4 cards */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <IncidentCard data={data.incidents} />
            <OverrideCard data={data.overrides} />
            <HoldCard data={data.holds} />
            <OutboxCard data={data.outbox} />
          </div>
        )}

        {/* Processors */}
        {apiKey.trim() && data && (
          <ProcessorButtons apiKey={apiKey} onResult={handleProcessResult} />
        )}

        {/* Process results */}
        {processResults.length > 0 && (
          <div className="space-y-2">
            {processResults.map((r, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-xs ${
                  r.type === "success"
                    ? "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22C55E]"
                    : "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444]"
                }`}
              >
                <span className="font-bold">{r.label}:</span> {r.message}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
