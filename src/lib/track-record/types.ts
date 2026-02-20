/**
 * Track Record Event Types — discriminated union for the event-sourced track record system.
 *
 * Every event carries `seqNo` (monotonic per instance) and `prevHash` (SHA-256
 * of the previous event's canonical JSON) forming a tamper-evident hash chain.
 */

// ============================================
// EVENT TYPE DISCRIMINATOR
// ============================================

export const TrackRecordEventType = {
  TRADE_OPEN: "TRADE_OPEN",
  TRADE_CLOSE: "TRADE_CLOSE",
  TRADE_MODIFY: "TRADE_MODIFY",
  PARTIAL_CLOSE: "PARTIAL_CLOSE",
  SNAPSHOT: "SNAPSHOT",
  SESSION_START: "SESSION_START",
  SESSION_END: "SESSION_END",
  CHAIN_RECOVERY: "CHAIN_RECOVERY",
  CASHFLOW: "CASHFLOW",
  BROKER_EVIDENCE: "BROKER_EVIDENCE",
  BROKER_HISTORY_DIGEST: "BROKER_HISTORY_DIGEST",
} as const;

export type TrackRecordEventType = (typeof TrackRecordEventType)[keyof typeof TrackRecordEventType];

// ============================================
// EVENT PAYLOADS
// ============================================

export interface TradeOpenPayload {
  ticket: string;
  symbol: string;
  direction: "BUY" | "SELL";
  lots: number;
  openPrice: number;
  sl: number;
  tp: number;
}

export interface TradeClosePayload {
  ticket: string;
  closePrice: number;
  profit: number;
  swap: number;
  commission: number;
  closeReason: string; // "SL" | "TP" | "MANUAL" | "EA" | "SO"
}

export interface TradeModifyPayload {
  ticket: string;
  newSL: number;
  newTP: number;
  oldSL: number;
  oldTP: number;
}

export interface PartialClosePayload {
  ticket: string;
  closedLots: number;
  remainingLots: number;
  profit: number;
  closePrice: number;
}

export interface SnapshotPayload {
  balance: number;
  equity: number;
  openTrades: number;
  unrealizedPnL: number;
  drawdown: number;
}

export interface SessionStartPayload {
  broker: string;
  account: string;
  symbol: string;
  timeframe: string;
  eaVersion: string;
  mode: "LIVE" | "PAPER";
  recoveryMode?: boolean;
}

export interface SessionEndPayload {
  reason: string;
  finalBalance: number;
  finalEquity: number;
  uptimeSeconds: number;
}

export interface ChainRecoveryPayload {
  previousSeqNo: number;
  previousHash: string;
  recoveredFromSeqNo: number;
  recoveredFromHash: string;
  reason: string;
}

export interface CashflowPayload {
  /** "DEPOSIT" | "WITHDRAWAL" */
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note: string;
}

export interface BrokerEvidencePayload {
  /** Broker's order ticket number */
  brokerTicket: string;
  /** Broker-reported execution timestamp (Unix seconds) */
  executionTimestamp: number;
  symbol: string;
  volume: number;
  executionPrice: number;
  /** "OPEN" | "CLOSE" */
  action: string;
  /** Corresponding track record ticket */
  linkedTicket: string;
}

export interface BrokerHistoryDigestPayload {
  /** ISO date range start */
  periodStart: string;
  /** ISO date range end */
  periodEnd: string;
  /** Total trades in broker export for this period */
  tradeCount: number;
  /** SHA-256 hash of canonical broker history CSV/JSON */
  historyHash: string;
  /** First ticket in the exported range */
  firstTicket: string;
  /** Last ticket in the exported range */
  lastTicket: string;
  /** Export format: "MT5_HTML" | "MT5_CSV" | "MT4_HTML" | "CUSTOM_CSV" */
  exportFormat: string;
}

// ============================================
// EVENT PAYLOAD UNION
// ============================================

export type TrackRecordPayload =
  | (TradeOpenPayload & { eventType: "TRADE_OPEN" })
  | (TradeClosePayload & { eventType: "TRADE_CLOSE" })
  | (TradeModifyPayload & { eventType: "TRADE_MODIFY" })
  | (PartialClosePayload & { eventType: "PARTIAL_CLOSE" })
  | (SnapshotPayload & { eventType: "SNAPSHOT" })
  | (SessionStartPayload & { eventType: "SESSION_START" })
  | (SessionEndPayload & { eventType: "SESSION_END" })
  | (ChainRecoveryPayload & { eventType: "CHAIN_RECOVERY" })
  | (CashflowPayload & { eventType: "CASHFLOW" })
  | (BrokerEvidencePayload & { eventType: "BROKER_EVIDENCE" })
  | (BrokerHistoryDigestPayload & { eventType: "BROKER_HISTORY_DIGEST" });

// ============================================
// INGEST REQUEST — what the EA sends
// ============================================

