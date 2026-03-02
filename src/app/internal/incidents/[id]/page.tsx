"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface IncidentDetail {
  id: string;
  strategyId: string;
  status: string;
  severity: string;
  triggerRecordId: string;
  reasonCodes: string[];
  snapshotHash: string | null;
  configVersion: string;
  thresholdsHash: string;
  ackDeadlineAt: string;
  invalidateDeadlineAt: string | null;
  lastEscalatedAt: string | null;
  escalationCount: number;
  closedAt: string | null;
  closeReason: string | null;
  closedBy: string | null;
  openedAt: string;
  updatedAt: string;
}

interface LifecycleContext {
  instanceId: string;
  lifecycleState: string;
  operatorHold: string;
  monitoringSuppressedUntil: string | null;
}

interface ProofEvent {
  createdAt: string;
  type: string;
  sessionId: string | null;
  payload: Record<string, unknown> | null;
  sequence: number | null;
  eventHash: string | null;
}

const PAYLOAD_WHITELIST = new Set([
  "eventType",
  "verdict",
  "reasonCodes",
  "configVersion",
  "configSource",
  "thresholdsHash",
  "recordId",
  "strategyId",
  "timestamp",
  "tradeSnapshotHash",
  "liveFactCount",
  "monitoringVerdict",
  "reasons",
  "from",
  "to",
  "triggeringReasons",
  "consecutiveHealthyRuns",
  "transitionDecision",
  "action",
  "note",
  "lifecycleState",
  "previousHold",
  "newHold",
  "actor",
  "incidentId",
  "severity",
  "escalationCount",
  "closeReason",
  "reason",
  "ackDeadlineAt",
  "overrideRequestId",
  "overrideStatus",
  "approvedBy",
  "requestedBy",
  "expiresAt",
  "closedBy",
  "suppressedUntil",
  "overrideSuppressionMinutes",
  "overrideExpiryMinutes",
]);

const inputClass =
  "w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors";

const cardClass = "p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

function Field({ label, value, warn }: { label: string; value: string | null; warn?: boolean }) {
  return (
    <div>
      <span className="text-[#7C8DB0]">{label}: </span>
      <span className={`font-mono ${warn ? "text-red-400 font-bold" : "text-white"}`}>
        {value ?? "\u2014"}
      </span>
    </div>
  );
}

