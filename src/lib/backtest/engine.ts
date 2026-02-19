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
  MonthlyPnLEntry,
  UnderwaterPoint,
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

  // Auto-detect JPY pairs and adjust pointValue if still at default
  if (config.pointValue === 1 && config.digits === 3) {
    config = { ...config, pointValue: 100 };
    warnings.push(
      `JPY pair detected (digits=${config.digits}): pointValue adjusted to ${config.pointValue}`
    );
  }

  // Multi-pair correlation filter warning
  const multiPair = buildJson.settings?.multiPair;
  if (multiPair?.enabled && multiPair.correlationFilter) {
    warnings.push(
      "Correlation filter is enabled but cannot be applied in single-symbol backtest. " +
        "Correlation filtering between pairs requires multi-symbol data and is only applied in live trading."
    );
  }

  // Parse strategy from node graph
  const strategy = parseStrategy(buildJson, bars);
  warnings.push(...strategy.warnings);

  if (strategy.indicators.length === 0) {
    warnings.push("No indicator nodes found - strategy has no entry conditions");
  }

  // Determine ATR period from user's ATR node, otherwise default to 14
  let atrPeriod = 14;
  for (const ind of strategy.indicators) {
    if (ind.type === "atr") {
      const userPeriod = (ind.params as Record<string, unknown>).period;
      if (typeof userPeriod === "number" && userPeriod > 0) {
        atrPeriod = userPeriod;
      }
      break;
    }
  }

  // Pre-compute ATR for SL/TP calculations
  const atrConfig = { id: "__atr_sl_tp", type: "atr", params: { period: atrPeriod } };
  const atrBuffers = computeIndicator(bars, atrConfig);
  const atrValues = atrBuffers.value;

  const settings = buildJson.settings;
  const maxOpenTrades = settings?.maxOpenTrades ?? 1;
  const maxTradesPerDay = settings?.maxTradesPerDay ?? 0;
  const allowHedging = settings?.allowHedging ?? false;

  const equity = new EquityTracker(config);
  const openPositions: SimulatedPosition[] = [];
  const closedTrades: BacktestTradeResult[] = [];
  let nextPositionId = 1;
  let tradesToday = 0;
  let currentDay = -1;
  let lastEntryBar = -999;
  const minBarsBetweenTrades = settings?.minBarsBetweenTrades ?? 0;

  const totalBars = bars.length;
  let lastProgressPercent = 0;

  for (let i = strategy.warmupBars; i < totalBars; i++) {
    const bar = bars[i];

    const barDay = new Date(bar.time).getUTCDate();
    if (barDay !== currentDay) {
      currentDay = barDay;
      tradesToday = 0;
    }

    const atrValue = atrValues?.[i];

    // Step 1: Check SL/TP hits
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
          openBarIndex: pos.openBarIndex,
          closeBarIndex: i,
        });
        openPositions.splice(p, 1);
      }
    }

    // Step 2: Trade management
    for (let p = openPositions.length - 1; p >= 0; p--) {
      const pos = openPositions[p];
      const tradeConfig =
        pos.direction === "BUY" ? strategy.buyTradeConfig : strategy.sellTradeConfig;

      applyBreakevenStop(pos, bar, tradeConfig, atrValue, config);
      applyTrailingStop(pos, bar, tradeConfig, atrValue, config);

      const partialFraction = checkPartialClose(pos, bar, tradeConfig, config);
      if (partialFraction > 0) {
        const closeAmount = pos.lots * partialFraction;
        const closePrice = bar.close;
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
          openBarIndex: pos.openBarIndex,
          closeBarIndex: i,
        });
        pos.lots -= closeAmount;
        if (pos.lots <= config.lotStep / 2) openPositions.splice(p, 1);
      }

      const timeExit = tradeConfig.timeExit;
      if (timeExit && i - pos.openBarIndex >= timeExit.exitAfterBars) {
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
          openBarIndex: pos.openBarIndex,
          closeBarIndex: i,
        });
        openPositions.splice(p, 1);
      }
    }

    // Step 3: Risk management
    if (settings?.maxDailyLossPercent && settings.maxDailyLossPercent > 0) {
      const dayPnL = getDayPnL(closedTrades, bar.time);
      const lossLimit = config.initialBalance * (settings.maxDailyLossPercent / 100);
      if (dayPnL < -lossLimit) continue;
    }

    if (settings?.maxTotalDrawdownPercent && settings.maxTotalDrawdownPercent > 0) {
      if (equity.getMaxDrawdownPercent() >= settings.maxTotalDrawdownPercent) {
        closeAllPositions(openPositions, bar, i, config, equity, closedTrades, "RISK_MGMT");
        continue;
      }
    }

    // Step 4: Exit signals
    const exitSignals = evaluateExitSignals(i, bars, strategy);
    if (exitSignals.closeBuy || exitSignals.closeSell) {
      for (let p = openPositions.length - 1; p >= 0; p--) {
        const pos = openPositions[p];
        const shouldClose =
          (pos.direction === "BUY" && exitSignals.closeBuy) ||
          (pos.direction === "SELL" && exitSignals.closeSell);
        if (shouldClose) {
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
            openBarIndex: pos.openBarIndex,
            closeBarIndex: i,
          });
          openPositions.splice(p, 1);
        }
      }
    }

    // Step 5: Entry signals
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

    equity.updateEquity(i, bar, openPositions);

    if (onProgress) {
      const percent = Math.floor((i / totalBars) * 100);
      if (percent > lastProgressPercent) {
        lastProgressPercent = percent;
        onProgress(percent, i, totalBars);
      }
    }
  }

  if (openPositions.length > 0 && bars.length > 0) {
    const lastBar = bars[bars.length - 1];
    closeAllPositions(
      openPositions,
      lastBar,
      bars.length - 1,
      config,
      equity,
      closedTrades,
      "MANUAL"
    );
  }

  const duration = performance.now() - startTime;
  return computeResults(closedTrades, equity, config, bars.length, duration, warnings);
}

