"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface InstanceData {
  instanceId: string;
  lifecycleState: string;
  operatorHold: string;
  monitoringSuppressedUntil: string | null;
}

interface MonitoringRunRow {
  id: string;
  completedAt: string | null;
  status: string;
  verdict: string | null;
  reasonCodes: string[] | null;
  snapshotHash: string | null;
  configVersion: string | null;
  thresholdsHash: string | null;
}

interface IncidentRow {
  id: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  ackDeadlineAt: string;
  escalationCount: number;
  recordId: string;
}

interface OverrideRow {
  id: string;
  status: string;
  requestedAt: string;
  requestedBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  appliedAt: string | null;
  expiresAt: string;
  recordId: string;
}

interface OverviewData {
  strategyId: string;
  instance: InstanceData | null;
  latestMonitoringRuns: MonitoringRunRow[];
  incidents: IncidentRow[];
  overrides: OverrideRow[];
}

const inputClass =
  "w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors";

const cardClass = "p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3";

const thClass = "py-2 pr-3 text-[#7C8DB0] uppercase tracking-wider text-left font-normal";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diff / 60_000);
  if (mins < 0) return `${Math.abs(mins)}m ago`;
  return `in ${mins}m`;
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

const LIFECYCLE_COLORS: Record<string, string> = {
  MONITORING: "text-emerald-400",
  EDGE_AT_RISK: "text-amber-400",
  OPERATOR_HALTED: "text-red-400",
  INVALIDATED: "text-red-500 font-bold",
};

const HOLD_COLORS: Record<string, string> = {
  NONE: "text-[#CBD5E1]",
  HALTED: "text-red-400 font-bold",
  OVERRIDE_PENDING: "text-amber-400 font-bold",
};

const VERDICT_COLORS: Record<string, string> = {
  HEALTHY: "text-emerald-400",
  AT_RISK: "text-amber-400",
  INVALIDATED: "text-red-400",
};

function InstanceCard({
  instance,
  strategyId,
}: {
  instance: InstanceData | null;
  strategyId: string;
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Instance & Controls</h3>
        <Link
          href={`/internal/proof-events?strategyId=${encodeURIComponent(strategyId)}`}
          className="text-xs text-[#22D3EE] hover:text-[#67E8F9] underline transition-colors"
        >
          View Proof Events
        </Link>
      </div>
      {instance ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div>
            <span className="text-[#7C8DB0]">Instance ID: </span>
            <span className="text-white font-mono">{instance.instanceId.slice(0, 16)}</span>
          </div>
          <div>
            <span className="text-[#7C8DB0]">Lifecycle: </span>
            <span
              className={`font-mono ${LIFECYCLE_COLORS[instance.lifecycleState] ?? "text-white"}`}
            >
              {instance.lifecycleState}
            </span>
          </div>
          <div>
            <span className="text-[#7C8DB0]">Operator Hold: </span>
            <span className={`font-mono ${HOLD_COLORS[instance.operatorHold] ?? "text-white"}`}>
              {instance.operatorHold}
            </span>
          </div>
          <div>
            <span className="text-[#7C8DB0]">Suppressed Until: </span>
            <span className="text-white font-mono">
              {instance.monitoringSuppressedUntil
                ? formatTime(instance.monitoringSuppressedUntil)
                : "\u2014"}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#64748B]">No live instance found for this strategy.</p>
      )}
    </div>
  );
}

function MonitoringRunsCard({ runs }: { runs: MonitoringRunRow[] }) {
  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
        Monitoring Runs ({runs.length})
      </h3>
      {runs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[rgba(79,70,229,0.2)]">
                <th className={thClass}>Completed</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Verdict</th>
                <th className={thClass}>Reason Codes</th>
                <th className={thClass}>Config</th>
                <th className={thClass}>Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono whitespace-nowrap">
                    {r.completedAt ? formatTime(r.completedAt) : "\u2014"}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        r.status === "COMPLETED"
                          ? "text-emerald-400"
                          : r.status === "FAILED"
                            ? "text-red-400"
                            : "text-amber-400"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`font-mono ${VERDICT_COLORS[r.verdict ?? ""] ?? "text-[#CBD5E1]"}`}
                    >
                      {r.verdict ?? "\u2014"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#94A3B8] font-mono">
                    {r.reasonCodes && Array.isArray(r.reasonCodes) && r.reasonCodes.length > 0
                      ? r.reasonCodes.join(", ")
                      : "\u2014"}
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono">
                    {r.configVersion ?? "\u2014"}
                  </td>
                  <td
                    className="py-2 pr-3 text-[#94A3B8] font-mono"
                    title={r.snapshotHash ?? undefined}
                  >
                    {r.snapshotHash ? r.snapshotHash.slice(0, 10) : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[#64748B]">No monitoring runs found.</p>
      )}
    </div>
  );
}