function SafePayloadRows({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="p-2 bg-[#0F0318] rounded text-xs space-y-0.5">
      {Object.entries(payload).map(([key, value]) => {
        if (!PAYLOAD_WHITELIST.has(key)) return null;
        const display =
          value == null
            ? "null"
            : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);
        return (
          <div key={key}>
            <span className="text-[#7C8DB0]">{key}: </span>
            <span className="font-mono text-[#CBD5E1]">
              {display.length > 80 ? display.slice(0, 80) + "\u2026" : display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "text-amber-400",
    ACKNOWLEDGED: "text-blue-400",
    ESCALATED: "text-red-400 font-bold",
    CLOSED: "text-[#64748B]",
  };
  return <span className={colors[status] ?? "text-white"}>{status}</span>;
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [apiKey, setApiKey] = useState("");
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [context, setContext] = useState<LifecycleContext | null>(null);
  const [proofEvents, setProofEvents] = useState<ProofEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadDetails() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/internal/incidents/${id}`, {
        headers: { "x-internal-api-key": apiKey },
      });
      if (!res.ok) {
        const json = await res.json();
        setError(res.status === 401 ? "Unauthorized" : json.error || `Error ${res.status}`);
        return;
      }
      const json = await res.json();
      setIncident(json.incident);
      setContext(json.context);

      // Fetch related proof events
      const evRes = await fetch(
        `/api/internal/proof-events?strategyId=${encodeURIComponent(json.incident.strategyId)}&limit=30`,
        { headers: { "x-internal-api-key": apiKey } }
      );
      if (evRes.ok) {
        const evJson = await evRes.json();
        setProofEvents(evJson.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string) {
    if (!incident) return;
    setActionResult(null);
    setActionLoading(action);
    try {
      const res = await fetch("/api/internal/monitoring/operator-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          strategyId: incident.strategyId,
          recordId: crypto.randomUUID(),
          action,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionResult({ type: "error", message: json.error || `Error ${res.status}` });
      } else {
        setActionResult({ type: "success", message: `${action} recorded` });
        loadDetails();
      }
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setActionLoading(null);
    }
  }

  const canAck = incident && ["OPEN", "ESCALATED"].includes(incident.status);
  const canHalt = incident && incident.status !== "CLOSED";

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Incident Detail
              </span>
            </div>
            <div className="flex gap-4">
              <Link
                href="/internal/ops"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors"
              >
                Ops Dashboard
              </Link>
              <Link
                href="/internal/proof-events"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors"
              >
                Proof Audit
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
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
            onClick={loadDetails}
            className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-6 py-2 rounded transition-colors whitespace-nowrap"
          >
            {loading ? "Loading\u2026" : "Load Incident"}
          </button>
        </div>

        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {incident && (
          <>
            {/* Incident details */}
            <div className={cardClass}>
              <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
                Incident {incident.id}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                <Field label="Strategy" value={incident.strategyId} />
                <div>
                  <span className="text-[#7C8DB0]">Status: </span>
                  <StatusBadge status={incident.status} />
                </div>
                <Field label="Severity" value={incident.severity} />
                <Field label="Opened" value={formatTime(incident.openedAt)} />
                <Field
                  label="ACK Deadline"
                  value={formatTime(incident.ackDeadlineAt)}
                  warn={isOverdue(incident.ackDeadlineAt) && incident.status !== "CLOSED"}
                />
                <Field label="Escalations" value={String(incident.escalationCount)} />
                {incident.lastEscalatedAt && (
                  <Field label="Last Escalated" value={formatTime(incident.lastEscalatedAt)} />
                )}
                {incident.invalidateDeadlineAt && (
                  <Field
                    label="Auto-invalidate"
                    value={formatTime(incident.invalidateDeadlineAt)}
                  />
                )}
                <Field label="Trigger Record" value={incident.triggerRecordId} />
                <Field label="Reasons" value={incident.reasonCodes.join(", ")} />
                <Field label="Config" value={incident.configVersion} />
                <Field
                  label="Thresholds Hash"
                  value={incident.thresholdsHash.slice(0, 12) + "\u2026"}
                />
                {incident.snapshotHash && (
                  <Field
                    label="Snapshot Hash"
                    value={incident.snapshotHash.slice(0, 12) + "\u2026"}
                  />
                )}
                {incident.closedAt && (
                  <Field label="Closed At" value={formatTime(incident.closedAt)} />
                )}
                {incident.closeReason && (
                  <Field label="Close Reason" value={incident.closeReason} />
                )}
                {incident.closedBy && <Field label="Closed By" value={incident.closedBy} />}
              </div>
            </div>

            {/* Lifecycle context */}
            {context && (
              <div className={cardClass}>
                <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
                  Lifecycle Context
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                  <Field label="Instance" value={context.instanceId} />
                  <Field label="Lifecycle State" value={context.lifecycleState} />
                  <Field
                    label="Operator Hold"
                    value={context.operatorHold}
                    warn={context.operatorHold === "HALTED"}
                  />
                  {context.monitoringSuppressedUntil && (
                    <Field
                      label="Suppressed Until"
                      value={formatTime(context.monitoringSuppressedUntil)}
                    />
                  )}
                </div>
              </div>
            )}
            {!context && incident && (
              <div className="text-xs text-[#64748B] p-3 rounded border border-[rgba(79,70,229,0.2)]">
                No live instance found for this strategy.
              </div>
            )}

            {/* Actions */}
            {incident.status !== "CLOSED" && (
              <div className={cardClass}>
                <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Actions</h3>
                {!canAck && !canHalt && (
                  <p className="text-xs text-[#64748B]">No actions available in current state.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {canAck && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction("ACK")}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
                    >
                      {actionLoading === "ACK" ? "Sending\u2026" : "Acknowledge"}
                    </button>
                  )}
                  {canHalt && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction("HALT")}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
                    >
                      {actionLoading === "HALT" ? "Sending\u2026" : "Request Halt"}
                    </button>
                  )}
                </div>
                {actionResult && (
                  <div
                    className={`p-3 rounded-lg text-xs ${
                      actionResult.type === "success"
                        ? "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22C55E]"
                        : "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444]"
                    }`}
                  >
                    {actionResult.message}
                  </div>
                )}
              </div>
            )}

            {/* Related proof events */}
            {proofEvents && proofEvents.length > 0 && (
              <div className={cardClass}>
                <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
                  Related Proof Events ({proofEvents.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[rgba(79,70,229,0.2)] text-[#7C8DB0] uppercase tracking-wider">
                        <th className="py-2 pr-3">Seq</th>
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2">Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proofEvents.map((ev, i) => (
                        <tr key={i} className="border-b border-[rgba(79,70,229,0.1)] align-top">
                          <td className="py-2 pr-3 text-[#A78BFA] font-mono">
                            {ev.sequence ?? "\u2014"}
                          </td>
                          <td className="py-2 pr-3 text-[#94A3B8] font-mono whitespace-nowrap">
                            {formatTime(ev.createdAt)}
                          </td>
                          <td className="py-2 pr-3 text-white font-mono">{ev.type}</td>
                          <td className="py-2">
                            {ev.payload ? (
                              <SafePayloadRows payload={ev.payload} />
                            ) : (
                              <span className="text-[#475569]">null</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
