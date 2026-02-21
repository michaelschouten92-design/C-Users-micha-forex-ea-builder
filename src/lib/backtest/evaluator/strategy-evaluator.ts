/**
 * Strategy evaluator - walks the BuildJsonSchema node graph and produces
 * buy/sell signals for each bar by evaluating indicator conditions.
 *
 * This mirrors the MQL5 generator's expandEntryStrategy() + condition evaluation
 * but runs in JavaScript for client-side backtesting.
 */

import type {
  BuildJsonSchema,
  BuilderNode,
  BuilderEdge,
  ConditionNodeData,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  TrailingStopNodeData,
  BreakevenStopNodeData,
  PartialCloseNodeData,
  TimeExitNodeData,
  CloseConditionNodeData,
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ADXNodeData,
  StochasticNodeData,
  CandlestickPatternNodeData,
  CandlestickPattern,
} from "@/types/builder";
import type { OHLCVBar } from "../types";
import type { IndicatorBuffers, IndicatorConfig } from "../indicators";
import { computeIndicator, getIndicatorWarmup } from "../indicators";
import {
  evaluateCondition,
  evaluateCrossover,
  evaluateRSISignal,
  evaluateMACDSignal,
} from "./condition-evaluator";

// ============================================
// TYPES
// ============================================

export interface EntrySignal {
  buy: boolean;
  sell: boolean;
}

export interface ExitSignal {
  closeBuy: boolean;
  closeSell: boolean;
}

export interface TradeConfig {
  sizing: PlaceBuyNodeData | PlaceSellNodeData | null;
  stopLoss: StopLossNodeData | null;
  takeProfit: TakeProfitNodeData | null;
  trailingStop: TrailingStopNodeData | null;
  breakevenStop: BreakevenStopNodeData | null;
  partialClose: PartialCloseNodeData | null;
  timeExit: TimeExitNodeData | null;
}

export interface CandlestickPatternConfig {
  patterns: CandlestickPattern[];
  minBodySize: number;
}

export interface ParsedStrategy {
  indicators: IndicatorConfig[];
  indicatorBuffers: Map<string, IndicatorBuffers>;
  candlestickPatterns: CandlestickPatternConfig[];
  buyTradeConfig: TradeConfig;
  sellTradeConfig: TradeConfig;
  conditionMode: "AND" | "OR";
  warmupBars: number;
  warnings: string[];
}

// ============================================
// STRATEGY PARSER
// ============================================

/**
 * Parse the BuildJsonSchema into a structure ready for bar-by-bar evaluation.
 * Pre-computes all indicator buffers over the full dataset.
 */
