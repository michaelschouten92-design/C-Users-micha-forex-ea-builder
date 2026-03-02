"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  "source",
  "backtestRunId",
  "insertedCount",
  "skippedCount",
  // Monitoring events
  "monitoringVerdict",
  "reasons",
  "ruleResults",
  "liveFactCount",
  "liveMaxDrawdownPct",
  "liveRollingSharpe",
  "currentLosingStreak",
  "daysSinceLastTrade",
  "baselineMissing",
  "consecutiveDriftSnapshots",
  // Lifecycle transition events
  "from",
  "to",
  "triggeringReasons",
  "consecutiveHealthyRuns",
  "transitionDecision",
  // Operator action events
  "action",
  "note",
  "lifecycleState",
  // Operator hold events
  "previousHold",
  "newHold",
  "actor",
  // Incident events
  "incidentId",
  "severity",
  "escalationCount",
  "closeReason",
  "reason",
  "ackDeadlineAt",
  "invalidateDeadlineAt",
  "previousAckDeadlineAt",
  "newAckDeadlineAt",
  // Override workflow events
  "overrideRequestId",
  "overrideStatus",
  "approvedBy",
  "requestedBy",
  "expiresAt",
  "overrideApprovalPolicy",
  "overrideExpiryMinutes",
  "overrideSuppressionMinutes",
  "previousStatus",
  "closedBy",
  "suppressedUntil",
  // Integrity check events
  "chainsChecked",
  "chainsValid",
  "snapshotsChecked",
  "snapshotsValid",
  "failureCount",
  "checkType",
  "computedHash",
  "storedHash",
  "breakAtSequence",
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

const OPERATOR_ACTIONS = [
  { action: "ACK", label: "Acknowledge Risk", color: "bg-amber-600 hover:bg-amber-700" },
  { action: "HALT", label: "Request Halt", color: "bg-red-600 hover:bg-red-700" },
  {
    action: "OVERRIDE_REQUEST",
    label: "Request Override",
    color: "bg-orange-600 hover:bg-orange-700",
  },
] as const;

