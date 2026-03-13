"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveBaselineTrust } from "@/lib/live/baseline-trust-state";
import { LinkBaselineDialog } from "./link-baseline-dialog";

// ── Types ─────────────────────────────────────────────

interface DeploymentInstance {
  id: string;
  eaName: string;
  status: string;
  hasBaseline: boolean;
  lifecycleState: string;
}

interface Deployment {
  id: string;
  deploymentKey: string;
  symbol: string;
  timeframe: string;
  magicNumber: number;
  eaName: string;
  baselineStatus: string;
  source: string; // "PRECISE" | "DISCOVERED"
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
  unattributedTradeCount: number;
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

  // Single shared tick for heartbeat-relative-time rendering across all cards.
  // Re-renders the list every 5s so displayed ages stay current without per-card intervals.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

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
          Register a terminal from Settings to start discovering deployments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {terminals.map((terminal) => (
        <TerminalCard key={terminal.id} terminal={terminal} now={now} onRefresh={fetchTerminals} />
      ))}
    </div>
  );
}

// ── Terminal Card ──────────────────────────────────────

function TerminalCard({
  terminal,
  now,
  onRefresh,
}: {
  terminal: Terminal;
  now: number;
  onRefresh: () => void;
}) {
  const discoveredDeployments = terminal.deployments.filter((d) => d.source === "DISCOVERED");
  const preciseDeployments = terminal.deployments.filter((d) => d.source !== "DISCOVERED");
  const hasDiscovery = discoveredDeployments.length > 0 || terminal.unattributedTradeCount > 0;
  const unlinkedCount = terminal.deployments.filter((d) => !d.instanceId).length;
  const relinkCount = terminal.deployments.filter(
    (d) => d.baselineStatus === "RELINK_REQUIRED"
  ).length;

  const hbStatus = resolveHeartbeatStatus(terminal.lastHeartbeat, now);

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[rgba(79,70,229,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: hbStatus ? hbStatus.color : "#71717A" }}
            />
            <div>
              <h3 className="text-sm font-medium text-white">{terminal.label}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {hbStatus && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      color: hbStatus.color,
                      backgroundColor: hbStatus.bg,
                      border: `1px solid ${hbStatus.border}`,
                    }}
                  >
                    {hbStatus.label}
                  </span>
                )}
                <span className="text-[10px] text-[#7C8DB0]">
                  {hbStatus
                    ? `Last heartbeat: ${formatHeartbeatAgo(terminal.lastHeartbeat!, now)}`
                    : "No heartbeat received"}
                </span>
                {terminal.broker && (
                  <span className="text-[10px] text-[#64748B]">· {terminal.broker}</span>
                )}
                {terminal.accountNumber && (
                  <span className="text-[10px] text-[#64748B]">#{terminal.accountNumber}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {relinkCount > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B]">
                {relinkCount} relink needed
              </span>
            )}
            {unlinkedCount > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B]">
                {unlinkedCount} unlinked
              </span>
            )}
            <span className="text-[10px] text-[#64748B]">
              {terminal.deployments.length} deployment{terminal.deployments.length !== 1 ? "s" : ""}
            </span>
            <TerminalOverflowMenu terminal={terminal} onRefresh={onRefresh} />
          </div>
        </div>
      </div>

      {/* Discovery guidance banner — shown when account-wide discovery is active */}
      {hasDiscovery && <DiscoveryGuidanceBanner unattributed={terminal.unattributedTradeCount} />}

      {/* Precise deployments (from SYMBOL_ONLY mode) */}
      {preciseDeployments.length > 0 && (
        <div>
          <div className="px-5 pt-3 pb-1">
            <span className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
              Running strategies
            </span>
          </div>
          <div className="divide-y divide-[rgba(79,70,229,0.06)]">
            {preciseDeployments.map((deployment) => (
              <DeploymentRow
                key={deployment.id}
                deployment={deployment}
                terminalId={terminal.id}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Discovered deployments (from ACCOUNT_WIDE mode) */}
      {discoveredDeployments.length > 0 && (
        <div>
          <div className="px-5 pt-3 pb-1 flex items-center gap-2">
            <span className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
              Discovered deployments
            </span>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] text-[#818CF8]">
              From trading activity
            </span>
          </div>
          <div className="divide-y divide-[rgba(79,70,229,0.06)]">
            {discoveredDeployments.map((deployment) => (
              <DeploymentRow
                key={deployment.id}
                deployment={deployment}
                terminalId={terminal.id}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {terminal.deployments.length === 0 && !hasDiscovery && (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-[#64748B]">
            No deployments detected yet. Ensure the Monitor EA is running.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Discovery Guidance Banner ─────────────────────────

function DiscoveryGuidanceBanner({ unattributed }: { unattributed: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mx-5 mt-3 rounded-lg bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)] px-4 py-3">
      <div className="flex items-start gap-2.5">
        <svg
          className="w-4 h-4 text-[#818CF8] flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
            <span className="font-medium text-[#C4B5FD]">Automatic deployment discovery.</span>{" "}
            Deployments below were inferred from live trading activity. Review each one and link a
            baseline to start monitoring.
            {unattributed > 0 && (
              <span className="text-[#71717A]">
                {" "}
                · {unattributed} trade{unattributed !== 1 ? "s" : ""} with magic 0 (unattributed)
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-[#818CF8] hover:text-white mt-1 transition-colors"
          >
            {expanded ? "Hide details" : "How does this work?"}
          </button>
          {expanded && (
            <div className="mt-2 text-[10px] text-[#71717A] leading-relaxed space-y-1.5">
              <p>
                In account-wide mode, AlgoStudio groups trades by symbol and magic number to
                identify likely strategy deployments.
              </p>
              <p>
                Strategies using unique magic numbers are attributed most accurately. Trades with
                magic number 0 cannot be confidently assigned to a strategy and remain unattributed.
              </p>
              <p className="text-[#A1A1AA]">
                Next steps: review each discovered deployment, then link the correct baseline to
                begin monitoring.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Terminal Overflow Menu ────────────────────────────

function TerminalOverflowMenu({
  terminal,
  onRefresh,
}: {
  terminal: Terminal;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "rename" | "confirm-delete">("menu");
  const [renameValue, setRenameValue] = useState(terminal.label);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
        setError(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === terminal.label) {
      setOpen(false);
      setMode("menu");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/terminal/${terminal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Rename failed");
        return;
      }
      setOpen(false);
      setMode("menu");
      onRefresh();
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/terminal/${terminal.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Remove failed");
        return;
      }
      setOpen(false);
      setMode("menu");
      onRefresh();
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setMode("menu");
          setError(null);
        }}
        className="p-1 rounded hover:bg-[rgba(79,70,229,0.15)] transition-colors"
        aria-label="Terminal actions"
      >
        <svg className="w-4 h-4 text-[#7C8DB0]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
          {error && (
            <div className="px-3 py-2 text-[11px] text-[#EF4444] bg-[rgba(239,68,68,0.08)] border-b border-[rgba(239,68,68,0.2)]">
              {error}
            </div>
          )}

          {mode === "menu" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("rename");
                  setRenameValue(terminal.label);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#A1A1AA] hover:bg-[rgba(79,70,229,0.15)] hover:text-white transition-colors"
              >
                Rename terminal
              </button>
              <button
                type="button"
                onClick={() => setMode("confirm-delete")}
                className="w-full text-left px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
              >
                Remove terminal
              </button>
            </>
          )}

          {mode === "rename" && (
            <div className="p-3">
              <label className="block text-[11px] text-[#7C8DB0] mb-1.5">Terminal name</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setOpen(false);
                    setMode("menu");
                  }
                }}
                maxLength={100}
                autoFocus
                className="w-full px-2.5 py-1.5 rounded-md bg-[#0F0A1A] border border-[rgba(79,70,229,0.2)] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setMode("menu");
                  }}
                  className="px-2.5 py-1 text-xs text-[#7C8DB0] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={saving || !renameValue.trim()}
                  className="px-2.5 py-1 text-xs font-medium bg-[#6366F1] text-white rounded-md hover:bg-[#818CF8] disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          {mode === "confirm-delete" && (
            <div className="p-3">
              <p className="text-xs text-[#A1A1AA] mb-1">
                Remove <span className="font-medium text-white">{terminal.label}</span>?
              </p>
              <p className="text-[10px] text-[#64748B] mb-3">
                The terminal will be hidden. Trade history and proof chains are preserved.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setMode("menu");
                  }}
                  className="px-2.5 py-1 text-xs text-[#7C8DB0] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-2.5 py-1 text-xs font-medium bg-[#EF4444] text-white rounded-md hover:bg-[#F87171] disabled:opacity-50 transition-colors"
                >
                  {saving ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Deployment Overflow Menu ─────────────────────────

function DeploymentOverflowMenu({
  terminalId,
  deploymentId,
  onRefresh,
}: {
  terminalId: string;
  deploymentId: string;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleIgnore = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/live/terminal/${terminalId}/deployments/${deploymentId}/ignore`,
        { method: "POST" }
      );
      if (!res.ok) return;
      setOpen(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setConfirming(false);
        }}
        className="p-0.5 rounded hover:bg-[rgba(79,70,229,0.15)] transition-colors"
        aria-label="Deployment actions"
      >
        <svg className="w-3.5 h-3.5 text-[#64748B]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full text-left px-4 py-2.5 text-sm text-[#A1A1AA] hover:bg-[rgba(79,70,229,0.15)] hover:text-white transition-colors"
            >
              Ignore deployment
            </button>
          ) : (
            <div className="p-3">
              <p className="text-[11px] text-[#A1A1AA] mb-2">
                Hide this deployment? It won&apos;t appear again even if new telemetry arrives.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setConfirming(false);
                  }}
                  className="px-2.5 py-1 text-xs text-[#7C8DB0] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIgnore}
                  disabled={saving}
                  className="px-2.5 py-1 text-xs font-medium bg-[#6366F1] text-white rounded-md hover:bg-[#818CF8] disabled:opacity-50 transition-colors"
                >
                  {saving ? "Hiding..." : "Ignore"}
                </button>
              </div>
            </div>
          )}
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
  const [showLinkInstanceDialog, setShowLinkInstanceDialog] = useState(false);
  const [showBaselineDialog, setShowBaselineDialog] = useState(false);

  const baselineTrust = resolveBaselineTrust(deployment.baselineStatus);
  const monitoringLabel = resolveMonitoringLabel(deployment);
  const action = resolveAction(deployment);
  const isDiscovered = deployment.source === "DISCOVERED";

  return (
    <div className="px-5 py-3">
      {/* Identity line */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-medium text-white">
          {deployment.symbol}
          {deployment.timeframe !== "*" && ` · ${deployment.timeframe}`}
        </span>
        <span className="text-[10px] font-mono text-[#64748B]">Magic {deployment.magicNumber}</span>
        {deployment.eaName && !deployment.eaName.startsWith("Magic ") && (
          <span className="text-[10px] text-[#7C8DB0]">· {deployment.eaName}</span>
        )}
        {isDiscovered && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.15)] text-[#818CF8]">
            Discovered
          </span>
        )}
        <div className="ml-auto flex-shrink-0">
          <DeploymentOverflowMenu
            terminalId={terminalId}
            deploymentId={deployment.id}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* Status rows */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusLine label="Baseline" value={baselineTrust.label} color={baselineTrust.color} />
        <StatusLine label="Monitoring" value={monitoringLabel.text} color={monitoringLabel.color} />
        <span className="text-[10px] text-[#64748B]">
          Last seen {formatTimeAgo(deployment.lastSeenAt)}
        </span>
      </div>

      {/* Action line */}
      {action && (
        <div className="mt-1.5">
          {action.type === "link" && (
            <button
              type="button"
              onClick={() => setShowLinkInstanceDialog(true)}
              className="text-[11px] font-medium text-[#A78BFA] hover:text-white transition-colors"
            >
              {isDiscovered
                ? "Link a baseline to start monitoring this strategy"
                : "Action: Link instance"}
            </button>
          )}
          {action.type === "relink" && deployment.instanceId && (
            <button
              type="button"
              onClick={() => setShowBaselineDialog(true)}
              className="text-[11px] font-medium text-[#F59E0B] hover:text-white transition-colors"
            >
              Action: {baselineTrust.actionLabel}
            </button>
          )}
          {action.type === "link-baseline" && deployment.instanceId && (
            <button
              type="button"
              onClick={() => setShowBaselineDialog(true)}
              className="text-[11px] font-medium text-[#A78BFA] hover:text-white transition-colors"
            >
              Action: {baselineTrust.actionLabel}
            </button>
          )}
        </div>
      )}

      {showLinkInstanceDialog && (
        <LinkInstanceDialog
          terminalId={terminalId}
          deploymentId={deployment.id}
          deploymentLabel={`${deployment.eaName} — ${deployment.symbol} ${deployment.timeframe !== "*" ? deployment.timeframe : ""}`}
          onClose={() => setShowLinkInstanceDialog(false)}
          onLinked={() => {
            setShowLinkInstanceDialog(false);
            onRefresh();
          }}
        />
      )}

      {showBaselineDialog && deployment.instanceId && (
        <LinkBaselineDialog
          instanceId={deployment.instanceId}
          instanceName={`${deployment.eaName} — ${deployment.symbol} ${deployment.timeframe !== "*" ? deployment.timeframe : ""}`}
          isRelink={deployment.baselineStatus === "RELINK_REQUIRED"}
          deploymentLabel={`${deployment.symbol} · ${deployment.timeframe !== "*" ? deployment.timeframe + " · " : ""}Magic ${deployment.magicNumber}`}
          onClose={() => setShowBaselineDialog(false)}
          onLinked={() => {
            setShowBaselineDialog(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ── Instance display helpers ─────────────────────────

function StatusLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="text-[10px]">
      <span className="text-[#64748B]">{label}:</span>{" "}
      <span className="font-medium" style={{ color }}>
        {value}
      </span>
    </span>
  );
}

function resolveMonitoringLabel(deployment: Deployment): { text: string; color: string } {
  if (!deployment.instance) {
    return { text: "Not linked", color: "#71717A" };
  }
  if (deployment.baselineStatus === "RELINK_REQUIRED" || deployment.baselineStatus === "UNLINKED") {
    return { text: "No baseline", color: "#71717A" };
  }
  const state = deployment.instance.lifecycleState;
  switch (state) {
    case "LIVE_MONITORING":
      return { text: "Healthy", color: "#10B981" };
    case "EDGE_AT_RISK":
      return { text: "At risk", color: "#F59E0B" };
    case "INVALIDATED":
      return { text: "Invalidated", color: "#EF4444" };
    default:
      return { text: "Pending", color: "#7C8DB0" };
  }
}

function resolveAction(
  deployment: Deployment
): { type: "link" | "relink" | "link-baseline" } | null {
  if (!deployment.instanceId) {
    return { type: "link" };
  }
  if (deployment.baselineStatus === "RELINK_REQUIRED") {
    return { type: "relink" };
  }
  if (deployment.baselineStatus === "UNLINKED") {
    return { type: "link-baseline" };
  }
  return null;
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

/** Returns null for missing or unparseable timestamps. Negative age (clock skew) is clamped to 0. */
function resolveHeartbeatStatus(
  lastHeartbeat: string | null,
  now: number
): { label: string; color: string; bg: string; border: string } | null {
  if (!lastHeartbeat) return null;
  const ts = new Date(lastHeartbeat).getTime();
  if (Number.isNaN(ts)) return null;
  const ageSec = Math.max(0, (now - ts) / 1000);
  if (ageSec < 30) {
    return {
      label: "LIVE",
      color: "#10B981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.25)",
    };
  }
  if (ageSec < 120) {
    return {
      label: "DELAYED",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.25)",
    };
  }
  if (ageSec < 600) {
    return {
      label: "STALE",
      color: "#71717A",
      bg: "rgba(113,113,122,0.1)",
      border: "rgba(113,113,122,0.2)",
    };
  }
  return {
    label: "OFFLINE",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  };
}

function formatHeartbeatAgo(iso: string, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