export function parseStrategy(buildJson: BuildJsonSchema, bars: OHLCVBar[]): ParsedStrategy {
  const warnings: string[] = [];
  const nodes = buildJson.nodes;
  const edges = buildJson.edges;
  const conditionMode = buildJson.settings?.conditionMode ?? "AND";

  // Collect indicator nodes
  const indicatorTypes = new Set([
    "moving-average",
    "rsi",
    "macd",
    "bollinger-bands",
    "atr",
    "adx",
    "stochastic",
    "cci",
    "ichimoku",
    "obv",
    "bb-squeeze",
    "vwap",
  ]);

  const indicators: IndicatorConfig[] = [];
  const indicatorBuffers = new Map<string, IndicatorBuffers>();
  const candlestickPatterns: CandlestickPatternConfig[] = [];

  for (const node of nodes) {
    if (indicatorTypes.has(node.type)) {
      const config: IndicatorConfig = {
        id: node.id,
        type: node.type,
        params: node.data as Record<string, unknown>,
      };
      indicators.push(config);

      // Pre-compute all buffers
      const buffers = computeIndicator(bars, config);
      indicatorBuffers.set(node.id, buffers);
    }

    // Collect candlestick pattern nodes
    if (node.type === "candlestick-pattern") {
      const data = node.data as CandlestickPatternNodeData;
      candlestickPatterns.push({
        patterns: data.patterns ?? [],
        minBodySize: data.minBodySize ?? 5,
      });
    }

    // Warn about unsupported node types
    if (
      [
        "custom-indicator",
        "order-block",
        "fair-value-gap",
        "market-structure",
        "news-filter",
      ].includes(node.type)
    ) {
      warnings.push(
        `"${node.data?.label || node.type}" is not supported in backtesting and will be ignored`
      );
    }
  }

  // Calculate warmup period: sum of all indicator periods + 10-bar safety buffer.
  // This ensures chained indicators (e.g., RSI(14) feeding into MA(20)) have enough
  // data. Using sum is more conservative than max for multi-indicator strategies.
  let warmupBarsSum = 0;
  let warmupBarsMax = 0;
  for (const ind of indicators) {
    const w = getIndicatorWarmup(ind);
    warmupBarsSum += w;
    warmupBarsMax = Math.max(warmupBarsMax, w);
  }
  // Use sum if multiple indicators (they may be chained), otherwise use max
  // Add 10 bars safety buffer on top to avoid edge effects
  const WARMUP_SAFETY_BUFFER = 10;
  let warmupBars =
    indicators.length > 1
      ? warmupBarsSum + WARMUP_SAFETY_BUFFER
      : warmupBarsMax + WARMUP_SAFETY_BUFFER;
  warmupBars = Math.max(warmupBars, 5); // Absolute minimum 5 bars

  // Parse trading nodes
  const buyNodes = findNodesByType<PlaceBuyNodeData>(nodes, "place-buy");
  const sellNodes = findNodesByType<PlaceSellNodeData>(nodes, "place-sell");
  const slNodes = findNodesByType<StopLossNodeData>(nodes, "stop-loss");
  const tpNodes = findNodesByType<TakeProfitNodeData>(nodes, "take-profit");
  const trailingNodes = findNodesByType<TrailingStopNodeData>(nodes, "trailing-stop");
  const beNodes = findNodesByType<BreakevenStopNodeData>(nodes, "breakeven-stop");
  const pcNodes = findNodesByType<PartialCloseNodeData>(nodes, "partial-close");
  const timeExitNodes = findNodesByType<TimeExitNodeData>(nodes, "time-exit");

  // Find connected SL/TP for buy and sell nodes
  const buyTradeConfig = buildTradeConfig(
    (buyNodes[0]?.data as PlaceBuyNodeData) ?? null,
    slNodes,
    tpNodes,
    trailingNodes,
    beNodes,
    pcNodes,
    timeExitNodes,
    buyNodes[0]?.id,
    edges
  );
  const sellTradeConfig = buildTradeConfig(
    (sellNodes[0]?.data as PlaceSellNodeData) ?? null,
    slNodes,
    tpNodes,
    trailingNodes,
    beNodes,
    pcNodes,
    timeExitNodes,
    sellNodes[0]?.id,
    edges
  );

  return {
    indicators,
    indicatorBuffers,
    candlestickPatterns,
    buyTradeConfig,
    sellTradeConfig,
    conditionMode,
    warmupBars,
    warnings,
  };
}

// ============================================
// SIGNAL EVALUATION
// ============================================

/**
 * Evaluate entry signals for a specific bar index.
 * Walks all indicator nodes and their conditions, combines with AND/OR mode.
 */
export function evaluateEntrySignals(
  barIndex: number,
  bars: OHLCVBar[],
  strategy: ParsedStrategy
): EntrySignal {
  if (barIndex < strategy.warmupBars || barIndex < 2) {
    return { buy: false, sell: false };
  }

  const buildJson = null as unknown; // We don't need the full buildJson at eval time
  void buildJson;

  const buyConditions: boolean[] = [];
  const sellConditions: boolean[] = [];

  // Evaluate each indicator's contribution to buy/sell signals
  for (const config of strategy.indicators) {
    const buffers = strategy.indicatorBuffers.get(config.id);
    if (!buffers) continue;

    const params = config.params as Record<string, unknown>;
    // Determine bar offset based on signalMode
    const offset = params.signalMode === "candle_close" ? 1 : 0;
    const currBar = barIndex - offset;
    const prevBar = currBar - 1;

    if (currBar < 0 || prevBar < 0) continue;

    const signal = evaluateIndicatorSignal(config, buffers, currBar, prevBar, bars, strategy);
    if (signal) {
      buyConditions.push(signal.buy);
      sellConditions.push(signal.sell);
    }
  }

  // Evaluate candlestick pattern nodes
  const point = Math.pow(10, -5); // Default 5-digit broker; adjusted patterns use pips
  for (const patternConfig of strategy.candlestickPatterns) {
    if (patternConfig.patterns.length > 0) {
      const signal = evaluateCandlestickPattern(
        bars,
        barIndex,
        patternConfig.patterns,
        patternConfig.minBodySize,
        point
      );
      buyConditions.push(signal.buy);
      sellConditions.push(signal.sell);
    }
  }

  if (buyConditions.length === 0 && sellConditions.length === 0) {
    return { buy: false, sell: false };
  }

  // Combine conditions based on mode
  const combine = (conditions: boolean[]): boolean => {
    if (conditions.length === 0) return false;
    return strategy.conditionMode === "AND" ? conditions.every(Boolean) : conditions.some(Boolean);
  };

  return {
    buy: combine(buyConditions),
    sell: combine(sellConditions),
  };
}