// ============================================
// HELPERS
// ============================================

function closeAllPositions(
  positions: SimulatedPosition[],
  bar: OHLCVBar,
  barIndex: number,
  config: BacktestConfig,
  equity: EquityTracker,
  closedTrades: BacktestTradeResult[],
  reason: "RISK_MGMT" | "MANUAL"
): void {
  for (const pos of positions) {
    const profit = calcRealizedProfit(pos, bar.close, config);
    equity.recordTrade(profit);
    closedTrades.push({
      id: pos.id,
      direction: pos.direction,
      openTime: pos.openTime,
      closeTime: bar.time,
      openPrice: pos.openPrice,
      closePrice: bar.close,
      lots: pos.lots,
      profit,
      closeReason: reason,
      openBarIndex: pos.openBarIndex,
      closeBarIndex: barIndex,
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
    if (positions.filter((p) => p.direction === "BUY").length >= maxBuy) return false;
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
    if (positions.filter((p) => p.direction === "SELL").length >= maxSell) return false;
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

// ============================================
// METRICS
// ============================================

function computeMonthlyPnL(trades: BacktestTradeResult[]): MonthlyPnLEntry[] {
  const monthMap = new Map<string, { pnl: number; trades: number }>();
  for (const trade of trades) {
    const d = new Date(trade.closeTime);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) ?? { pnl: 0, trades: 0 };
    entry.pnl += trade.profit;
    entry.trades += 1;
    monthMap.set(key, entry);
  }
  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, pnl: data.pnl, trades: data.trades }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function computeUnderwaterCurve(
  equityCurve: { time: number; equity: number }[]
): UnderwaterPoint[] {
  if (equityCurve.length === 0) return [];
  const result: UnderwaterPoint[] = [];
  let peak = equityCurve[0].equity;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    result.push({
      time: pt.time,
      drawdownPercent: peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0,
    });
  }
  return result;
}

function computeSortinoRatio(trades: BacktestTradeResult[], avgReturn: number): number {
  if (trades.length === 0) return 0;
  let sumSqDown = 0;
  for (const t of trades) {
    const diff = t.profit - avgReturn;
    if (diff < 0) sumSqDown += diff * diff;
  }
  const dd = Math.sqrt(sumSqDown / trades.length);
  return dd > 0 ? (avgReturn / dd) * Math.sqrt(252) : 0;
}

function computeCalmarRatio(netProfit: number, maxDD: number, bars: number): number {
  if (maxDD <= 0 || bars <= 0) return 0;
  const annualizedReturn = (netProfit / bars) * (252 * 6);
  return annualizedReturn / maxDD;
}

function computeUlcerIndex(equityCurve: { equity: number }[]): number {
  if (equityCurve.length === 0) return 0;
  let peak = equityCurve[0].equity;
  let sumSqDD = 0;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0;
    sumSqDD += dd * dd;
  }
  return Math.sqrt(sumSqDD / equityCurve.length);
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
  const equityCurve = equity.getEquityCurve();

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
      sortinoRatio: 0,
      calmarRatio: 0,
      ulcerIndex: 0,
      recoveryFactor: 0,
      expectedPayoff: 0,
      averageTradeDuration: 0,
      longTrades: 0,
      shortTrades: 0,
      longWinRate: 0,
      shortWinRate: 0,
      monthlyPnL: [],
      underwaterCurve: [],
      initialDeposit: config.initialBalance,
      finalBalance: equity.getBalance(),
      trades,
      equityCurve,
      barsProcessed,
      duration,
      warnings,
    };
  }

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

  let maxConsWins = 0,
    maxConsLosses = 0,
    consWins = 0,
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

  const avgReturn = netProfit / totalTrades;
  const stdDev = Math.sqrt(
    trades.reduce((s, t) => s + (t.profit - avgReturn) ** 2, 0) / totalTrades
  );
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  const sortinoRatio = computeSortinoRatio(trades, avgReturn);
  const maxDD = equity.getMaxDrawdown();
  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : 0;
  const calmarRatio = computeCalmarRatio(netProfit, maxDD, barsProcessed);
  const ulcerIndex = computeUlcerIndex(equityCurve);
  const expectedPayoff = netProfit / totalTrades;

  let totalDurBars = 0;
  for (const t of trades) totalDurBars += t.closeBarIndex - t.openBarIndex;
  const averageTradeDuration = totalDurBars / totalTrades;

  const longs = trades.filter((t) => t.direction === "BUY");
  const shorts = trades.filter((t) => t.direction === "SELL");
  const longWinRate =
    longs.length > 0 ? (longs.filter((t) => t.profit > 0).length / longs.length) * 100 : 0;
  const shortWinRate =
    shorts.length > 0 ? (shorts.filter((t) => t.profit > 0).length / shorts.length) * 100 : 0;

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
    sortinoRatio,
    calmarRatio,
    ulcerIndex,
    recoveryFactor,
    expectedPayoff,
    averageTradeDuration,
    longTrades: longs.length,
    shortTrades: shorts.length,
    longWinRate,
    shortWinRate,
    monthlyPnL: computeMonthlyPnL(trades),
    underwaterCurve: computeUnderwaterCurve(equityCurve),
    initialDeposit: config.initialBalance,
    finalBalance: equity.getBalance(),
    trades,
    equityCurve,
    barsProcessed,
    duration,
    warnings,
  };
}