export interface TrackRecordIngestRequest {
  eventType: TrackRecordEventType;
  seqNo: number;
  prevHash: string;
  eventHash: string;
  timestamp: number; // Unix epoch seconds
  payload: Record<string, unknown>;
}

// ============================================
// CANONICAL EVENT — for hashing
// ============================================

export interface CanonicalEventFields {
  eaInstanceId: string;
  eventType: TrackRecordEventType;
  seqNo: number;
  prevHash: string;
  timestamp: number;
  [key: string]: unknown;
}

// ============================================
// STATE — running totals
// ============================================

export interface TrackRecordRunningState {
  lastSeqNo: number;
  lastEventHash: string;
  balance: number;
  equity: number;
  highWaterMark: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalTrades: number;
  totalProfit: number;
  totalSwap: number;
  totalCommission: number;
  winCount: number;
  lossCount: number;
  openPositions: OpenPosition[];
  /** Cumulative cashflow (deposits − withdrawals). Drawdown never resets from cashflow. */
  cumulativeCashflow: number;
  /** Max drawdown duration in seconds (peak-to-recovery) */
  maxDrawdownDurationSec: number;
  /** Timestamp when current drawdown period started (0 if at peak) */
  drawdownStartTimestamp: number;
  /** Peak equity timestamp for duration tracking */
  peakEquityTimestamp: number;
}

export interface OpenPosition {
  ticket: string;
  symbol: string;
  direction: "BUY" | "SELL";
  lots: number;
  openPrice: number;
  sl: number;
  tp: number;
}

// ============================================
// GENESIS HASH — the prevHash for the first event
// ============================================

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

// ============================================
// EXPORT FORMAT
// ============================================

export interface VerifiedTrackRecord {
  version: "1.0";
  generatedAt: string;
  label: "Self-Reported, Integrity-Verified";
  instance: {
    id: string;
    eaName: string;
    broker: string | null;
    account: string | null;
    mode: string;
    symbol: string | null;
    timeframe: string | null;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    netProfit: number;
    totalSwap: number;
    totalCommission: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    initialBalance: number;
    finalBalance: number;
  };
  equityCurve: { t: string; b: number; e: number; dd: number }[];
  trades: {
    ticket: string;
    symbol: string;
    dir: string;
    lots: number;
    open: number;
    close: number;
    profit: number;
    swap: number;
    comm: number;
    openAt: string;
    closeAt: string;
  }[];
  integrity: {
    chainLength: number;
    firstEventHash: string;
    lastEventHash: string;
    checkpointCount: number;
    lastCheckpointHmac: string;
    chainVerified: boolean;
  };
}

// ============================================
// REPORT MANIFEST — investor-proof deterministic report
// ============================================

export interface ReportManifest {
  /** Schema version for forward compatibility */
  schemaVersion: "2.0";
  /** Unique report ID */
  reportId: string;
  /** Instance this report covers */
  instanceId: string;
  /** Calculation engine version for reproducibility */
  calculationVersion: string;
  /** Event range (inclusive) */
  fromSeqNo: number;
  toSeqNo: number;
  /** UTC timestamp range (ISO 8601) */
  fromTimestamp: string;
  toTimestamp: string;
  /** Policy: how equity is computed */
  equityPolicy: "BALANCE_PLUS_UNREALIZED";
  /** Policy: how cashflows are handled */
  cashflowPolicy: "ADJUST_HWM_NO_DD_RESET";
  /** SHA-256 of first event in range */
  firstEventHash: string;
  /** SHA-256 of last event in range */
  lastEventHash: string;
  /** Root hash: SHA-256(concat(all eventHashes in range)) */
  ledgerRootHash: string;
  /** SHA-256 of the canonical report body JSON */
  reportBodyHash: string;
  /** Ed25519 signature of reportBodyHash (hex) */
  signature: string;
  /** Ed25519 public key (hex) for signature verification */
  publicKey: string;
  /** ISO 8601 generation timestamp */
  generatedAt: string;
}

// ============================================
// INVESTOR-PROOF REPORT — deterministic output
// ============================================

export interface InvestorReport {
  manifest: ReportManifest;
  body: ReportBody;
}

export interface ReportBody {
  instance: {
    id: string;
    eaName: string;
    broker: string | null;
    account: string | null;
    mode: string;
    symbol: string | null;
    timeframe: string | null;
  };
  /** Equity curve: every snapshot + trade-fill point */
  equityCurve: EquityPoint[];
  /** Balance curve: changes only on realized events */
  balanceCurve: BalancePoint[];
  /** Drawdown series: underwater curve */
  drawdownSeries: DrawdownPoint[];
  /** Closed trade list */
  trades: ReportTrade[];
  /** Daily returns (cashflow-neutral, time-weighted) */
  dailyReturns: DailyReturn[];
  /** Performance statistics */
  statistics: ReportStatistics;
  /** Audit metadata */
  audit: ReportAudit;
}

export interface EquityPoint {
  /** Unix epoch seconds */
  t: number;
  /** Balance */
  b: string;
  /** Equity (balance + unrealized) */
  e: string;
  /** Peak equity (high water mark) */
  p: string;
}