/**
 * Evaluate a single indicator's buy/sell signal contribution.
 */
function evaluateIndicatorSignal(
  config: IndicatorConfig,
  buffers: IndicatorBuffers,
  currBar: number,
  prevBar: number,
  bars: OHLCVBar[],
  _strategy: ParsedStrategy
): EntrySignal | null {
  const p = config.params as Record<string, unknown>;

  switch (config.type) {
    case "moving-average": {
      const maCurr = buffers.value?.[currBar];
      const maPrev = buffers.value?.[prevBar];
      if (maCurr === undefined || maPrev === undefined || isNaN(maCurr) || isNaN(maPrev))
        return null;

      const priceCurr = bars[currBar].close;
      const pricePrev = bars[prevBar].close;

      // HTF trend filter: provide directional bias, not crossover signals
      if (p._filterRole === "htf-trend") {
        return { buy: priceCurr > maCurr, sell: priceCurr < maCurr };
      }

      // Default: price crosses above MA = buy, price crosses below = sell
      const cross = evaluateCrossover(priceCurr, pricePrev, maCurr, maPrev);
      return { buy: cross.crossAbove, sell: cross.crossBelow };
    }

    case "rsi": {
      const curr = buffers.value?.[currBar];
      const prev = buffers.value?.[prevBar];
      if (curr === undefined || prev === undefined || isNaN(curr) || isNaN(prev)) return null;

      const overbought = (p.overboughtLevel as number) ?? 70;
      const oversold = (p.oversoldLevel as number) ?? 30;
      const rsiSig = evaluateRSISignal(curr, prev, overbought, oversold);
      return { buy: rsiSig.buySignal, sell: rsiSig.sellSignal };
    }

    case "macd": {
      const mainCurr = buffers.main?.[currBar];
      const mainPrev = buffers.main?.[prevBar];
      const sigCurr = buffers.signal?.[currBar];
      const sigPrev = buffers.signal?.[prevBar];
      if ([mainCurr, mainPrev, sigCurr, sigPrev].some((v) => v === undefined || isNaN(v!)))
        return null;

      const macdSig = evaluateMACDSignal(mainCurr!, mainPrev!, sigCurr!, sigPrev!, "SIGNAL_CROSS");
      return { buy: macdSig.buySignal, sell: macdSig.sellSignal };
    }

    case "bollinger-bands": {
      const upperCurr = buffers.upper?.[currBar];
      const lowerCurr = buffers.lower?.[currBar];
      if (
        upperCurr === undefined ||
        lowerCurr === undefined ||
        isNaN(upperCurr) ||
        isNaN(lowerCurr)
      )
        return null;

      const priceCurr = bars[currBar].close;

      // BAND_TOUCH: price touches lower band = buy, upper band = sell
      return {
        buy: priceCurr <= lowerCurr,
        sell: priceCurr >= upperCurr,
      };
    }

    case "adx": {
      const adxCurr = buffers.main?.[currBar];
      const plusDICurr = buffers.plusDI?.[currBar];
      const minusDICurr = buffers.minusDI?.[currBar];
      const plusDIPrev = buffers.plusDI?.[prevBar];
      const minusDIPrev = buffers.minusDI?.[prevBar];
      if ([adxCurr, plusDICurr, minusDICurr].some((v) => v === undefined || isNaN(v!))) return null;

      const trendLevel = (p.trendLevel as number) ?? 25;

      // DI_CROSS mode: DI crossover when ADX confirms trend
      const isTrending = adxCurr! > trendLevel;
      if (!isTrending) return { buy: false, sell: false };

      if (
        plusDIPrev !== undefined &&
        minusDIPrev !== undefined &&
        !isNaN(plusDIPrev) &&
        !isNaN(minusDIPrev)
      ) {
        const cross = evaluateCrossover(plusDICurr!, plusDIPrev, minusDICurr!, minusDIPrev);
        return { buy: cross.crossAbove, sell: cross.crossBelow };
      }
      return { buy: plusDICurr! > minusDICurr!, sell: minusDICurr! > plusDICurr! };
    }

    case "stochastic": {
      const mainCurr = buffers.main?.[currBar];
      const mainPrev = buffers.main?.[prevBar];
      if (mainCurr === undefined || mainPrev === undefined || isNaN(mainCurr) || isNaN(mainPrev))
        return null;

      const overbought = (p.overboughtLevel as number) ?? 80;
      const oversold = (p.oversoldLevel as number) ?? 20;
      const stochSig = evaluateRSISignal(mainCurr, mainPrev, overbought, oversold);
      return { buy: stochSig.buySignal, sell: stochSig.sellSignal };
    }

    case "cci": {
      const curr = buffers.value?.[currBar];
      const prev = buffers.value?.[prevBar];
      if (curr === undefined || prev === undefined || isNaN(curr) || isNaN(prev)) return null;

      const overbought = (p.overboughtLevel as number) ?? 100;
      const oversold = (p.oversoldLevel as number) ?? -100;
      const cciSig = evaluateRSISignal(curr, prev, overbought, oversold);
      return { buy: cciSig.buySignal, sell: cciSig.sellSignal };
    }

    case "ichimoku": {
      const tenkanCurr = buffers.tenkan?.[currBar];
      const tenkanPrev = buffers.tenkan?.[prevBar];
      const kijunCurr = buffers.kijun?.[currBar];
      const kijunPrev = buffers.kijun?.[prevBar];
      if ([tenkanCurr, tenkanPrev, kijunCurr, kijunPrev].some((v) => v === undefined || isNaN(v!)))
        return null;

      const cross = evaluateCrossover(tenkanCurr!, tenkanPrev!, kijunCurr!, kijunPrev!);
      return { buy: cross.crossAbove, sell: cross.crossBelow };
    }

    case "obv": {
      const obvCurr = buffers.value?.[currBar];
      const obvPrev = buffers.value?.[prevBar];
      const sigCurr = buffers.signal?.[currBar];
      const sigPrev = buffers.signal?.[prevBar];
      if ([obvCurr, obvPrev, sigCurr, sigPrev].some((v) => v === undefined || isNaN(v!)))
        return null;

      const cross = evaluateCrossover(obvCurr!, obvPrev!, sigCurr!, sigPrev!);
      return { buy: cross.crossAbove, sell: cross.crossBelow };
    }

    case "bb-squeeze": {
      const squeezeCurr = buffers.squeeze?.[currBar];
      const squeezePrev = buffers.squeeze?.[prevBar];
      const middleCurr = buffers.middle?.[currBar];
      if (squeezeCurr === undefined || squeezePrev === undefined || middleCurr === undefined)
        return null;
      if (isNaN(squeezeCurr) || isNaN(squeezePrev) || isNaN(middleCurr)) return null;

      // Breakout from squeeze
      const breakout = squeezePrev === 1 && squeezeCurr === 0;
      if (!breakout) return { buy: false, sell: false };

      const priceCurr = bars[currBar].close;
      return {
        buy: priceCurr > middleCurr,
        sell: priceCurr < middleCurr,
      };
    }

    case "vwap": {
      const vwapCurr = buffers.value?.[currBar];
      if (vwapCurr === undefined || isNaN(vwapCurr)) return null;

      const priceCurr = bars[currBar].close;
      return {
        buy: priceCurr > vwapCurr,
        sell: priceCurr < vwapCurr,
      };
    }

    default:
      return null;
  }
}

