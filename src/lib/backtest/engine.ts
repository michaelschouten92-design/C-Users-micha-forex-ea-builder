/**
 * Main backtest engine - bar-by-bar simulation.
 * Evaluates the BuildJsonSchema node graph against OHLCV data.
 */

import type {
  OHLCVBar,
  BacktestConfig,
  BacktestEngineResult,
  BacktestTradeResult,
  SimulatedPosition,
  PositionDirection,
} from "./types";
import type { BuildJsonSchema } from "@/types/builder";
import {
  parseStrategy,
  evaluateEntrySignals,
  evaluateExitSignals,
} from "./evaluator/strategy-evaluator";
import {
  openPosition,
  checkSLTP,
  calcRealizedProfit,
  applyTrailingStop,
  applyBreakevenStop,
  checkPartialClose,
} from "./simulator/trade-simulator";
import { EquityTracker } from "./simulator/equity-tracker";
import { computeIndicator } from "./indicators";

export interface EngineProgressCallback {
  (percent: number, barsProcessed: number, totalBars: number): void;
}

/**
 * Run a full backtest simulation.
 */
export function runBacktest(
  bars: OHLCVBar[],
  buildJson: BuildJsonSchema,
  config: BacktestConfig,
  onProgress?: EngineProgressCallback
): BacktestEngineResult {
  const startTime = performance.now();
  const warnings: string[] = [];

  // Parse strategy from node graph
  const strategy = parseStrategy(buildJson, bars);
  warnings.push(...strategy.warnings);

  if (strategy.indicators.length === 0) {
    warnings.push("No indicator nodes found - strategy has no entry conditions");
  }

  // Pre-compute ATR for SL/TP calculations (always useful)
  const atrConfig = { id: "__atr14", type: "atr", params: { period: 14 } };
  const atrBuffers = computeIndicator(bars, atrConfig);
  const atrValues = atrBuffers.value;

  // Settings
  const settings = buildJson.settings;
  const maxOpenTrades = settings?.maxOpenTrades ?? 1;
  const maxTradesPerDay = settings?.maxTradesPerDay ?? 0;
  const allowHedging = settings?.allowHedging ?? false;

  // State
  const equity = new EquityTracker(config);
  const openPositions: SimulatedPosition[] = [];
  const closedTrades: BacktestTradeResult[] = [];
  let nextPositionId = 1;
  let tradesToday = 0;
  let currentDay = -1;
  let lastEntryBar = -999;
  const minBarsBetweenTrades = settings?.minBarsBetweenTrades ?? 0;

  // Progress tracking
  const totalBars = bars.length;
  let lastProgressPercent = 0;

  // ============================================
  // MAIN BAR LOOP
  // ============================================

  for (let i = strategy.warmupBars; i < totalBars; i++) {
    const bar = bars[i];

    // Reset daily counters
    const barDay = new Date(bar.time).getUTCDate();
    if (barDay !== currentDay) {
      currentDay = barDay;
      tradesToday = 0;
    }

    // Get ATR value for this bar
    const atrValue = atrValues?.[i];

    // ---- Step 1: Check SL/TP hits on open positions ----
    for (let p = openPositions.length - 1; p >= 0; p--) {
      const pos = openPositions[p];
      const hit = checkSLTP(pos, bar, config);
      if (hit) {
        const profit = calcRealizedProfit(pos, hit.closePrice, config);
        equity.recordTrade(profit);
        closedTrades.push({
          id: pos.id,
          direction: pos.direction,
          openTime: pos.openTime,
          closeTime: bar.time,
          openPrice: pos.openPrice,
          closePrice: hit.closePrice,
          lots: pos.lots,
          profit,
          closeReason: hit.reason,
        });
        openPositions.splice(p, 1);
      }
    }

    // ---- Step 2: Apply trade management (trailing, breakeven, partial close) ----
    for (let p = openPositions.length - 1; p >= 0; p--) {
      const pos = openPositions[p];
      const tradeConfig =
        pos.direction === "BUY" ? strategy.buyTradeConfig : strategy.sellTradeConfig;

      // Breakeven (apply before trailing)
      applyBreakevenStop(pos, bar, tradeConfig, atrValue, config);

      // Trailing stop
      applyTrailingStop(pos, bar, tradeConfig, atrValue, config);

      // Partial close
      const partialFraction = checkPartialClose(pos, bar, tradeConfig, config);
      if (partialFraction > 0) {
        const closeAmount = pos.lots * partialFraction;
        const closePrice = bar.close; // Close at current bar close
        const partialProfit = calcRealizedProfit({ ...pos, lots: closeAmount }, closePrice, config);
        equity.recordTrade(partialProfit);
        closedTrades.push({
          id: pos.id,
          direction: pos.direction,
          openTime: pos.openTime,
          closeTime: bar.time,
          openPrice: pos.openPrice,
          closePrice,
          lots: closeAmount,
          profit: partialProfit,
          closeReason: "SIGNAL",
        });
        pos.lots -= closeAmount;
        if (pos.lots <= config.lotStep / 2) {
          openPositions.splice(p, 1);
        }
      }

      // Time exit
      const timeExit = tradeConfig.timeExit;
      if (timeExit) {
        const barsOpen = i - pos.openBarIndex;
        if (barsOpen >= timeExit.exitAfterBars) {
          const closePrice = bar.close;
          const profit = calcRealizedProfit(pos, closePrice, config);
          equity.recordTrade(profit);
          closedTrades.push({
            id: pos.id,
            direction: pos.direction,
            openTime: pos.openTime,
            closeTime: bar.time,
            openPrice: pos.openPrice,
            closePrice,
            lots: pos.lots,
            profit,
            closeReason: "SIGNAL",
          });
          openPositions.splice(p, 1);
        }
      }
    }

    // ---- Step 3: Check risk management limits ----
    // Daily loss limit
    if (settings?.maxDailyLossPercent && settings.maxDailyLossPercent > 0) {
      const dayPnL = getDayPnL(closedTrades, bar.time);
      const lossLimit = config.initialBalance * (settings.maxDailyLossPercent / 100);
      if (dayPnL < -lossLimit) continue; // Skip entries for today
    }

    // Max drawdown
    if (settings?.maxTotalDrawdownPercent && settings.maxTotalDrawdownPercent > 0) {
      if (equity.getMaxDrawdownPercent() >= settings.maxTotalDrawdownPercent) {
        // Close all and stop
        closeAllPositions(openPositions, bar, config, equity, closedTrades, "RISK_MGMT");
        continue;
      }
    }

    // ---- Step 4: Evaluate exit signals ----
    const exitSignals = evaluateExitSignals(i, bars, strategy);
    if (exitSignals.closeBuy || exitSignals.closeSell) {
      for (let p = openPositions.length - 1; p >= 0; p--) {
        const pos = openPositions[p];
        if (
          (pos.direction === "BUY" && exitSignals.closeBuy) ||
          (pos.direction === "SELL" && exitSignals.closeSell)
        ) {
          const closePrice = bar.close;
          const profit = calcRealizedProfit(pos, closePrice, config);
          equity.recordTrade(profit);
          closedTrades.push({
            id: pos.id,
            direction: pos.direction,
            openTime: pos.openTime,
            closeTime: bar.time,
            openPrice: pos.openPrice,
            closePrice,
            lots: pos.lots,
            profit,
            closeReason: "SIGNAL",
          });
          openPositions.splice(p, 1);
        }
      }
    }

    // ---- Step 5: Evaluate entry signals ----
    if (openPositions.length < maxOpenTrades) {
      if (maxTradesPerDay === 0 || tradesToday < maxTradesPerDay) {
        if (minBarsBetweenTrades === 0 || i - lastEntryBar >= minBarsBetweenTrades) {
          const entrySignals = evaluateEntrySignals(i, bars, strategy);

          if (
            entrySignals.buy &&
            canOpenBuy(openPositions, allowHedging, settings?.maxBuyPositions)
          ) {
            const pos = openPosition(
              nextPositionId++,
              "BUY",
              bar,
              i,
              strategy.buyTradeConfig,
              equity.getBalance(),
              atrValue,
              config
            );
            openPositions.push(pos);
            tradesToday++;
            lastEntryBar = i;
          }

          if (
            entrySignals.sell &&
            canOpenSell(openPositions, allowHedging, settings?.maxSellPositions)
          ) {
            if (openPositions.length < maxOpenTrades) {
              const pos = openPosition(
                nextPositionId++,
                "SELL",
                bar,
                i,
                strategy.sellTradeConfig,
                equity.getBalance(),
                atrValue,
                config
              );
              openPositions.push(pos);
              tradesToday++;
              lastEntryBar = i;
            }
          }
        }
      }
    }

    // ---- Step 6: Update equity ----
    equity.updateEquity(i, bar, openPositions);

    // ---- Step 7: Report progress ----
    if (onProgress) {
      const percent = Math.floor((i / totalBars) * 100);
      if (percent > lastProgressPercent) {
        lastProgressPercent = percent;
        onProgress(percent, i, totalBars);
      }
    }
  }

  // Close any remaining positions at last bar
  if (openPositions.length > 0 && bars.length > 0) {
    const lastBar = bars[bars.length - 1];
    closeAllPositions(openPositions, lastBar, config, equity, closedTrades, "MANUAL");
  }

  // ============================================
  // COMPUTE RESULT METRICS
  // ============================================
  const duration = performance.now() - startTime;
  return computeResults(closedTrades, equity, config, bars.length, duration, warnings);
}

