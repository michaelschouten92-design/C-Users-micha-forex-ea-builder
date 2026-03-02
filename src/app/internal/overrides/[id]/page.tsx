"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface OverrideDetail {
  id: string;
  strategyId: string;
  status: string;
  requestRecordId: string;
  requestNote: string | null;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  approveNote: string | null;
  approveRecordId: string | null;
  rejectNote: string | null;
  rejectRecordId: string | null;
  rejectedAt: string | null;
  appliedAt: string | null;
  applyRecordId: string | null;
  expiredAt: string | null;
  expiresAt: string;
  configVersion: string;
  thresholdsHash: string;
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
  "previousStatus",
  "appliedBy",
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
    PENDING: "text-amber-400",
    APPROVED: "text-emerald-400",
    APPLIED: "text-blue-400",
    REJECTED: "text-red-400",
    EXPIRED: "text-[#64748B]",
  };
  return <span className={`font-bold ${colors[status] ?? "text-white"}`}>{status}</span>;
}

export default function OverrideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [apiKey, setApiKey] = useState("");
  const [override, setOverride] = useState<OverrideDetail | null>(null);
  const [context, setContext] = useState<LifecycleContext | null>(null);
  const [proofEvents, setProofEvents] = useState<ProofEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [operatorId, setOperatorId] = useState("");

  async function loadDetails() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/internal/overrides/${id}`, {
        headers: { "x-internal-api-key": apiKey },
      });
      if (!res.ok) {
        const json = await res.json();
        setError(res.status === 401 ? "Unauthorized" : json.error || `Error ${res.status}`);
        return;
      }
      const json = await res.json();
      setOverride(json.override);
      setContext(json.context);

      // Fetch related proof events
      const evRes = await fetch(
        `/api/internal/proof-events?strategyId=${encodeURIComponent(json.override.strategyId)}&limit=30`,
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
    if (!override) return;
    if (!operatorId.trim()) {
      setActionResult({ type: "error", message: "Operator ID is required" });
      return;
    }
    setActionResult(null);
    setActionLoading(action);
    try {
      const res = await fetch(`/api/internal/monitoring/override/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          strategyId: override.strategyId,
          recordId: crypto.randomUUID(),
          overrideRequestId: override.id,
          operatorId: operatorId.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionResult({ type: "error", message: json.error || `Error ${res.status}` });
      } else {
        const details = [
          json.status && `status: ${json.status}`,
          json.operatorHold && `operatorHold: ${json.operatorHold}`,
          json.lifecycleState && `lifecycle: ${json.lifecycleState}`,
        ]
          .filter(Boolean)
          .join(", ");
        setActionResult({ type: "success", message: details || `${action} completed` });
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

  const canApprove = override?.status === "PENDING";
  const canReject = override && ["PENDING", "APPROVED"].includes(override.status);
  const canApply = override?.status === "APPROVED";
  const isTerminal = override && ["APPLIED", "REJECTED", "EXPIRED"].includes(override.status);

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Override Detail
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
            {loading ? "Loading\u2026" : "Load Override"}
          </button>
        </div>

        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {override && (
          <>
            {/* Override details */}
            <div className={cardClass}>
              <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">
                Override {override.id}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                <Field label="Strategy" value={override.strategyId} />
                <div>
                  <span className="text-[#7C8DB0]">Status: </span>
                  <StatusBadge status={override.status} />
                </div>
                <Field label="Requested By" value={override.requestedBy} />
                <Field label="Requested At" value={formatTime(override.requestedAt)} />
                {override.requestNote && (
                  <Field label="Request Note" value={override.requestNote} />
                )}
                <Field
                  label="Expires"
                  value={formatTime(override.expiresAt)}
                  warn={isOverdue(override.expiresAt) && !isTerminal}
                />
                {override.approvedBy && <Field label="Approved By" value={override.approvedBy} />}
                {override.approvedAt && (
                  <Field label="Approved At" value={formatTime(override.approvedAt)} />
                )}
                {override.approveNote && (
                  <Field label="Approve Note" value={override.approveNote} />
                )}
                {override.rejectedAt && (
                  <Field label="Rejected At" value={formatTime(override.rejectedAt)} />
                )}
                {override.rejectNote && <Field label="Reject Note" value={override.rejectNote} />}
                {override.appliedAt && (
                  <Field label="Applied At" value={formatTime(override.appliedAt)} />
                )}
                {override.expiredAt && (
                  <Field label="Expired At" value={formatTime(override.expiredAt)} />
                )}
                <Field label="Config" value={override.configVersion} />
                <Field
                  label="Thresholds Hash"
                  value={override.thresholdsHash.slice(0, 12) + "\u2026"}
                />
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

                {/* State eligibility warnings */}
                {canApply && context.operatorHold !== "OVERRIDE_PENDING" && (
                  <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-2 rounded text-xs">
                    Apply requires operatorHold=OVERRIDE_PENDING, currently {context.operatorHold}
                  </div>
                )}
                {canApply && context.lifecycleState !== "EDGE_AT_RISK" && (
                  <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-2 rounded text-xs">
                    Apply requires lifecycleState=EDGE_AT_RISK, currently {context.lifecycleState}
                  </div>
                )}
              </div>
            )}
            {!context && override && (
              <div className="text-xs text-[#64748B] p-3 rounded border border-[rgba(79,70,229,0.2)]">
                No live instance found for this strategy.
              </div>
            )}

            {/* Actions */}
            {!isTerminal && (
              <div className={cardClass}>
                <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Actions</h3>
                <div>
                  <label className="block text-xs text-[#7C8DB0] mb-1">
                    Operator ID (required)
                  </label>
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. operator_bob"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {canApprove && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction("approve")}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
                    >
                      {actionLoading === "approve" ? "Sending\u2026" : "Approve"}
                    </button>
                  )}
                  {canReject && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction("reject")}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
                    >
                      {actionLoading === "reject" ? "Sending\u2026" : "Reject"}
                    </button>
                  )}
                  {canApply && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAction("apply")}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
                    >
                      {actionLoading === "apply" ? "Sending\u2026" : "Apply"}
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