/**
 * Evaluate candlestick patterns at a given bar index.
 */
export function evaluateCandlestickPattern(
  bars: OHLCVBar[],
  barIndex: number,
  patterns: CandlestickPattern[],
  minBodyPips: number,
  point: number
): EntrySignal {
  if (barIndex < 3) return { buy: false, sell: false };

  const minBody = minBodyPips * point;
  let buy = false;
  let sell = false;

  const curr = bars[barIndex];
  const prev = bars[barIndex - 1];
  const prev2 = bars[barIndex - 2];

  const currBody = Math.abs(curr.close - curr.open);
  const prevBody = Math.abs(prev.close - prev.open);
  const currBullish = curr.close > curr.open;
  const currBearish = curr.close < curr.open;
  const prevBullish = prev.close > prev.open;
  const prevBearish = prev.close < prev.open;

  for (const pattern of patterns) {
    switch (pattern) {
      case "ENGULFING_BULLISH":
        if (
          prevBearish &&
          currBullish &&
          currBody > minBody &&
          curr.close > prev.open &&
          curr.open < prev.close
        ) {
          buy = true;
        }
        break;
      case "ENGULFING_BEARISH":
        if (
          prevBullish &&
          currBearish &&
          currBody > minBody &&
          curr.close < prev.open &&
          curr.open > prev.close
        ) {
          sell = true;
        }
        break;
      case "HAMMER":
        if (currBullish && currBody > minBody) {
          const lowerWick = curr.open - curr.low;
          const upperWick = curr.high - curr.close;
          if (lowerWick >= currBody * 2 && upperWick < currBody * 0.5) {
            buy = true;
          }
        }
        break;
      case "SHOOTING_STAR":
        if (currBearish && currBody > minBody) {
          const upperWick = curr.high - curr.open;
          const lowerWick = curr.close - curr.low;
          if (upperWick >= currBody * 2 && lowerWick < currBody * 0.5) {
            sell = true;
          }
        }
        break;
      case "DOJI": {
        const range = curr.high - curr.low;
        if (range > 0 && currBody / range < 0.1) {
          // Doji in downtrend = buy, in uptrend = sell
          if (prev.close < prev.open) buy = true;
          if (prev.close > prev.open) sell = true;
        }
        break;
      }
      case "MORNING_STAR": {
        const prev2Body = Math.abs(prev2.close - prev2.open);
        if (
          prev2.close < prev2.open &&
          prev2Body > minBody && // Large bearish
          prevBody < prev2Body * 0.3 && // Small body (star)
          currBullish &&
          currBody > minBody && // Large bullish
          curr.close > (prev2.open + prev2.close) / 2
        ) {
          // Closes above midpoint
          buy = true;
        }
        break;
      }
      case "EVENING_STAR": {
        const prev2Bd = Math.abs(prev2.close - prev2.open);
        if (
          prev2.close > prev2.open &&
          prev2Bd > minBody &&
          prevBody < prev2Bd * 0.3 &&
          currBearish &&
          currBody > minBody &&
          curr.close < (prev2.open + prev2.close) / 2
        ) {
          sell = true;
        }
        break;
      }
      case "THREE_WHITE_SOLDIERS":
        if (
          prev2.close > prev2.open &&
          prev.close > prev.open &&
          currBullish &&
          prev.close > prev2.close &&
          curr.close > prev.close &&
          currBody > minBody &&
          prevBody > minBody
        ) {
          buy = true;
        }
        break;
      case "THREE_BLACK_CROWS":
        if (
          prev2.close < prev2.open &&
          prev.close < prev.open &&
          currBearish &&
          prev.close < prev2.close &&
          curr.close < prev.close &&
          currBody > minBody &&
          prevBody > minBody
        ) {
          sell = true;
        }
        break;
      case "HARAMI_BULLISH":
        // Bullish harami: large bearish candle followed by smaller bullish candle contained within
        if (
          prevBearish &&
          currBullish &&
          prevBody > minBody &&
          currBody < prevBody &&
          curr.close < prev.open &&
          curr.open > prev.close
        ) {
          buy = true;
        }
        break;
      case "HARAMI_BEARISH":
        // Bearish harami: large bullish candle followed by smaller bearish candle contained within
        if (
          prevBullish &&
          currBearish &&
          prevBody > minBody &&
          currBody < prevBody &&
          curr.open < prev.close &&
          curr.close > prev.open
        ) {
          sell = true;
        }
        break;
    }
  }

  return { buy, sell };
}