// ============================================
// HELPERS
// ============================================

function closeAllPositions(
  positions: SimulatedPosition[],
  bar: OHLCVBar,
  config: BacktestConfig,
  equity: EquityTracker,
  closedTrades: BacktestTradeResult[],
  reason: "RISK_MGMT" | "MANUAL"
): void {
  for (const pos of positions) {
    const closePrice = bar.close;
    const profit = calcRealizedProfit(pos, closePrice, config);
    equity.recordTrade(profit);
    closedTrades.push({
      id: pos.id,
      direction: pos.direction,
      openTime: pos.openTime,
      closeTime: bar.time,
      openPrice: pos.openPrice,
      closePrice,
      lots: pos.lots,
      profit,
      closeReason: reason,
    });
  }
  positions.length = 0;
}

function canOpenBuy(
  positions: SimulatedPosition[],
  allowHedging: boolean,
  maxBuy?: number
): boolean {
  if (!allowHedging && positions.some((p) => p.direction === "SELL")) return false;
  if (maxBuy !== undefined && maxBuy > 0) {
    const buyCount = positions.filter((p) => p.direction === "BUY").length;
    if (buyCount >= maxBuy) return false;
  }
  return true;
}

function canOpenSell(
  positions: SimulatedPosition[],
  allowHedging: boolean,
  maxSell?: number
): boolean {
  if (!allowHedging && positions.some((p) => p.direction === "BUY")) return false;
  if (maxSell !== undefined && maxSell > 0) {
    const sellCount = positions.filter((p) => p.direction === "SELL").length;
    if (sellCount >= maxSell) return false;
  }
  return true;
}

