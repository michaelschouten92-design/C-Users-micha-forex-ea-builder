/**
 * Shared live instance data shape.
 *
 * Single source of truth for the shape used by:
 * - initial page load (page.tsx serialization)
 * - /api/live/status polling response
 * - client state (LiveDashboardClient)
 * - SSE heartbeat patch
 *
 * Adding a field here forces all three surfaces to stay in sync.
 */

// ── Nested shapes ────────────────────────────────────────

export interface LiveInstanceTrade {
  profit: number;
  closeTime: string | null;
  symbol?: string | null;
  magicNumber?: number | null;
  ticket?: string;
  openPrice?: number;
  closePrice?: number | null;
  lots?: number;
  type?: string;
}

export interface LiveInstanceHeartbeat {
  equity: number;
  createdAt: string;
}

export interface LiveInstanceHealthSnapshot {
  driftDetected: boolean;
  driftSeverity: number;
  status: string;
}

export interface LiveInstanceBaseline {
  winRate: number | null;
  profitFactor: number | null;
  totalTrades: number | null;
  maxDrawdownPct: number | null;
  sharpeRatio: number | null;
}

export interface LiveInstanceDeployment {
  id: string;
  symbol: string;
  magicNumber: number;
  eaName: string;
  timeframe: string;
  baselineStatus: string;
  strategyVersionId: string | null;
}

// ── Main DTO ─────────────────────────────────────────────

export interface LiveInstanceDTO {
  id: string;
  createdAt: string;
  eaName: string;
  symbol: string | null;
  timeframe: string | null;
  broker: string | null;
  accountNumber: string | null;
  status: "ONLINE" | "OFFLINE" | "ERROR";
  mode: "LIVE" | "PAPER";
  tradingState: "TRADING" | "PAUSED";
  lastHeartbeat: string | null;
  lastError: string | null;
  balance: number | null;
  equity: number | null;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  sortOrder?: number;
  parentInstanceId?: string | null;
  lifecycleState?: string | null;
  strategyStatus?: string | null;
  operatorHold?: string | null;
  apiKeySuffix?: string | null;
  trackRecordToken?: string | null;
  healthStatus?: string | null;
  isExternal?: boolean;
  isAutoDiscovered?: boolean;
  monitoringSuppressedUntil?: string | null;
  baseline?: LiveInstanceBaseline | null;
  relinkRequired?: boolean;
  monitoringReasons?: string[];
  trades: LiveInstanceTrade[];
  heartbeats: LiveInstanceHeartbeat[];
  healthSnapshots?: LiveInstanceHealthSnapshot[];
  deployments?: LiveInstanceDeployment[];
}

// ── SSE heartbeat patch ──────────────────────────────────
// Fields sent by the SSE stream heartbeat event.
// Must stay in sync with /api/live/stream and the client onHeartbeat handler.

export interface LiveHeartbeatPatch {
  instanceId: string;
  equity: number;
  balance: number;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  status: string;
  tradingState: string;
  lastHeartbeat: string | null;
  lastError: string | null;
}

// ── Update helpers ───────────────────────────────────────

/**
 * Apply a heartbeat patch to a live instance.
 * Centralizes the field mapping so SSE and any future update path
 * cannot silently drop fields.
 */
export function applyHeartbeatPatch<T extends LiveInstanceDTO>(
  instance: T,
  patch: LiveHeartbeatPatch
): T {
  return {
    ...instance,
    equity: patch.equity,
    balance: patch.balance,
    openTrades: patch.openTrades,
    totalTrades: patch.totalTrades,
    totalProfit: patch.totalProfit,
    status: patch.status as T["status"],
    tradingState: patch.tradingState as T["tradingState"],
    lastHeartbeat: patch.lastHeartbeat,
    lastError: patch.lastError,
  };
}

// ── Selectors ────────────────────────────────────────────

/**
 * Returns true for base/account container instances.
 * These represent account-level aggregates in account-wide mode.
 *
 * Used by Floating P&L, Open Trades, Total Trades summary cards.
 * Must be consistent across all dashboard surfaces.
 */
export function isAccountContainer(
  ea: Pick<LiveInstanceDTO, "mode" | "parentInstanceId" | "symbol">
): boolean {
  return ea.mode === "LIVE" && !ea.parentInstanceId && !ea.symbol;
}