/**
 * Evaluate exit signals (close conditions) for a bar.
 */
export function evaluateExitSignals(
  barIndex: number,
  bars: OHLCVBar[],
  strategy: ParsedStrategy
): ExitSignal {
  // Close on opposite signal
  const entry = evaluateEntrySignals(barIndex, bars, strategy);
  return {
    closeBuy: entry.sell,
    closeSell: entry.buy,
  };
}

// ============================================
// HELPERS
// ============================================

function findNodesByType<T>(nodes: BuilderNode[], type: string): BuilderNode[] {
  return nodes.filter((n) => n.type === type);
}

function findNodesByTypeFromConfigs(
  indicators: IndicatorConfig[],
  type: string
): IndicatorConfig[] {
  return indicators.filter((i) => i.type === type);
}

function buildTradeConfig(
  sizing: PlaceBuyNodeData | PlaceSellNodeData | null,
  slNodes: BuilderNode[],
  tpNodes: BuilderNode[],
  trailingNodes: BuilderNode[],
  beNodes: BuilderNode[],
  pcNodes: BuilderNode[],
  timeExitNodes: BuilderNode[],
  _tradingNodeId: string | undefined,
  _edges: BuilderEdge[]
): TradeConfig {
  // For simplicity, use the first found node of each type.
  // A more sophisticated version would trace edges from the trading node.
  return {
    sizing,
    stopLoss: (slNodes[0]?.data as StopLossNodeData) ?? null,
    takeProfit: (tpNodes[0]?.data as TakeProfitNodeData) ?? null,
    trailingStop: (trailingNodes[0]?.data as TrailingStopNodeData) ?? null,
    breakevenStop: (beNodes[0]?.data as BreakevenStopNodeData) ?? null,
    partialClose: (pcNodes[0]?.data as PartialCloseNodeData) ?? null,
    timeExit: (timeExitNodes[0]?.data as TimeExitNodeData) ?? null,
  };
}

