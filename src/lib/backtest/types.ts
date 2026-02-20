/**
 * Core types for the integrated backtesting engine.
 * Bar-by-bar simulation using uploaded OHLCV CSV data.
 */

// ============================================
// OHLCV DATA
// ============================================

export interface OHLCVBar {
  time: number; // Unix timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================
// BACKTEST CONFIGURATION
// ============================================

export interface BacktestConfig {
  initialBalance: number;
  symbol: string;
  spread: number; // In points (e.g., 10 = 1 pip on 5-digit broker)
  commission: number; // Per lot per side in USD
  digits: number; // Price decimal places (5 for most forex, 3 for JPY pairs)
  pointValue: number; // Value of 1 point per lot in account currency
  lotStep: number; // Minimum lot increment (typically 0.01)
  minLot: number;
  maxLot: number;
  // Swap/overnight fee per lot in account currency (applied daily when position held overnight)
  swapLong: number; // Swap cost for BUY positions (negative = credit)
  swapShort: number; // Swap cost for SELL positions (negative = credit)
  // Requote simulation: probability (0-0.3) that a market order gets requoted (skipped)
  requoteRate: number;
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  initialBalance: 10000,
  symbol: "EURUSD",
  spread: 10,
  commission: 3.5,
  digits: 5,
  pointValue: 1, // $1 per point per lot for most USD pairs
  lotStep: 0.01,
  minLot: 0.01,
  maxLot: 100,
  swapLong: 0,
  swapShort: 0,
  requoteRate: 0,
};

// ============================================
// SIMULATED POSITIONS
// ============================================

export type PositionDirection = "BUY" | "SELL";

export interface SimulatedPosition {
  id: number;
  direction: PositionDirection;
  openTime: number;
  openPrice: number;
  lots: number;
  stopLoss: number;
  takeProfit: number;
  // Dynamic SL tracking for trailing/breakeven
  currentSL: number;
  // Partial close tracking
  originalLots: number;
  partialCloseExecuted: boolean;
  // Accumulated swap cost for this position (running total)
  accumulatedSwap: number;
  // Track commission already charged on partial closes
  commissionCharged: number;
  // Close info (set when position is closed)
  closeTime?: number;
  closePrice?: number;
  profit?: number;
  closeReason?: "SL" | "TP" | "SIGNAL" | "RISK_MGMT" | "MANUAL";
  // Bar index tracking
  openBarIndex: number;
  // Last day swap was applied (to detect overnight rollovers)
  lastSwapDay: number;
}

// ============================================
// ENGINE RESULTS
// ============================================

export interface BacktestTradeResult {
  id: number;
  direction: PositionDirection;
  openTime: number;
  closeTime: number;
  openPrice: number;
  closePrice: number;
  lots: number;
  profit: number;
  swap: number; // Accumulated swap for this trade
  commission: number; // Total commission charged for this trade
  closeReason: string;
  openBarIndex: number;
  closeBarIndex: number;
}

export interface EquityCurvePoint {
  barIndex: number;
  time: number;
  balance: number;
  equity: number;
  drawdown: number;
}

export interface MonthlyPnLEntry {
  month: string;
  pnl: number;
  trades: number;
}

export interface UnderwaterPoint {
  time: number;
  drawdownPercent: number;
}

export interface BacktestEngineResult {
  // Core metrics
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netProfit: number;
  totalProfit: number;
  totalLoss: number;
  // Drawdown
  maxDrawdown: number;
  maxDrawdownPercent: number;
  // Trade details
  largestWin: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  // Performance
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  ulcerIndex: number;
  recoveryFactor: number;
  expectedPayoff: number;
  // Trade duration
  averageTradeDuration: number; // in bars
  // Long/Short breakdown
  longTrades: number;
  shortTrades: number;
  longWinRate: number;
  shortWinRate: number;
  // Monthly P&L breakdown
  monthlyPnL: MonthlyPnLEntry[];
  // Underwater (drawdown over time)
  underwaterCurve: UnderwaterPoint[];
  // Balance
  initialDeposit: number;
  finalBalance: number;
  // Data
  trades: BacktestTradeResult[];
  equityCurve: EquityCurvePoint[];
  // Swap & Commission totals
  totalSwap: number;
  totalCommission: number;
  // Requote tracking
  requoteCount: number;
  // Metadata
  barsProcessed: number;
  duration: number; // ms
  warnings: string[];
}

// ============================================
// INDICATOR VALUES
// ============================================

/** Pre-computed indicator values for a single bar */
export interface IndicatorValues {
  [indicatorId: string]: {
    [bufferName: string]: number;
  };
}

/** Indicator computation state (holds internal buffers for incremental calculation) */
export interface IndicatorState {
  id: string;
  type: string;
  params: Record<string, unknown>;
  buffer: Record<string, number[]>;
  ready: boolean; // Has enough bars for valid output
}

// ============================================
// WEB WORKER MESSAGES
// ============================================

export interface WorkerStartMessage {
  type: "start";
  bars: OHLCVBar[];
  buildJson: unknown; // BuildJsonSchema
  config: BacktestConfig;
}

export interface WorkerProgressMessage {
  type: "progress";
  percent: number;
  barsProcessed: number;
  totalBars: number;
}

export interface WorkerResultMessage {
  type: "result";
  result: BacktestEngineResult;
}

export interface WorkerErrorMessage {
  type: "error";
  error: string;
}

export type WorkerOutMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage;

export type WorkerInMessage = WorkerStartMessage;