function OperatorActionPanel({
  strategyId,
  internalApiKey,
  onActionComplete,
}: {
  strategyId: string;
  internalApiKey: string;
  onActionComplete: () => void;
}) {
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleAction(action: string) {
    setActionResult(null);
    setActionLoading(action);

    try {
      const res = await fetch("/api/internal/monitoring/operator-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalApiKey,
        },
        body: JSON.stringify({
          strategyId,
          recordId: crypto.randomUUID(),
          action,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setActionResult({
          type: "error",
          message: json.error || `Error ${res.status}`,
        });
        return;
      }

      setActionResult({ type: "success", message: "Action recorded" });
      setNote("");
      onActionComplete();
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3">
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Operator Actions</h3>

      <div>
        <label className={labelClass}>Note (optional, max 280 chars)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={2}
          className={inputClass}
          placeholder="Optional operator note..."
        />
        <div className="text-right text-xs text-[#64748B] mt-0.5">
          {280 - note.length} remaining
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {OPERATOR_ACTIONS.map(({ action, label, color }) => (
          <button
            key={action}
            type="button"
            disabled={actionLoading !== null}
            onClick={() => handleAction(action)}
            className={`${color} disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors`}
          >
            {actionLoading === action ? "Sending..." : label}
          </button>
        ))}
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
  );
}

function AlertOutboxPanel({ internalApiKey }: { internalApiKey: string }) {
  const [counts, setCounts] = useState<{ pending: number; failed: number; sending: number } | null>(
    null
  );
  const [processResult, setProcessResult] = useState<{
    processed: number;
    sent: number;
    failed: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCounts() {
    try {
      const res = await fetch("/api/internal/notifications/process", {
        headers: { "x-internal-api-key": internalApiKey },
      });
      if (!res.ok) {
        setError(`Failed to fetch counts: ${res.status}`);
        return;
      }
      setCounts(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  async function handleProcess() {
    setProcessResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/notifications/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalApiKey,
        },
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || `Error ${res.status}`);
        return;
      }
      const result = await res.json();
      setProcessResult(result);
      await fetchCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  // Fetch counts on mount

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3">
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Alert Outbox</h3>

      {counts && (
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-[#7C8DB0]">Pending: </span>
            <span className="text-white font-mono">{counts.pending}</span>
          </div>
          <div>
            <span className="text-[#7C8DB0]">Failed: </span>
            <span className="text-white font-mono">{counts.failed}</span>
          </div>
          <div>
            <span className="text-[#7C8DB0]">Sending: </span>
            <span className="text-white font-mono">{counts.sending}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleProcess}
        className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
      >
        {loading ? "Processing\u2026" : "Process Now"}
      </button>

      {processResult && (
        <div className="p-3 rounded-lg text-xs bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22C55E]">
          Processed {processResult.processed}: {processResult.sent} sent, {processResult.failed}{" "}
          failed
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg text-xs bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444]">
          {error}
        </div>
      )}
    </div>
  );
}

function IncidentPanel({ internalApiKey }: { internalApiKey: string }) {
  const [counts, setCounts] = useState<{
    open: number;
    acknowledged: number;
    escalated: number;
    overdueAck: number;
  } | null>(null);
  const [processResult, setProcessResult] = useState<{
    escalated: number;
    autoInvalidated: number;
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCounts() {
    try {
      const res = await fetch("/api/internal/incidents/process", {
        headers: { "x-internal-api-key": internalApiKey },
      });
      if (!res.ok) {
        setError(`Failed to fetch counts: ${res.status}`);
        return;
      }
      setCounts(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  async function handleProcess() {
    setProcessResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/incidents/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalApiKey,
        },
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || `Error ${res.status}`);
        return;
      }
      const result = await res.json();
      setProcessResult(result);
      await fetchCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3">
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Incidents</h3>

      {counts && (
        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-[#7C8DB0]">Open: </span>
            <span className="text-white font-mono">{counts.open}</span>
          </div>
          <div>
            <span className="text-[#7C8DB0]">Acknowledged: </span>
            <span className="text-white font-mono">{counts.acknowledged}</span>
          </div>
          <div>
            <span className="text-[#7C8DB0]">Escalated: </span>
            <span className="text-white font-mono">{counts.escalated}</span>
          </div>
          <div>
            <span className={`${counts.overdueAck > 0 ? "text-amber-400" : "text-[#7C8DB0]"}`}>
              Overdue ACK:{" "}
            </span>
            <span
              className={`font-mono ${counts.overdueAck > 0 ? "text-amber-400 font-bold" : "text-white"}`}
            >
              {counts.overdueAck}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleProcess}
        className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
      >
        {loading ? "Processing\u2026" : "Process Incidents"}
      </button>

      {processResult && (
        <div
          className={`p-3 rounded-lg text-xs ${
            processResult.errors.length > 0
              ? "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444]"
              : "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22C55E]"
          }`}
        >
          <div>
            Escalated: {processResult.escalated}, Auto-invalidated: {processResult.autoInvalidated}
          </div>
          {processResult.errors.length > 0 && (
            <div className="mt-1">
              Errors:{" "}
              {processResult.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg text-xs bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444]">
          {error}
        </div>
      )}
    </div>
  );
}

function OperatorHoldPanel({
  strategyId,
  internalApiKey,
  onActionComplete,
}: {
  strategyId: string;
  internalApiKey: string;
  onActionComplete: () => void;
}) {
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleAction(action: "HALT" | "RESUME") {
    setActionResult(null);
    setActionLoading(action);

    try {
      const res = await fetch("/api/internal/monitoring/operator-hold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalApiKey,
        },
        body: JSON.stringify({
          strategyId,
          recordId: crypto.randomUUID(),
          action,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setActionResult({
          type: "error",
          message: json.error || `Error ${res.status}`,
        });
        return;
      }

      setActionResult({
        type: "success",
        message: `operatorHold → ${json.operatorHold}`,
      });
      setNote("");
      onActionComplete();
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3">
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Operator Hold</h3>

      <div>
        <label className={labelClass}>Note (optional, max 280 chars)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={2}
          className={inputClass}
          placeholder="Optional operator note..."
        />
        <div className="text-right text-xs text-[#64748B] mt-0.5">
          {280 - note.length} remaining
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() => handleAction("HALT")}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {actionLoading === "HALT" ? "Sending..." : "HALT"}
        </button>
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() => handleAction("RESUME")}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {actionLoading === "RESUME" ? "Sending..." : "RESUME"}
        </button>
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
  );
}

function OverridePanel({
  strategyId,
  internalApiKey,
  onActionComplete,
}: {
  strategyId: string;
  internalApiKey: string;
  onActionComplete: () => void;
}) {
  const [note, setNote] = useState("");
  const [overrideRequestId, setOverrideRequestId] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleOverrideAction(action: string) {
    setActionResult(null);
    setActionLoading(action);

    const endpoint = `/api/internal/monitoring/override/${action}`;
    const needsOverrideId = action !== "request";

    if (needsOverrideId && !overrideRequestId.trim()) {
      setActionResult({ type: "error", message: "Override Request ID is required" });
      setActionLoading(null);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        strategyId,
        recordId: crypto.randomUUID(),
        ...(note.trim() ? { note: note.trim() } : {}),
      };

      if (needsOverrideId) {
        body.overrideRequestId = overrideRequestId.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalApiKey,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setActionResult({
          type: "error",
          message: json.error || `Error ${res.status}`,
        });
        return;
      }

      const details = [
        json.overrideRequestId && `ID: ${json.overrideRequestId}`,
        json.status && `status: ${json.status}`,
        json.operatorHold && `operatorHold: ${json.operatorHold}`,
        json.lifecycleState && `lifecycle: ${json.lifecycleState}`,
        json.expiresAt && `expires: ${json.expiresAt}`,
      ]
        .filter(Boolean)
        .join(", ");

      setActionResult({ type: "success", message: details || "Action completed" });
      setNote("");
      onActionComplete();
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60 space-y-3">
      <h3 className="text-xs text-[#7C8DB0] uppercase tracking-wider">Override Workflow</h3>

      <div>
        <label className={labelClass}>Override Request ID (for approve/reject/apply)</label>
        <input
          type="text"
          value={overrideRequestId}
          onChange={(e) => setOverrideRequestId(e.target.value)}
          className={inputClass}
          placeholder="e.g. clxyz..."
        />
      </div>

      <div>
        <label className={labelClass}>Note (optional, max 500 chars)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          className={inputClass}
          placeholder="Optional note..."
        />
        <div className="text-right text-xs text-[#64748B] mt-0.5">
          {500 - note.length} remaining
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() => handleOverrideAction("request")}
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {actionLoading === "request" ? "Sending..." : "Request Override"}
        </button>
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() => handleOverrideAction("approve")}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {actionLoading === "approve" ? "Sending..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() => handleOverrideAction("reject")}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {actionLoading === "reject" ? "Sending..." : "Reject"}
        </button>
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() => handleOverrideAction("apply")}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {actionLoading === "apply" ? "Sending..." : "Apply"}
        </button>
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
  );
}

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

  async function fetchEvents() {
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEvents(null);
    setExpanded(new Set());
    setChainVerification(null);
    setLoading(true);

    try {
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleActionComplete() {
    fetchEvents().catch(() => {});
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

      {/* Operator action panel — visible when events loaded and credentials present */}
      {events && strategyId.trim() && internalApiKey.trim() && (
        <OperatorActionPanel
          strategyId={strategyId}
          internalApiKey={internalApiKey}
          onActionComplete={handleActionComplete}
        />
      )}

      {/* Operator hold panel — HALT/RESUME with proof-first semantics */}
      {events && strategyId.trim() && internalApiKey.trim() && (
        <OperatorHoldPanel
          strategyId={strategyId}
          internalApiKey={internalApiKey}
          onActionComplete={handleActionComplete}
        />
      )}

      {/* Override workflow panel */}
      {events && strategyId.trim() && internalApiKey.trim() && (
        <OverridePanel
          strategyId={strategyId}
          internalApiKey={internalApiKey}
          onActionComplete={handleActionComplete}
        />
      )}

      {/* Alert outbox panel — visible when API key is set */}
      {internalApiKey.trim() && <AlertOutboxPanel internalApiKey={internalApiKey} />}

      {/* Incident panel — visible when API key is set */}
      {internalApiKey.trim() && <IncidentPanel internalApiKey={internalApiKey} />}
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