export interface BalancePoint {
  t: number;
  b: string;
  /** Event that caused the change */
  cause: string;
}

export interface DrawdownPoint {
  t: number;
  /** Absolute drawdown from peak */
  abs: string;
  /** Percentage drawdown from peak */
  pct: string;
}

export interface ReportTrade {
  ticket: string;
  symbol: string;
  direction: string;
  lots: string;
  openPrice: string;
  closePrice: string;
  profit: string;
  swap: string;
  commission: string;
  netProfit: string;
  openTimestamp: number;
  closeTimestamp: number;
  durationSec: number;
}

export interface DailyReturn {
  /** YYYY-MM-DD */
  date: string;
  /** Start-of-day equity */
  startEquity: string;
  /** End-of-day equity */
  endEquity: string;
  /** Cashflow during this day */
  cashflow: string;
  /** Time-weighted return excluding cashflow: (endEquity - startEquity - cashflow) / startEquity */
  twr: string;
}

export interface ReportStatistics {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: string;
  profitFactor: string;
  netProfit: string;
  grossProfit: string;
  grossLoss: string;
  totalSwap: string;
  totalCommission: string;
  averageWin: string;
  averageLoss: string;
  largestWin: string;
  largestLoss: string;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  /** Peak-to-trough maximum drawdown */
  maxDrawdownAbs: string;
  maxDrawdownPct: string;
  /** Longest drawdown duration in seconds */
  maxDrawdownDurationSec: number;
  /** Average trade duration in seconds */
  avgTradeDurationSec: number;
  /** Sharpe ratio (per-trade, risk-free = 0) */
  sharpeRatio: string;
  /** Sortino ratio (downside deviation, target = 0) */
  sortinoRatio: string;
  /** Calmar ratio (total return / max drawdown) */
  calmarRatio: string;
  initialBalance: string;
  finalBalance: string;
  finalEquity: string;
  cumulativeCashflow: string;
}

export interface ReportAudit {
  eventCount: number;
  snapshotCount: number;
  cashflowCount: number;
  brokerEvidenceCount: number;
  brokerDigestCount: number;
  chainVerified: boolean;
  checkpointCount: number;
  lastCheckpointHmac: string;
  /** Verification level achieved */
  verificationLevel: VerificationLevel;
}

// ============================================
// VERIFICATION LEVELS
// ============================================

export type VerificationLevel = "L0_NONE" | "L1_LEDGER" | "L2_BROKER" | "L3_NOTARIZED";

export interface VerificationResult {
  level: VerificationLevel;
  l1: L1Result;
  l2: L2Result | null;
  l3: L3Result | null;
  /** Overall pass/fail */
  verified: boolean;
  /** Human-readable summary */
  summary: string;
}

export interface L1Result {
  chainValid: boolean;
  chainLength: number;
  checkpointsValid: boolean;
  checkpointCount: number;
  signatureValid: boolean;
  reportReproducible: boolean;
  errors: string[];
}

export interface L2Result {
  brokerEvidenceCount: number;
  matchedCount: number;
  mismatchedCount: number;
  /** Tickets that didn't match broker data */
  mismatches: string[];
  digestValid: boolean;
  digestCount: number;
}

export interface L3Result {
  notarized: boolean;
  notarizationTimestamp: string | null;
  notarizationProof: string | null;
  provider: string | null;
}

// ============================================
// PROOF BUNDLE — everything a third party needs
// ============================================

export interface ProofBundle {
  /** The full investor report */
  report: InvestorReport;
  /** All events in the range (for independent replay) */
  events: {
    seqNo: number;
    eventType: string;
    eventHash: string;
    prevHash: string;
    timestamp: number;
    payload: Record<string, unknown>;
  }[];
  /** Checkpoints in the range */
  checkpoints: {
    seqNo: number;
    hmac: string;
    balance: string;
    equity: string;
    highWaterMark: string;
  }[];
  /** Broker evidence events (if any) */
  brokerEvidence: {
    brokerTicket: string;
    executionTimestamp: number;
    symbol: string;
    volume: string;
    executionPrice: string;
    linkedTicket: string;
  }[];
  /** Broker history digests (if any) */
  brokerDigests: {
    periodStart: string;
    periodEnd: string;
    tradeCount: number;
    historyHash: string;
  }[];
  /** Verification result */
  verification: VerificationResult;
}

// ============================================
// NOTARIZATION INTERFACE (plugin, optional)
// ============================================

export interface NotarizationProvider {
  name: string;
  /** Submit a hash for timestamped notarization */
  notarize(hash: string): Promise<NotarizationReceipt>;
  /** Verify a previously notarized hash */
  verify(receipt: NotarizationReceipt): Promise<boolean>;
}

export interface NotarizationReceipt {
  provider: string;
  hash: string;
  timestamp: string;
  proof: string;
  /** Provider-specific verification URL */
  verifyUrl?: string;
}