function getDayPnL(trades: BacktestTradeResult[], currentTime: number): number {
  const dayStart = new Date(currentTime);
  dayStart.setUTCHours(0, 0, 0, 0);
  const start = dayStart.getTime();

  let pnl = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].closeTime < start) break;
    pnl += trades[i].profit;
  }
  return pnl;
}

function computeResults(
  trades: BacktestTradeResult[],
  equity: EquityTracker,
  config: BacktestConfig,
  barsProcessed: number,
  duration: number,
  warnings: string[]
): BacktestEngineResult {
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      netProfit: 0,
      totalProfit: 0,
      totalLoss: 0,
      maxDrawdown: equity.getMaxDrawdown(),
      maxDrawdownPercent: equity.getMaxDrawdownPercent(),
      largestWin: 0,
      largestLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      sharpeRatio: 0,
      recoveryFactor: 0,
      expectedPayoff: 0,
      initialDeposit: config.initialBalance,
      finalBalance: equity.getBalance(),
      trades,
      equityCurve: equity.getEquityCurve(),
      barsProcessed,
      duration,
      warnings,
    };
  }

  // Win/loss breakdown
  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit <= 0);
  const winRate = (wins.length / totalTrades) * 100;

  const totalProfit = wins.reduce((s, t) => s + t.profit, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.profit, 0));
  const netProfit = totalProfit - totalLoss;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.profit)) : 0;
  const largestLoss = losses.length > 0 ? Math.max(...losses.map((t) => Math.abs(t.profit))) : 0;
  const averageWin = wins.length > 0 ? totalProfit / wins.length : 0;
  const averageLoss = losses.length > 0 ? totalLoss / losses.length : 0;

  // Consecutive wins/losses
  let maxConsWins = 0,
    maxConsLosses = 0;
  let consWins = 0,
    consLosses = 0;
  for (const t of trades) {
    if (t.profit > 0) {
      consWins++;
      consLosses = 0;
      maxConsWins = Math.max(maxConsWins, consWins);
    } else {
      consLosses++;
      consWins = 0;
      maxConsLosses = Math.max(maxConsLosses, consLosses);
    }
  }

  // Sharpe ratio (annualized, assuming ~252 trading days)
  const returns = trades.map((t) => t.profit);
  const avgReturn = netProfit / totalTrades;
  const stdDev = Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / totalTrades);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Recovery factor
  const maxDD = equity.getMaxDrawdown();
  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : 0;

  // Expected payoff
  const expectedPayoff = netProfit / totalTrades;

  return {
    totalTrades,
    winRate,
    profitFactor,
    netProfit,
    totalProfit,
    totalLoss,
    maxDrawdown: maxDD,
    maxDrawdownPercent: equity.getMaxDrawdownPercent(),
    largestWin,
    largestLoss,
    averageWin,
    averageLoss,
    maxConsecutiveWins: maxConsWins,
    maxConsecutiveLosses: maxConsLosses,
    sharpeRatio,
    recoveryFactor,
    expectedPayoff,
    initialDeposit: config.initialBalance,
    finalBalance: equity.getBalance(),
    trades,
    equityCurve: equity.getEquityCurve(),
    barsProcessed,
    duration,
    warnings,
  };
}
