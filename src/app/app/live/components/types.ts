import type { LiveInstanceDTO } from "@/lib/live/live-instance-dto";

// EAInstanceData extends LiveInstanceDTO with optional UI-specific fields
// that may not be present in every data source.
export type EAInstanceData = LiveInstanceDTO & {
  healthScore?: number | null;
};

export interface TradeRecord {
  id: string;
  ticket: string;
  symbol: string;
  type: string;
  openPrice: number;
  closePrice: number | null;
  lots: number;
  profit: number;
  openTime: string;
  closeTime: string | null;
  mode: string | null;
}

export interface OpenTrade {
  id: string;
  ticket: string;
  symbol: string;
  type: string;
  openPrice: number;
  lots: number;
  profit: number;
  openTime: string;
  mode: string | null;
  magicNumber: number | null;
}

export interface AlertConfig {
  id: string;
  instanceId: string | null;
  instanceName: string | null;
  alertType: string;
  threshold: number | null;
  channel: string;
  webhookUrl: string | null;
  alertState: "ACTIVE" | "DISABLED";
  lastTriggered: string | null;
  createdAt: string;
}

export interface LiveDashboardClientProps {
  initialData: EAInstanceData[];
  tier?: string;
  initialRelinkInstanceId?: string | null;
}

export interface InstanceAttention {
  statusLabel: string;
  reason: string;
  actionLabel: string;
  color: string;
}

export interface AccountGroup {
  key: string;
  broker: string | null;
  accountNumber: string | null;
  instances: EAInstanceData[];
  /** Account-wide instance (symbol === null) if present, otherwise first instance */
  primary: EAInstanceData;
}

export type StrategyHealthLabel =
  | "Healthy"
  | "Elevated"
  | "Edge at Risk"
  | "Invalidated"
  | "Pending";

export const ALERT_TYPE_LABELS: Record<string, string> = {
  DRAWDOWN: "Floating Drawdown",
  OFFLINE: "EA Offline",
  NEW_TRADE: "New Trade",
  ERROR: "EA Error",
  DAILY_LOSS: "Daily Loss Limit",
  WEEKLY_LOSS: "Weekly Loss Limit",
  EQUITY_TARGET: "Equity Target",
};
