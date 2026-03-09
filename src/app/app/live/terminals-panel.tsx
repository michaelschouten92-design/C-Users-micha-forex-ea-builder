"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────

interface DeploymentInstance {
  id: string;
  eaName: string;
  status: string;
  hasBaseline: boolean;
}

interface Deployment {
  id: string;
  deploymentKey: string;
  symbol: string;
  timeframe: string;
  magicNumber: number;
  eaName: string;
  baselineStatus: string;
  instanceId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  instance: DeploymentInstance | null;
}

interface Terminal {
  id: string;
  label: string;
  status: string;
  lastHeartbeat: string | null;
  broker: string | null;
  accountNumber: string | null;
  terminalVersion: string | null;
  createdAt: string;
  deployments: Deployment[];
}

interface LinkableInstance {
  id: string;
  eaName: string;
  symbol: string | null;
  timeframe: string | null;
  status: string;
  hasBaseline: boolean;
  terminalConnectionId: string | null;
}

// ── Main Panel ────────────────────────────────────────

export function TerminalsPanel() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTerminals = useCallback(async () => {
    try {
      const res = await fetch("/api/live/terminals");
      if (!res.ok) throw new Error("Failed to load terminals");
      const data = await res.json();
      setTerminals(data.terminals ?? []);
      setError(null);
    } catch {
      setError("Could not load terminals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerminals();
  }, [fetchTerminals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-sm text-[#71717A]">Loading terminals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-sm text-[#EF4444]">{error}</span>
      </div>
    );
  }

  if (terminals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-[rgba(79,70,229,0.1)] rounded-xl flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-[#7C8DB0]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        </div>
        <p className="text-sm text-[#94A3B8] mb-1">No terminals registered</p>
        <p className="text-xs text-[#64748B]">
          Register a terminal from Settings to start discovering chart deployments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {terminals.map((terminal) => (
        <TerminalCard key={terminal.id} terminal={terminal} onRefresh={fetchTerminals} />
      ))}
    </div>
  );
}

// ── Terminal Card ──────────────────────────────────────

function TerminalCard({ terminal, onRefresh }: { terminal: Terminal; onRefresh: () => void }) {
  const unlinkedCount = terminal.deployments.filter((d) => !d.instanceId).length;

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[rgba(79,70,229,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusDot status={terminal.status} />
            <div>
              <h3 className="text-sm font-medium text-white">{terminal.label}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {terminal.broker && (
                  <span className="text-[10px] text-[#7C8DB0]">{terminal.broker}</span>
                )}
                {terminal.accountNumber && (
                  <span className="text-[10px] text-[#64748B]">#{terminal.accountNumber}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unlinkedCount > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B]">
                {unlinkedCount} unlinked
              </span>
            )}
            <span className="text-[10px] text-[#64748B]">
              {terminal.deployments.length} deployment{terminal.deployments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Deployments */}
      {terminal.deployments.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-[#64748B]">
            No deployments detected yet. Ensure the Monitor EA is running.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[rgba(79,70,229,0.06)]">
          {terminal.deployments.map((deployment) => (
            <DeploymentRow
              key={deployment.id}
              deployment={deployment}
              terminalId={terminal.id}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Deployment Row ────────────────────────────────────

function DeploymentRow({
  deployment,
  terminalId,
  onRefresh,
}: {
  deployment: Deployment;
  terminalId: string;
  onRefresh: () => void;
}) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const isLinked = deployment.instanceId !== null;
  const isRelinkRequired = deployment.baselineStatus === "RELINK_REQUIRED";

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Left: deployment info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-white">{deployment.eaName}</span>
            <span className="text-[10px] font-mono text-[#7C8DB0]">
              {deployment.symbol} {deployment.timeframe}
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">M{deployment.magicNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <BaselineStatusBadge status={deployment.baselineStatus} />
            {isLinked && deployment.instance ? (
              <span
                className={`text-[10px] ${isRelinkRequired ? "text-[#F59E0B]" : "text-[#10B981]"}`}
              >
                Linked to {deployment.instance.eaName}
              </span>
            ) : (
              <span className="text-[10px] text-[#F59E0B]">Unlinked</span>
            )}
            <span className="text-[10px] text-[#64748B]">
              Last seen {formatTimeAgo(deployment.lastSeenAt)}
            </span>
          </div>
        </div>

        {/* Right: action */}
        {!isLinked && (
          <button
            type="button"
            onClick={() => setShowLinkDialog(true)}
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-[rgba(79,70,229,0.15)] border border-[rgba(79,70,229,0.3)] text-[#A78BFA] hover:bg-[rgba(79,70,229,0.25)] hover:text-white transition-colors"
          >
            Link Instance
          </button>
        )}
        {isLinked && !isRelinkRequired && (
          <span className="flex-shrink-0 text-[10px] font-medium px-2 py-1 rounded bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#10B981]">
            Linked
          </span>
        )}
        {isLinked && isRelinkRequired && (
          <span className="flex-shrink-0 text-[10px] font-medium px-2 py-1 rounded bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B]">
            Relink needed
          </span>
        )}
      </div>

      {/* Relink-required explanation */}
      {isRelinkRequired && (
        <div className="mt-2 px-3 py-2 rounded bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)]">
          <p className="text-[10px] text-[#F59E0B] leading-relaxed">
            EA configuration changed materially. Deterministic monitoring is suspended until a new
            baseline is linked. Go to the linked instance and link a new backtest baseline that
            reflects the current configuration.
          </p>
        </div>
      )}

      {showLinkDialog && (
        <LinkInstanceDialog
          terminalId={terminalId}
          deploymentId={deployment.id}
          deploymentLabel={`${deployment.eaName} — ${deployment.symbol} ${deployment.timeframe}`}
          onClose={() => setShowLinkDialog(false)}
          onLinked={() => {
            setShowLinkDialog(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ── Link Instance Dialog ──────────────────────────────

function LinkInstanceDialog({
  terminalId,
  deploymentId,
  deploymentLabel,
  onClose,
  onLinked,
}: {
  terminalId: string;
  deploymentId: string;
  deploymentLabel: string;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [instances, setInstances] = useState<LinkableInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/live/terminals/linkable-instances?terminalId=${terminalId}`);
        if (!res.ok) throw new Error("Failed to load instances");
        const data = await res.json();
        setInstances(data.instances ?? []);
      } catch {
        setError("Could not load instances.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [terminalId]);

  const handleLink = async (instanceId: string) => {
    setLinking(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/terminal/${terminalId}/deployments/${deploymentId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Link failed");
        return;
      }
      onLinked();
    } catch {
      setError("Link request failed.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg bg-[#0F0A1A] border border-[rgba(79,70,229,0.2)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-white">
          Link deployment: <span className="text-[#A78BFA]">{deploymentLabel}</span>
        </h4>
        <button type="button" onClick={onClose} className="text-[#71717A] hover:text-white text-sm">
          &times;
        </button>
      </div>

      {error && (
        <div className="mb-3 text-xs text-[#EF4444] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[#71717A] py-4 text-center">Loading instances...</p>
      ) : instances.length === 0 ? (
        <p className="text-xs text-[#71717A] py-4 text-center">
          No eligible instances found. Register an EA instance first.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {instances.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => handleLink(inst.id)}
              disabled={linking}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(79,70,229,0.05)] border border-[rgba(79,70,229,0.1)] hover:border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.1)] transition-colors disabled:opacity-50 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusDot status={inst.status} />
                  <span className="text-xs font-medium text-white truncate">{inst.eaName}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-5">
                  {inst.symbol && (
                    <span className="text-[10px] font-mono text-[#7C8DB0]">
                      {inst.symbol} {inst.timeframe}
                    </span>
                  )}
                  <span className="text-[10px] text-[#64748B]">
                    {inst.hasBaseline ? "Has baseline" : "No baseline"}
                  </span>
                </div>
              </div>
              <span className="flex-shrink-0 text-[10px] text-[#A78BFA]">Link &rarr;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared Components ─────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color = status === "ONLINE" ? "#10B981" : status === "ERROR" ? "#EF4444" : "#71717A";
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

const BASELINE_STATUS_STYLES: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  LINKED: {
    label: "Baseline linked",
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
  UNLINKED: {
    label: "No baseline",
    color: "#71717A",
    bg: "rgba(113,113,122,0.08)",
    border: "rgba(113,113,122,0.2)",
  },
  RELINK_REQUIRED: {
    label: "Relink required",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
  },
};

function BaselineStatusBadge({ status }: { status: string }) {
  const style = BASELINE_STATUS_STYLES[status] ?? BASELINE_STATUS_STYLES.UNLINKED;
  return (
    <span
      className="text-[9px] font-medium px-1.5 py-0.5 rounded"
      style={{
        color: style.color,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      {style.label}
    </span>
  );
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