function IncidentsCard({ incidents }: { incidents: IncidentRow[] }) {
  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
        Incidents ({incidents.length})
      </h3>
      {incidents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[rgba(79,70,229,0.2)]">
                <th className={thClass}>ID</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Opened</th>
                <th className={thClass}>ACK Deadline</th>
                <th className={thClass}>Esc.</th>
                <th className={thClass}>Closed</th>
                <th className={thClass}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-2 pr-3 font-mono">
                    <Link
                      href={`/internal/incidents/${i.id}`}
                      className="text-[#A78BFA] hover:text-[#22D3EE] underline transition-colors"
                    >
                      {i.id.slice(0, 10)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        i.status === "ESCALATED"
                          ? "text-red-400 font-bold"
                          : i.status === "CLOSED"
                            ? "text-[#64748B]"
                            : "text-amber-400"
                      }
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono whitespace-nowrap">
                    {formatTime(i.openedAt)}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    <span
                      className={
                        isOverdue(i.ackDeadlineAt) && i.status !== "CLOSED"
                          ? "text-red-400 font-bold"
                          : "text-[#CBD5E1]"
                      }
                    >
                      {relativeTime(i.ackDeadlineAt)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono">{i.escalationCount}</td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono">
                    {i.closedAt ? formatTime(i.closedAt) : "\u2014"}
                  </td>
                  <td className="py-2 pr-3 text-[#94A3B8] font-mono">
                    {i.closeReason ?? "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[#64748B]">No incidents found.</p>
      )}
    </div>
  );
}

function OverridesCard({ overrides }: { overrides: OverrideRow[] }) {
  return (
    <div className={cardClass}>
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
        Overrides ({overrides.length})
      </h3>
      {overrides.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[rgba(79,70,229,0.2)]">
                <th className={thClass}>ID</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Requested</th>
                <th className={thClass}>By</th>
                <th className={thClass}>Approved By</th>
                <th className={thClass}>Applied</th>
                <th className={thClass}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-2 pr-3 font-mono">
                    <Link
                      href={`/internal/overrides/${o.id}`}
                      className="text-[#A78BFA] hover:text-[#22D3EE] underline transition-colors"
                    >
                      {o.id.slice(0, 10)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        o.status === "APPROVED"
                          ? "text-emerald-400"
                          : o.status === "APPLIED"
                            ? "text-blue-400"
                            : o.status === "REJECTED" || o.status === "EXPIRED"
                              ? "text-[#64748B]"
                              : "text-amber-400"
                      }
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono whitespace-nowrap">
                    {formatTime(o.requestedAt)}
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1]">{o.requestedBy}</td>
                  <td className="py-2 pr-3 text-[#CBD5E1]">{o.approvedBy ?? "\u2014"}</td>
                  <td className="py-2 pr-3 text-[#CBD5E1] font-mono">
                    {o.appliedAt ? formatTime(o.appliedAt) : "\u2014"}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    <span
                      className={
                        isOverdue(o.expiresAt) ? "text-red-400 font-bold" : "text-[#CBD5E1]"
                      }
                    >
                      {relativeTime(o.expiresAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[#64748B]">No override requests found.</p>
      )}
    </div>
  );
}

export default function StrategyCommandCenterPage() {
  const { id: strategyId } = useParams<{ id: string }>();
  const [apiKey, setApiKey] = useState("");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOverview() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/internal/strategies/${encodeURIComponent(strategyId)}/overview`,
        {
          headers: { "x-internal-api-key": apiKey },
        }
      );
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

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Strategy Command Center
              </span>
            </div>
            <div className="flex gap-4">
              <Link
                href="/internal/ops"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Ops Dashboard
              </Link>
              <Link
                href="/internal/proof-events"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Proof Audit
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Strategy ID badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#7C8DB0] uppercase tracking-wider">Strategy</span>
          <span className="text-sm text-white font-mono bg-[#0F0318] border border-[rgba(79,70,229,0.3)] px-3 py-1 rounded">
            {strategyId}
          </span>
        </div>

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

        {data && (
          <div className="space-y-4">
            <InstanceCard instance={data.instance} strategyId={data.strategyId} />
            <MonitoringRunsCard runs={data.latestMonitoringRuns} />
            <IncidentsCard incidents={data.incidents} />
            <OverridesCard overrides={data.overrides} />
          </div>
        )}
      </main>
    </div>
  );
}