// Also handle condition nodes that are connected to indicators
export function evaluateConditionNodes(
  barIndex: number,
  nodes: BuilderNode[],
  edges: BuilderEdge[],
  indicatorBuffers: Map<string, IndicatorBuffers>,
  conditionMode: "AND" | "OR"
): EntrySignal {
  const conditionNodes = nodes.filter((n) => n.type === "condition");
  if (conditionNodes.length === 0) return { buy: false, sell: false };

  const buyResults: boolean[] = [];
  const sellResults: boolean[] = [];

  for (const condNode of conditionNodes) {
    const data = condNode.data as ConditionNodeData;
    // Find connected indicator via edge
    const sourceEdge = edges.find((e) => e.target === condNode.id);
    if (!sourceEdge) continue;

    const buffers = indicatorBuffers.get(sourceEdge.source);
    if (!buffers) continue;

    // Get the main/value buffer
    const buffer = buffers.value ?? buffers.main ?? Object.values(buffers)[0];
    if (!buffer) continue;

    const curr = buffer[barIndex];
    const prev = barIndex > 0 ? buffer[barIndex - 1] : NaN;
    const result = evaluateCondition(data.conditionType, curr, data.threshold, prev);

    // For conditions: the raw result determines buy, inverted determines sell
    buyResults.push(result);
    // For sell, invert comparison-based operators
    if (data.conditionType === "CROSSES_ABOVE") {
      sellResults.push(evaluateCondition("CROSSES_BELOW", curr, data.threshold, prev));
    } else if (data.conditionType === "CROSSES_BELOW") {
      sellResults.push(evaluateCondition("CROSSES_ABOVE", curr, data.threshold, prev));
    } else if (data.conditionType === "GREATER_THAN") {
      sellResults.push(evaluateCondition("LESS_THAN", curr, data.threshold, prev));
    } else if (data.conditionType === "LESS_THAN") {
      sellResults.push(evaluateCondition("GREATER_THAN", curr, data.threshold, prev));
    } else {
      sellResults.push(result);
    }
  }

  const combine = (conditions: boolean[]) => {
    if (conditions.length === 0) return false;
    return conditionMode === "AND" ? conditions.every(Boolean) : conditions.some(Boolean);
  };

  return { buy: combine(buyResults), sell: combine(sellResults) };
}
