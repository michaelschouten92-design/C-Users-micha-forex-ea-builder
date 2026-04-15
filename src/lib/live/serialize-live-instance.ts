import { computeEdgeScore } from "@/domain/monitoring/edge-score";
import type { LiveInstanceDTO } from "./live-instance-dto";

/**
 * Shared serializer for Live EA instances. Used by both the initial page
 * load and the /api/live/status polling endpoint so that baseline, edgeScore,
 * and deployments stay in sync — otherwise the polling fallback freezes
 * these fields until full page reload (see audit P0-2).
 */

type BacktestBaseline = {
  winRate: number | null;
  profitFactor: number | null;
  totalTrades: number | null;
  maxDrawdownPct: number | null;
  sharpeRatio: number | null;
  netReturnPct: number | null;
  initialDeposit: number | null;
};

type DeploymentRow = {
  symbol: string;
  magicNumber: number;
  baselineStatus: string;
};

type Incident = { reasonCodes: unknown };

type HealthSnapshot = { driftDetected: boolean; driftSeverity: number; status: string };

type TrackRecordShare = { token: string };

export interface RawInstance {
  id: string;
  createdAt: Date;
  eaName: string;
  symbol: string | null;
  timeframe: string | null;
  broker: string | null;
  accountNumber: string | null;
  status: string;
  tradingState: string;
  lastHeartbeat: Date | null;
  lastError: string | null;
  balance: number | null;
  equity: number | null;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  sortOrder?: number | null;
  strategyStatus?: string | null;
  mode: string;
  parentInstanceId?: string | null;
  apiKeySuffix?: string | null;
  operatorHold?: string | null;
  monitoringSuppressedUntil?: Date | null;
  lifecycleState?: string | null;
  exportJobId?: string | null;
  isAutoDiscovered?: boolean;
  accountTrackRecordShares?: TrackRecordShare[];
  strategyVersion?: { backtestBaseline: BacktestBaseline | null } | null;
  incidents?: Incident[];
  healthSnapshots?: HealthSnapshot[];
  terminalDeployments?: DeploymentRow[];
}

export interface TradeAggregate {
  winCount: number;
  lossCount: number;
  grossProfit: number;
  grossLoss: number;
  tradeCount: number;
}

export interface RecentTrade {
  instanceId: string;
  profit: number;
  closeTime: string | null;
  symbol: string | null;
  magicNumber: number | null;
}

export function serializeLiveInstance(
  ea: RawInstance,
  tradeAggregates: Map<string, TradeAggregate>,
  recentTrades: RecentTrade[]
): LiveInstanceDTO {
  const bl = ea.strategyVersion?.backtestBaseline ?? null;

  const baseline = bl
    ? {
        winRate: bl.winRate,
        profitFactor: bl.profitFactor,
        totalTrades: bl.totalTrades,
        maxDrawdownPct: bl.maxDrawdownPct,
        sharpeRatio: bl.sharpeRatio,
      }
    : null;

  const edgeScore = computeInstanceEdgeScore(ea, bl, tradeAggregates);

  const deployments =
    ea.terminalDeployments?.map((d) => ({
      symbol: d.symbol,
      magicNumber: d.magicNumber,
      baselineStatus: d.baselineStatus,
    })) ?? [];

  return {
    id: ea.id,
    createdAt: ea.createdAt.toISOString(),
    eaName: ea.eaName,
    symbol: ea.symbol,
    timeframe: ea.timeframe,
    broker: ea.broker,
    accountNumber: ea.accountNumber,
    status: ea.status as LiveInstanceDTO["status"],
    mode: ea.mode === "PAPER" ? "PAPER" : "LIVE",
    tradingState: ea.tradingState as LiveInstanceDTO["tradingState"],
    lastHeartbeat: ea.lastHeartbeat?.toISOString() ?? null,
    lastError: ea.lastError,
    balance: ea.balance,
    equity: ea.equity,
    openTrades: ea.openTrades,
    totalTrades: ea.totalTrades,
    totalProfit: ea.totalProfit,
    sortOrder: ea.sortOrder ?? 0,
    strategyStatus: ea.strategyStatus ?? "MONITORING",
    operatorHold: ea.operatorHold ?? "NONE",
    parentInstanceId: ea.parentInstanceId ?? null,
    lifecycleState: ea.lifecycleState ?? null,
    apiKeySuffix: ea.apiKeySuffix ?? null,
    trackRecordToken: ea.accountTrackRecordShares?.[0]?.token ?? null,
    healthStatus: ea.healthSnapshots?.[0]?.status ?? null,
    isExternal: ea.exportJobId === null,
    isAutoDiscovered: ea.isAutoDiscovered ?? false,
    monitoringSuppressedUntil: ea.monitoringSuppressedUntil?.toISOString() ?? null,
    baseline,
    relinkRequired:
      ea.terminalDeployments?.some((d) => d.baselineStatus === "RELINK_REQUIRED") ?? false,
    monitoringReasons: sanitizeReasonCodes(ea.incidents?.[0]?.reasonCodes),
    trades: recentTrades
      .filter((t) => t.instanceId === ea.id)
      .map((t) => ({
        profit: t.profit,
        closeTime: t.closeTime,
        symbol: t.symbol,
        magicNumber: t.magicNumber,
      })),
    heartbeats: [],
    healthSnapshots: (ea.healthSnapshots ?? []).map((hs) => ({
      driftDetected: hs.driftDetected,
      driftSeverity: hs.driftSeverity,
      status: hs.status,
    })),
    deployments,
    edgeScore,
  };
}

function sanitizeReasonCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is string => typeof r === "string");
}

function computeInstanceEdgeScore(
  ea: Pick<RawInstance, "id" | "totalTrades" | "totalProfit" | "balance">,
  bl: BacktestBaseline | null,
  tradeAggregates: Map<string, TradeAggregate>
): LiveInstanceDTO["edgeScore"] {
  if (!bl || bl.winRate == null || bl.profitFactor == null) return null;

  const agg = tradeAggregates.get(ea.id) ?? {
    winCount: 0,
    lossCount: 0,
    grossProfit: 0,
    grossLoss: 0,
    tradeCount: 0,
  };

  // computeEdgeScore is the single source of truth for phase classification
  // (COLLECTING / EARLY / FULL / AWAITING_HISTORY). reportedTrades surfaces
  // the heartbeat-vs-ingest gap as AWAITING_HISTORY when applicable.
  const result = computeEdgeScore(
    {
      totalTrades: agg.tradeCount,
      winCount: agg.winCount,
      lossCount: agg.lossCount,
      grossProfit: agg.grossProfit,
      grossLoss: agg.grossLoss,
      maxDrawdownPct: 0,
      totalProfit: ea.totalProfit,
      balance: ea.balance ?? 0,
    },
    {
      winRate: bl.winRate,
      profitFactor: bl.profitFactor,
      maxDrawdownPct: bl.maxDrawdownPct ?? 0,
      netReturnPct: bl.netReturnPct ?? 0,
      initialDeposit: bl.initialDeposit ?? 0,
    },
    { reportedTrades: ea.totalTrades }
  );

  return {
    phase: result.phase,
    score: result.score,
    tradesCompleted: result.tradesCompleted,
    tradesRequired: result.tradesRequired,
    ...(result.reportedTrades !== undefined ? { reportedTrades: result.reportedTrades } : {}),
  };
}
