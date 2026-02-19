// Main MQL5 Code Generator — orchestrates modular generators

import type {
  BuildJsonSchema,
  BuilderNode,
  BuilderNodeType,
  BuilderEdge,
  BuilderNodeData,
  EMACrossoverEntryData,
  RangeBreakoutEntryData,
  RSIReversalEntryData,
  TrendPullbackEntryData,
  MACDCrossoverEntryData,
  DivergenceEntryData,
  EntryStrategyNodeData,
  VolatilityFilterNodeData,
  FridayCloseFilterNodeData,
  NewsFilterNodeData,
  VolumeFilterNodeData,
} from "@/types/builder";

import { type GeneratorContext, type GeneratedCode, getTimeframe } from "./types";

import {
  generateFileHeader,
  generateTradeIncludes,
  generateInputsSection,
  generateGlobalVariablesSection,
  generateOnInit,
  generateOnDeinit,
  generateOnTick,
  generateHelperFunctions,
} from "./templates";

import { sanitizeName, sanitizeMQL5String, isFieldOptimizable } from "./generators/shared";
import { generateEmbeddedNewsData } from "../news-calendar";
import { generateMultipleTimingCode } from "./generators/timing";
import { generateIndicatorCode } from "./generators/indicators";
import { generatePriceActionCode } from "./generators/price-action";
import {
  generatePlaceBuyCode,
  generatePlaceSellCode,
  generateStopLossCode,
  generateTakeProfitCode,
  generateEntryLogic,
  generateTimeExitCode,
  generateGridPyramidCode,
} from "./generators/trading";
import { generateTradeManagementCode } from "./generators/trade-management";
import { generateCloseConditionCode } from "./generators/close-conditions";
import { generateTelemetryCode, type TelemetryConfig } from "./generators/telemetry";

// Helper function to get all connected node IDs starting from source nodes
function getConnectedNodeIds(
  nodes: BuilderNode[],
  edges: BuilderEdge[],
  startNodeTypes: string[]
): Set<string> {
  const connectedIds = new Set<string>();

  // Build adjacency map once instead of filtering edges per node
  const adjacencyMap = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = adjacencyMap.get(edge.source);
    if (targets) {
      targets.push(edge.target);
    } else {
      adjacencyMap.set(edge.source, [edge.target]);
    }
  }

  // Find all starting nodes (timing nodes only — filter nodes like max-spread are global)
  const startNodes = nodes.filter(
    (n) => startNodeTypes.includes(n.type as string) || "timingType" in n.data
  );

  // BFS to find all connected nodes
  const queue: string[] = startNodes.map((n) => n.id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (connectedIds.has(currentId)) continue;
    connectedIds.add(currentId);

    // Use adjacency map for O(1) lookup
    const targets = adjacencyMap.get(currentId);
    if (targets) {
      for (const target of targets) {
        if (!connectedIds.has(target)) {
          queue.push(target);
        }
      }
    }
  }

  return connectedIds;
}

// Decompose entry strategy composite nodes into virtual primitive nodes.
// All entry strategies use: Risk %, ATR-based SL, R-multiple TP.
// Direction is always BOTH — the entry logic determines long/short internally.
function expandEntryStrategy(node: BuilderNode): { nodes: BuilderNode[]; edges: BuilderEdge[] } {
  const d = node.data as EntryStrategyNodeData;
  const baseId = node.id;
  const virtualNodes: BuilderNode[] = [];
  const virtualEdges: BuilderEdge[] = [];

  // Helper to create a virtual node
  const vNode = (
    suffix: string,
    type: BuilderNodeType,
    data: Record<string, unknown>
  ): BuilderNode => ({
    id: `${baseId}__${suffix}`,
    type,
    position: node.position,
    data: data as BuilderNodeData,
  });

  // Map parent entry strategy optimizableFields to virtual node fields.
  // When the parent has no optimizableFields (undefined), returns undefined → all optimizable.
  // When the parent has an explicit array, maps parent field names to virtual field names.
  const parentOpt = d.optimizableFields;
  const mapOpt = (...mappings: [string, string][]): string[] | undefined => {
    if (!parentOpt || !Array.isArray(parentOpt)) return undefined;
    const result: string[] = [];
    for (const [parentField, virtualField] of mappings) {
      if (parentOpt.includes(parentField) && !result.includes(virtualField)) {
        result.push(virtualField);
      }
    }
    return result;
  };

  // Create indicator/priceaction nodes based on entry type
  if (d.entryType === "ema-crossover") {
    const ema = d as EMACrossoverEntryData;
    const emaTf = ema.timeframe ?? "H1";
    const emaAppliedPrice = ema.appliedPrice ?? "CLOSE";
    virtualNodes.push(
      vNode("ma-fast", "moving-average", {
        label: `Fast EMA(${ema.fastEma})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: emaTf,
        period: ema.fastEma,
        method: "EMA",
        appliedPrice: emaAppliedPrice,
        signalMode: "candle_close",
        shift: 0,
        optimizableFields: mapOpt(
          ["fastEma", "period"],
          ["minEmaSeparation", "_minEmaSeparation"],
          ["timeframe", "timeframe"]
        ),
        _entryStrategyType: "ema-crossover",
        _entryStrategyId: baseId,
        _role: "fast",
        _minEmaSeparation: ema.minEmaSeparation ?? 0,
      }),
      vNode("ma-slow", "moving-average", {
        label: `Slow EMA(${ema.slowEma})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: emaTf,
        period: ema.slowEma,
        method: "EMA",
        appliedPrice: emaAppliedPrice,
        signalMode: "candle_close",
        shift: 0,
        optimizableFields: mapOpt(["slowEma", "period"], ["timeframe", "timeframe"]),
        _entryStrategyType: "ema-crossover",
        _entryStrategyId: baseId,
        _role: "slow",
      })
    );
    // Legacy HTF trend filter (fallback for pre-migration data)
    if (ema.htfTrendFilter && !d.mtfConfirmation?.enabled) {
      virtualNodes.push(
        vNode("htf-ema", "moving-average", {
          label: `HTF EMA(${ema.htfEma})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: ema.htfTimeframe ?? "H4",
          period: ema.htfEma,
          method: "EMA",
          appliedPrice: emaAppliedPrice,
          signalMode: "candle_close",
          shift: 0,
          optimizableFields: mapOpt(["htfEma", "period"], ["htfTimeframe", "timeframe"]),
          _filterRole: "htf-trend",
        })
      );
    }
    // RSI confirmation filter
    if (ema.rsiConfirmation) {
      virtualNodes.push(
        vNode("rsi-confirm", "rsi", {
          label: `RSI Filter(${ema.rsiPeriod})`,
          category: "indicator",
          indicatorType: "rsi",
          timeframe: emaTf,
          period: ema.rsiPeriod,
          appliedPrice: emaAppliedPrice,
          overboughtLevel: ema.rsiLongMax,
          oversoldLevel: ema.rsiShortMin,
          signalMode: "candle_close",
          optimizableFields: mapOpt(
            ["rsiPeriod", "period"],
            ["rsiLongMax", "overboughtLevel"],
            ["rsiShortMin", "oversoldLevel"],
            ["timeframe", "timeframe"]
          ),
          _filterRole: "rsi-confirm",
        })
      );
    }
  } else if (d.entryType === "range-breakout") {
    const rb = d as RangeBreakoutEntryData;
    const rangeMethod = rb.rangeMethod ?? "CANDLES";
    const rangeTimeframe = rb.rangeTimeframe ?? "H1";
    virtualNodes.push(
      vNode("rb", "range-breakout", {
        label: "Range Breakout",
        category: "priceaction",
        priceActionType: "range-breakout",
        timeframe: rangeTimeframe,
        rangeType: rangeMethod === "CUSTOM_TIME" ? "TIME_WINDOW" : "PREVIOUS_CANDLES",
        lookbackCandles: rb.rangePeriod,
        rangeSession: "CUSTOM",
        sessionStartHour: rb.customStartHour ?? 0,
        sessionStartMinute: rb.customStartMinute ?? 0,
        sessionEndHour: rb.customEndHour ?? 8,
        sessionEndMinute: rb.customEndMinute ?? 0,
        breakoutDirection: "BOTH",
        entryMode:
          (rb.breakoutEntry ?? "CANDLE_CLOSE") === "CURRENT_PRICE" ? "IMMEDIATE" : "ON_CLOSE",
        breakoutTimeframe: rb.breakoutTimeframe ?? rangeTimeframe,
        bufferPips: rb.bufferPips ?? 2,
        minRangePips: rb.minRangePips ?? 0,
        maxRangePips: rb.maxRangePips ?? 0,
        useServerTime: rb.useServerTime ?? true,
        _cancelOpposite: rb.cancelOpposite ?? true,
        _closeAtTime: rb.closeAtTime ?? false,
        _closeAtHour: rb.closeAtHour ?? 17,
        _closeAtMinute: rb.closeAtMinute ?? 0,
        _useServerTime: rb.useServerTime ?? true,
        _volumeConfirmation: rb.volumeConfirmation ?? false,
        _volumeConfirmationPeriod: rb.volumeConfirmationPeriod ?? 20,
        optimizableFields: mapOpt(
          ["rangePeriod", "lookbackCandles"],
          ["bufferPips", "bufferPips"],
          ["minRangePips", "minRangePips"],
          ["maxRangePips", "maxRangePips"],
          ["rangeTimeframe", "timeframe"],
          ["breakoutTimeframe", "breakoutTimeframe"],
          ["customStartHour", "sessionStartHour"],
          ["customStartHour", "sessionStartMinute"],
          ["customEndHour", "sessionEndHour"],
          ["customEndHour", "sessionEndMinute"]
        ),
      })
    );
    // Legacy HTF trend filter (fallback for pre-migration data)
    if (rb.htfTrendFilter && !d.mtfConfirmation?.enabled) {
      const htfEma = rb.htfEma ?? 200;
      const htfTimeframe = rb.htfTimeframe ?? "H4";
      virtualNodes.push(
        vNode("htf-ema", "moving-average", {
          label: `HTF EMA(${htfEma})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: htfTimeframe,
          period: htfEma,
          method: "EMA",
          signalMode: "candle_close",
          shift: 0,
          optimizableFields: mapOpt(["htfEma", "period"], ["htfTimeframe", "timeframe"]),
          _filterRole: "htf-trend",
        })
      );
    }
  } else if (d.entryType === "rsi-reversal") {
    const rsi = d as RSIReversalEntryData;
    const rsiAppliedPrice = rsi.appliedPrice ?? "CLOSE";
    virtualNodes.push(
      vNode("rsi", "rsi", {
        label: `RSI(${rsi.rsiPeriod})`,
        category: "indicator",
        indicatorType: "rsi",
        timeframe: rsi.timeframe ?? "H1",
        period: rsi.rsiPeriod,
        appliedPrice: rsiAppliedPrice,
        overboughtLevel: rsi.overboughtLevel,
        oversoldLevel: rsi.oversoldLevel,
        signalMode: "candle_close",
        optimizableFields: mapOpt(
          ["rsiPeriod", "period"],
          ["overboughtLevel", "overboughtLevel"],
          ["oversoldLevel", "oversoldLevel"],
          ["timeframe", "timeframe"]
        ),
      })
    );
    // Legacy trend filter (fallback for pre-migration data)
    if (rsi.trendFilter && !d.mtfConfirmation?.enabled) {
      virtualNodes.push(
        vNode("trend-ema", "moving-average", {
          label: `Trend EMA(${rsi.trendEma})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: rsi.timeframe ?? "H1",
          period: rsi.trendEma,
          method: "EMA",
          appliedPrice: rsiAppliedPrice,
          signalMode: "candle_close",
          shift: 0,
          optimizableFields: mapOpt(["trendEma", "period"], ["timeframe", "timeframe"]),
          _filterRole: "htf-trend",
        })
      );
    }
  } else if (d.entryType === "trend-pullback") {
    const tp = d as TrendPullbackEntryData;
    const tpTf = tp.timeframe ?? "H1";
    const tpAppliedPrice = tp.appliedPrice ?? "CLOSE";
    // Trend EMA for direction + pullback proximity
    virtualNodes.push(
      vNode("ma-trend", "moving-average", {
        label: `Trend EMA(${tp.trendEma})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: tpTf,
        period: tp.trendEma,
        method: "EMA",
        appliedPrice: tpAppliedPrice,
        signalMode: "candle_close",
        shift: 0,
        optimizableFields: mapOpt(
          ["trendEma", "period"],
          ["pullbackMaxDistance", "_pullbackMaxDistance"],
          ["timeframe", "timeframe"]
        ),
        _requireEmaBuffer: tp.requireEmaBuffer ?? false,
        _pullbackMaxDistance: tp.pullbackMaxDistance ?? 2.0,
      }),
      // RSI for pullback detection
      vNode("rsi-pullback", "rsi", {
        label: `Pullback RSI(${tp.pullbackRsiPeriod})`,
        category: "indicator",
        indicatorType: "rsi",
        timeframe: tpTf,
        period: tp.pullbackRsiPeriod,
        appliedPrice: tpAppliedPrice,
        overboughtLevel: 100 - tp.rsiPullbackLevel,
        oversoldLevel: tp.rsiPullbackLevel,
        signalMode: "candle_close",
        optimizableFields: mapOpt(
          ["pullbackRsiPeriod", "period"],
          ["rsiPullbackLevel", "oversoldLevel"],
          ["rsiPullbackLevel", "overboughtLevel"],
          ["timeframe", "timeframe"]
        ),
      })
    );
    // Legacy ADX trend strength filter (fallback for pre-migration data)
    if (tp.useAdxFilter && !d.mtfConfirmation?.enabled) {
      virtualNodes.push(
        vNode("adx-filter", "adx", {
          label: `ADX(${tp.adxPeriod})`,
          category: "indicator",
          indicatorType: "adx",
          timeframe: tpTf,
          period: tp.adxPeriod,
          trendLevel: tp.adxThreshold,
          signalMode: "candle_close",
          optimizableFields: mapOpt(
            ["adxPeriod", "period"],
            ["adxThreshold", "trendLevel"],
            ["timeframe", "timeframe"]
          ),
          _filterRole: "adx-trend-strength",
        })
      );
    }
  } else if (d.entryType === "macd-crossover") {
    const macd = d as MACDCrossoverEntryData;
    const macdAppliedPrice = macd.appliedPrice ?? "CLOSE";
    virtualNodes.push(
      vNode("macd", "macd", {
        label: `MACD(${macd.macdFast},${macd.macdSlow},${macd.macdSignal})`,
        category: "indicator",
        indicatorType: "macd",
        timeframe: macd.timeframe ?? "H1",
        fastPeriod: macd.macdFast,
        slowPeriod: macd.macdSlow,
        signalPeriod: macd.macdSignal,
        appliedPrice: macdAppliedPrice,
        signalMode: "candle_close",
        _macdSignalType: macd.macdSignalType ?? "SIGNAL_CROSS",
        optimizableFields: mapOpt(
          ["macdFast", "fastPeriod"],
          ["macdSlow", "slowPeriod"],
          ["macdSignal", "signalPeriod"],
          ["timeframe", "timeframe"]
        ),
      })
    );
    // Legacy HTF trend filter (fallback for pre-migration data)
    if (macd.htfTrendFilter && !d.mtfConfirmation?.enabled) {
      virtualNodes.push(
        vNode("htf-ema", "moving-average", {
          label: `HTF EMA(${macd.htfEma})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: macd.htfTimeframe ?? "H4",
          period: macd.htfEma,
          method: "EMA",
          appliedPrice: macdAppliedPrice,
          signalMode: "candle_close",
          shift: 0,
          optimizableFields: mapOpt(["htfEma", "period"], ["htfTimeframe", "timeframe"]),
          _filterRole: "htf-trend",
        })
      );
    }
  } else if (d.entryType === "divergence") {
    const div = d as DivergenceEntryData;
    const divTf = div.timeframe ?? "H1";

    if ((div.indicator ?? "RSI") === "RSI") {
      const rsiAppliedPrice = div.appliedPrice ?? "CLOSE";
      virtualNodes.push(
        vNode("rsi", "rsi", {
          label: `RSI(${div.rsiPeriod})`,
          category: "indicator",
          indicatorType: "rsi",
          timeframe: divTf,
          period: div.rsiPeriod,
          appliedPrice: rsiAppliedPrice,
          overboughtLevel: 70,
          oversoldLevel: 30,
          signalMode: "candle_close",
          _divergenceMode: true,
          _divergenceLookback: div.lookbackBars ?? 20,
          _divergenceMinSwing: div.minSwingBars ?? 5,
          _copyBarsOverride: (div.lookbackBars ?? 20) + 2,
          optimizableFields: mapOpt(
            ["rsiPeriod", "period"],
            ["lookbackBars", "_divergenceLookback"],
            ["minSwingBars", "_divergenceMinSwing"],
            ["timeframe", "timeframe"]
          ),
        })
      );
    } else {
      // MACD
      virtualNodes.push(
        vNode("macd", "macd", {
          label: `MACD(${div.macdFast},${div.macdSlow},${div.macdSignal})`,
          category: "indicator",
          indicatorType: "macd",
          timeframe: divTf,
          fastPeriod: div.macdFast,
          slowPeriod: div.macdSlow,
          signalPeriod: div.macdSignal,
          appliedPrice: div.appliedPrice ?? "CLOSE",
          signalMode: "candle_close",
          _divergenceMode: true,
          _divergenceLookback: div.lookbackBars ?? 20,
          _divergenceMinSwing: div.minSwingBars ?? 5,
          _copyBarsOverride: (div.lookbackBars ?? 20) + 2,
          optimizableFields: mapOpt(
            ["macdFast", "fastPeriod"],
            ["macdSlow", "slowPeriod"],
            ["macdSignal", "signalPeriod"],
            ["lookbackBars", "_divergenceLookback"],
            ["minSwingBars", "_divergenceMinSwing"],
            ["timeframe", "timeframe"]
          ),
        })
      );
    }
  }

  // Unified MTF confirmation (takes precedence over legacy per-strategy HTF fields)
  const mtf = d.mtfConfirmation;
  if (mtf?.enabled) {
    if (mtf.method === "ema") {
      virtualNodes.push(
        vNode("mtf-ema", "moving-average", {
          label: `MTF EMA(${mtf.emaPeriod ?? 200})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: mtf.timeframe ?? "H4",
          period: mtf.emaPeriod ?? 200,
          method: "EMA",
          signalMode: "candle_close",
          shift: 0,
          _filterRole: "htf-trend",
        })
      );
    } else if (mtf.method === "adx") {
      virtualNodes.push(
        vNode("mtf-adx", "adx", {
          label: `MTF ADX(${mtf.adxPeriod ?? 14})`,
          category: "indicator",
          indicatorType: "adx",
          timeframe: mtf.timeframe ?? "H4",
          period: mtf.adxPeriod ?? 14,
          trendLevel: mtf.adxThreshold ?? 25,
          signalMode: "candle_close",
          _filterRole: "adx-trend-strength",
        })
      );
    }
  }

  // Create buy + sell nodes based on direction setting
  const direction = d.direction ?? "BOTH";
  const sizingData = {
    method: "RISK_PERCENT" as const,
    fixedLot: 0.1,
    riskPercent: d.riskPercent,
    minLot: 0.01,
    maxLot: 100,
    optimizableFields: mapOpt(["riskPercent", "riskPercent"]),
  };

  if (direction === "BUY" || direction === "BOTH") {
    virtualNodes.push(
      vNode("buy", "place-buy", {
        label: "Place Buy",
        category: "entry",
        tradingType: "place-buy",
        ...sizingData,
        _closeOnOpposite: d.closeOnOpposite ?? false,
      })
    );
  }
  if (direction === "SELL" || direction === "BOTH") {
    virtualNodes.push(
      vNode("sell", "place-sell", {
        label: "Place Sell",
        category: "entry",
        tradingType: "place-sell",
        ...sizingData,
        _closeOnOpposite: d.closeOnOpposite ?? false,
      })
    );
  }

  // Create SL node
  const rawSlMethod = d.slMethod ?? "ATR";
  const slNodeMethod =
    rawSlMethod === "RANGE_OPPOSITE"
      ? "RANGE_OPPOSITE"
      : rawSlMethod === "PIPS"
        ? "FIXED_PIPS"
        : rawSlMethod === "PERCENT"
          ? "PERCENT"
          : "ATR_BASED";
  virtualNodes.push(
    vNode("sl", "stop-loss", {
      label: "Stop Loss",
      category: "riskmanagement",
      tradingType: "stop-loss",
      method: slNodeMethod,
      fixedPips: d.slFixedPips ?? 50,
      slPercent: d.slPercent ?? 1,
      atrMultiplier: d.slAtrMultiplier,
      atrPeriod: d.slAtrPeriod ?? 14,
      atrTimeframe: d.slAtrTimeframe,
      optimizableFields: mapOpt(
        ["slFixedPips", "fixedPips"],
        ["slPercent", "slPercent"],
        ["slAtrMultiplier", "atrMultiplier"],
        ["slAtrPeriod", "atrPeriod"],
        ["slAtrTimeframe", "atrTimeframe"]
      ),
    })
  );

  // Create TP node(s) — single TP or multiple TP levels
  const mtp = d.multipleTP;
  if (mtp?.enabled) {
    // TP1: partial close at tp1RMultiple × SL distance, closing tp1Percent% of position
    virtualNodes.push(
      vNode("partial-tp1", "partial-close", {
        label: "TP1 Partial Close",
        category: "trademanagement",
        managementType: "partial-close",
        closePercent: mtp.tp1Percent,
        triggerMethod: "PIPS",
        triggerPips: 0, // Will be overridden by _rMultipleTrigger
        triggerPercent: 1,
        moveSLToBreakeven: true,
        _rMultipleTrigger: mtp.tp1RMultiple,
      })
    );
    // TP2: standard TP at tp2RMultiple for the remainder
    virtualNodes.push(
      vNode("tp", "take-profit", {
        label: "Take Profit (TP2)",
        category: "riskmanagement",
        tradingType: "take-profit",
        method: "RISK_REWARD",
        fixedPips: 100,
        riskRewardRatio: mtp.tp2RMultiple,
        atrMultiplier: 3,
        atrPeriod: 14,
        optimizableFields: mapOpt(["tpRMultiple", "riskRewardRatio"]),
      })
    );
  } else {
    virtualNodes.push(
      vNode("tp", "take-profit", {
        label: "Take Profit",
        category: "riskmanagement",
        tradingType: "take-profit",
        method: "RISK_REWARD",
        fixedPips: 100,
        riskRewardRatio: d.tpRMultiple,
        atrMultiplier: 3,
        atrPeriod: 14,
        optimizableFields: mapOpt(["tpRMultiple", "riskRewardRatio"]),
      })
    );
  }

  // Create trailing stop node if enabled
  const ts = d.trailingStop;
  if (ts?.enabled) {
    virtualNodes.push(
      vNode("trailing", "trailing-stop", {
        label: "Trailing Stop",
        category: "trademanagement",
        managementType: "trailing-stop",
        method: ts.method === "atr" ? "ATR_BASED" : "FIXED_PIPS",
        trailPips: ts.fixedPips ?? 30,
        trailAtrMultiplier: ts.atrMultiplier ?? 2.0,
        trailAtrPeriod: ts.atrPeriod ?? 14,
        trailPercent: 50,
        startAfterPips: 0,
      })
    );
  }

  // Create edges: indicators → buy/sell → sl/tp
  const indicatorIds = virtualNodes
    .filter((n) => "indicatorType" in n.data || "priceActionType" in n.data)
    .map((n) => n.id);

  for (const indId of indicatorIds) {
    if (direction === "BUY" || direction === "BOTH") {
      virtualEdges.push({
        id: `${baseId}__e-${indId}-buy`,
        source: indId,
        target: `${baseId}__buy`,
      });
    }
    if (direction === "SELL" || direction === "BOTH") {
      virtualEdges.push({
        id: `${baseId}__e-${indId}-sell`,
        source: indId,
        target: `${baseId}__sell`,
      });
    }
  }

  if (direction === "BUY" || direction === "BOTH") {
    virtualEdges.push(
      { id: `${baseId}__e-buy-sl`, source: `${baseId}__buy`, target: `${baseId}__sl` },
      { id: `${baseId}__e-buy-tp`, source: `${baseId}__buy`, target: `${baseId}__tp` }
    );
    if (mtp?.enabled) {
      virtualEdges.push({
        id: `${baseId}__e-buy-ptp1`,
        source: `${baseId}__buy`,
        target: `${baseId}__partial-tp1`,
      });
    }
    if (ts?.enabled) {
      virtualEdges.push({
        id: `${baseId}__e-buy-trail`,
        source: `${baseId}__buy`,
        target: `${baseId}__trailing`,
      });
    }
  }
  if (direction === "SELL" || direction === "BOTH") {
    virtualEdges.push(
      { id: `${baseId}__e-sell-sl`, source: `${baseId}__sell`, target: `${baseId}__sl` },
      { id: `${baseId}__e-sell-tp`, source: `${baseId}__sell`, target: `${baseId}__tp` }
    );
    if (mtp?.enabled) {
      virtualEdges.push({
        id: `${baseId}__e-sell-ptp1`,
        source: `${baseId}__sell`,
        target: `${baseId}__partial-tp1`,
      });
    }
    if (ts?.enabled) {
      virtualEdges.push({
        id: `${baseId}__e-sell-trail`,
        source: `${baseId}__sell`,
        target: `${baseId}__trailing`,
      });
    }
  }

  return { nodes: virtualNodes, edges: virtualEdges };
}

function decomposeEntryStrategies(
  nodes: BuilderNode[],
  edges: BuilderEdge[]
): { nodes: BuilderNode[]; edges: BuilderEdge[] } {
  const resultNodes: BuilderNode[] = [];
  const resultEdges: BuilderEdge[] = [...edges];

  for (const node of nodes) {
    if (!("entryType" in node.data)) {
      resultNodes.push(node);
      continue;
    }

    const { nodes: virtualNodes, edges: virtualEdges } = expandEntryStrategy(node);
    resultNodes.push(...virtualNodes);
    resultEdges.push(...virtualEdges);

    // Re-wire: any edge pointing TO the entry strategy node should point to the virtual indicators
    const indicatorIds = virtualNodes
      .filter((n) => "indicatorType" in n.data || "priceActionType" in n.data)
      .map((n) => n.id);

    for (let i = 0; i < resultEdges.length; i++) {
      const edge = resultEdges[i];
      if (edge.target === node.id && indicatorIds.length > 0) {
        // Replace this edge with edges to each virtual indicator
        resultEdges.splice(i, 1);
        for (const indId of indicatorIds) {
          resultEdges.push({
            id: `${edge.id}__rewire-${indId}`,
            source: edge.source,
            target: indId,
          });
        }
        i--; // Adjust index after splice
      }
    }

    // Re-wire: any edge going FROM the entry strategy node to downstream nodes
    // (e.g., entry-strategy → breakeven-stop) should come from virtual indicator nodes
    for (let i = 0; i < resultEdges.length; i++) {
      const edge = resultEdges[i];
      if (edge.source === node.id && indicatorIds.length > 0) {
        resultEdges.splice(i, 1);
        for (const indId of indicatorIds) {
          resultEdges.push({
            id: `${edge.id}__rewire-out-${indId}`,
            source: indId,
            target: edge.target,
          });
        }
        i--;
      }
    }
  }

  return { nodes: resultNodes, edges: resultEdges };
}

// Build a const string array with strategy summary lines for the chart overlay.
// Uses the original (pre-decomposition) nodes so entry strategy blocks are still intact.
function buildStrategyOverlayArray(nodes: BuilderNode[], ctx: GeneratorContext): string {
  const lines: string[] = [];

  const entryTypeNames: Record<string, string> = {
    "ema-crossover": "EMA Crossover",
    "range-breakout": "Range Breakout",
    "rsi-reversal": "RSI Reversal",
    "trend-pullback": "Trend Pullback",
    "macd-crossover": "MACD Crossover",
    divergence: "RSI/MACD Divergence",
  };

  for (const node of nodes) {
    const d = node.data;
    if (!("entryType" in d)) continue;
    const entry = d as EntryStrategyNodeData;

    // Entry + timeframe
    const name = entryTypeNames[entry.entryType] ?? entry.entryType;
    lines.push(`Entry: ${name} (${entry.timeframe ?? "H1"})`);

    // Direction (only show if not BOTH, since BOTH is default)
    const dir = entry.direction ?? "BOTH";
    if (dir !== "BOTH") lines.push(`Direction: ${dir} only`);

    // Risk
    lines.push(`Risk: ${entry.riskPercent}% per trade`);

    // SL
    const slm = entry.slMethod ?? "ATR";
    if (slm === "ATR") lines.push(`SL: ${entry.slAtrMultiplier}x ATR(${entry.slAtrPeriod ?? 14})`);
    else if (slm === "PIPS") lines.push(`SL: ${entry.slFixedPips} pips`);
    else if (slm === "PERCENT") lines.push(`SL: ${entry.slPercent}%`);
    else if (slm === "RANGE_OPPOSITE") lines.push("SL: Range opposite side");

    // TP
    const mtp = entry.multipleTP;
    if (mtp?.enabled) {
      lines.push(`TP: ${mtp.tp1RMultiple}R (${mtp.tp1Percent}%) / ${mtp.tp2RMultiple}R`);
    } else {
      lines.push(`TP: ${entry.tpRMultiple}R`);
    }

    // Trailing stop
    if (entry.trailingStop?.enabled) {
      const ts = entry.trailingStop;
      if (ts.method === "atr") lines.push(`Trail: ${ts.atrMultiplier ?? 2}x ATR`);
      else lines.push(`Trail: ${ts.fixedPips ?? 30} pips`);
    }
  }

  // Timing info
  for (const node of nodes) {
    const d = node.data;
    if (node.type === "trading-session" && "session" in d) {
      const session = d.session as string;
      if (session === "CUSTOM") {
        const sh = String(("customStartHour" in d ? d.customStartHour : 8) ?? 8).padStart(2, "0");
        const sm = String(("customStartMinute" in d ? d.customStartMinute : 0) ?? 0).padStart(
          2,
          "0"
        );
        const eh = String(("customEndHour" in d ? d.customEndHour : 17) ?? 17).padStart(2, "0");
        const em = String(("customEndMinute" in d ? d.customEndMinute : 0) ?? 0).padStart(2, "0");
        lines.push(`Session: ${sh}:${sm} - ${eh}:${em}`);
      } else {
        lines.push(`Session: ${session}`);
      }
    } else if (node.type === "always") {
      lines.push("Session: 24/5");
    }
  }

  // Max spread filter
  for (const node of nodes) {
    const d = node.data as Record<string, unknown>;
    if (d.filterType === "max-spread" && "maxSpreadPips" in d) {
      lines.push(`Max spread: ${d.maxSpreadPips} pips`);
    }
  }

  // Max open trades (only if not default 1)
  if (ctx.maxOpenTrades > 1) {
    lines.push(`Max trades: ${ctx.maxOpenTrades}`);
  }

  // Format as MQL5 const string array
  if (lines.length === 0) {
    return 'const string g_strategyInfo[] = {"No strategy details available"};';
  }
  const escaped = lines.map((l) => `"${sanitizeMQL5String(l)}"`);
  return `const string g_strategyInfo[] = {${escaped.join(", ")}};`;
}

export function generateMQL5Code(
  buildJson: BuildJsonSchema,
  projectName: string,
  description?: string,
  telemetry?: TelemetryConfig
): string {
  // Preprocess: decompose entry strategy composite blocks into virtual primitive nodes
  const decomposed = decomposeEntryStrategies(buildJson.nodes, buildJson.edges);
  const processedBuildJson: BuildJsonSchema = {
    ...buildJson,
    nodes: decomposed.nodes,
    edges: decomposed.edges,
  };

  const ctx: GeneratorContext = {
    projectName: sanitizeName(projectName),
    description: sanitizeMQL5String(description ?? ""),
    magicNumber: buildJson.settings?.magicNumber ?? 123456,
    comment: sanitizeMQL5String(buildJson.settings?.comment ?? "AlgoStudio EA"),
    maxOpenTrades: buildJson.settings?.maxOpenTrades ?? 1,
    allowHedging: buildJson.settings?.allowHedging ?? false,
    maxBuyPositions: buildJson.settings?.maxBuyPositions ?? buildJson.settings?.maxOpenTrades ?? 1,
    maxSellPositions:
      buildJson.settings?.maxSellPositions ?? buildJson.settings?.maxOpenTrades ?? 1,
    conditionMode: buildJson.settings?.conditionMode ?? "AND",
    maxTradesPerDay: buildJson.settings?.maxTradesPerDay ?? 0,
    maxDailyProfitPercent: buildJson.settings?.maxDailyProfitPercent ?? 0,
    maxDailyLossPercent: buildJson.settings?.maxDailyLossPercent ?? 0,
    cooldownAfterLossMinutes: buildJson.settings?.cooldownAfterLossMinutes ?? 0,
    minBarsBetweenTrades: buildJson.settings?.minBarsBetweenTrades ?? 0,
    maxTotalDrawdownPercent: buildJson.settings?.maxTotalDrawdownPercent ?? 0,
    equityTargetPercent: buildJson.settings?.equityTargetPercent ?? 0,
    maxSlippage: buildJson.settings?.maxSlippage ?? 10,
  };

  const descValue = sanitizeMQL5String(projectName);

  const code: GeneratedCode = {
    inputs: [
      {
        name: "InpMagicNumber",
        type: "int",
        value: ctx.magicNumber,
        comment: "Magic Number",
        isOptimizable: true,
        alwaysVisible: true,
        group: "General Settings",
      },
      {
        name: "InpStrategyDescription",
        type: "string",
        value: descValue,
        comment: "Strategy Description (shown on chart)",
        isOptimizable: false,
        alwaysVisible: true,
        group: "General Settings",
      },
      {
        name: "InpTradeComment",
        type: "string",
        value: sanitizeMQL5String(ctx.comment || ctx.description || ctx.projectName),
        comment: "Trade Order Comment",
        isOptimizable: false,
        alwaysVisible: true,
        group: "General Settings",
      },
      {
        name: "InpMaxSlippage",
        type: "int",
        value: ctx.maxSlippage,
        comment: "Max Slippage (points)",
        isOptimizable: false,
        group: "Risk Management",
      },
    ],
    globalVariables: [
      "int _pipFactor = 10; // 10 for 5/3-digit brokers, 1 for 4/2-digit",
      buildStrategyOverlayArray(buildJson.nodes, ctx),
    ],
    onInit: ["_pipFactor = (_Digits == 3 || _Digits == 5) ? 10 : 1;"],
    onDeinit: [],
    onTick: [],
    helperFunctions: [],
    maxIndicatorPeriod: 0,
  };

  // Get all nodes that are connected to the strategy (starting from timing nodes)
  const connectedNodeIds = getConnectedNodeIds(processedBuildJson.nodes, processedBuildJson.edges, [
    "trading-session",
    "always",
    "custom-times",
  ]);

  // Helper to check if a node is connected to the strategy.
  // When no timing/filter nodes exist, all nodes are reachable (timing is optional).
  const isConnected = (node: BuilderNode) =>
    connectedNodeIds.size === 0 || connectedNodeIds.has(node.id);

  // Single-pass node categorization (instead of 11 separate .filter() passes)
  const indicatorTypeSet = new Set([
    "moving-average",
    "rsi",
    "macd",
    "bollinger-bands",
    "atr",
    "adx",
    "stochastic",
    "cci",
    "obv",
    "vwap",
  ]);
  const tradeManagementTypeSet = new Set([
    "breakeven-stop",
    "trailing-stop",
    "partial-close",
    "lock-profit",
    "multi-level-tp",
  ]);
  const priceActionTypeSet = new Set([
    "candlestick-pattern",
    "support-resistance",
    "range-breakout",
  ]);

  const indicatorNodes: BuilderNode[] = [];
  const placeBuyNodes: BuilderNode[] = [];
  const placeSellNodes: BuilderNode[] = [];
  const stopLossNodes: BuilderNode[] = [];
  const takeProfitNodes: BuilderNode[] = [];
  const timingNodes: BuilderNode[] = [];
  const tradeManagementNodes: BuilderNode[] = [];
  const priceActionNodes: BuilderNode[] = [];
  const closeConditionNodes: BuilderNode[] = [];
  const timeExitNodes: BuilderNode[] = [];
  const gridPyramidNodes: BuilderNode[] = [];
  const maxSpreadNodes: BuilderNode[] = [];

  for (const n of processedBuildJson.nodes) {
    const nodeType = n.type as string;
    const data = n.data;
    const connected = isConnected(n);

    // Max spread filter nodes (always included regardless of connection)
    if (nodeType === "max-spread" || "filterType" in data) {
      maxSpreadNodes.push(n);
      continue;
    }

    // Timing nodes (always included regardless of connection)
    if (
      nodeType === "trading-session" ||
      nodeType === "always" ||
      nodeType === "custom-times" ||
      "timingType" in data
    ) {
      timingNodes.push(n);
      continue;
    }

    if (!connected) continue;

    if (indicatorTypeSet.has(nodeType) || "indicatorType" in data) {
      indicatorNodes.push(n);
    } else if (priceActionTypeSet.has(nodeType) || "priceActionType" in data) {
      priceActionNodes.push(n);
    } else if (
      tradeManagementTypeSet.has(nodeType) ||
      "managementType" in data ||
      "tradeManagementType" in data
    ) {
      tradeManagementNodes.push(n);
    } else if (
      nodeType === "grid-pyramid" ||
      ("tradingType" in data && data.tradingType === "grid-pyramid")
    ) {
      gridPyramidNodes.push(n);
    } else if (
      nodeType === "place-buy" ||
      ("tradingType" in data && data.tradingType === "place-buy")
    ) {
      placeBuyNodes.push(n);
    } else if (
      nodeType === "place-sell" ||
      ("tradingType" in data && data.tradingType === "place-sell")
    ) {
      placeSellNodes.push(n);
    } else if (
      nodeType === "stop-loss" ||
      ("tradingType" in data && data.tradingType === "stop-loss")
    ) {
      stopLossNodes.push(n);
    } else if (
      nodeType === "take-profit" ||
      ("tradingType" in data && data.tradingType === "take-profit")
    ) {
      takeProfitNodes.push(n);
    } else if (
      nodeType === "close-condition" ||
      ("tradingType" in data && data.tradingType === "close-condition")
    ) {
      closeConditionNodes.push(n);
    } else if (
      nodeType === "time-exit" ||
      ("tradingType" in data && data.tradingType === "time-exit")
    ) {
      timeExitNodes.push(n);
    }
  }

  // Generate timing code (supports multiple timing nodes OR'd together)
  if (timingNodes.length > 0) {
    generateMultipleTimingCode(timingNodes, code);
  }

  // Generate spread filter code from max-spread nodes (optimizable input)
  const actualSpreadNodes = maxSpreadNodes.filter(
    (n) => (n.data as { filterType?: string }).filterType === "max-spread"
  );
  if (actualSpreadNodes.length > 0) {
    const spreadNode = actualSpreadNodes[0];
    const spreadPips = (spreadNode.data as { maxSpreadPips: number }).maxSpreadPips ?? 30;
    code.inputs.push({
      name: "InpMaxSpread",
      type: "int",
      value: spreadPips,
      comment: "Max Spread (pips)",
      isOptimizable: isFieldOptimizable(spreadNode, "maxSpreadPips"),
      group: "Risk Management",
    });
    code.onTick.push(`//--- Spread filter`);
    code.onTick.push(`{`);
    code.onTick.push(`   int currentSpread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);`);
    code.onTick.push(`   if(currentSpread > InpMaxSpread * _pipFactor)`);
    code.onTick.push(`      return;`);
    code.onTick.push(`}`);
  }

  // Generate volatility filter code (ATR-based)
  const volatilityNodes = maxSpreadNodes.filter(
    (n) => (n.data as { filterType?: string }).filterType === "volatility-filter"
  );
  if (volatilityNodes.length > 0) {
    const vNode = volatilityNodes[0];
    const vData = vNode.data as VolatilityFilterNodeData;
    const atrPeriod = vData.atrPeriod ?? 14;
    const atrTf = getTimeframe(vData.atrTimeframe ?? "H1");
    const minPips = vData.minAtrPips ?? 0;
    const maxPips = vData.maxAtrPips ?? 50;
    code.inputs.push(
      {
        name: "InpVolATRPeriod",
        type: "int",
        value: atrPeriod,
        comment: "ATR Period (Volatility Filter)",
        isOptimizable: isFieldOptimizable(vNode, "atrPeriod"),
        group: "Volatility Filter",
      },
      {
        name: "InpMinATRPips",
        type: "int",
        value: minPips,
        comment: "Min ATR (pips, 0=off)",
        isOptimizable: isFieldOptimizable(vNode, "minAtrPips"),
        group: "Volatility Filter",
      },
      {
        name: "InpMaxATRPips",
        type: "int",
        value: maxPips,
        comment: "Max ATR (pips, 0=off)",
        isOptimizable: isFieldOptimizable(vNode, "maxAtrPips"),
        group: "Volatility Filter",
      }
    );
    code.globalVariables.push("int volATRHandle = INVALID_HANDLE;");
    code.globalVariables.push("double volATRBuf[];");
    code.onInit.push(`volATRHandle = iATR(_Symbol, ${atrTf}, InpVolATRPeriod);`);
    code.onInit.push(
      'if(volATRHandle == INVALID_HANDLE) { Print("Failed to create ATR handle for volatility filter"); return(INIT_FAILED); }'
    );
    code.onInit.push("ArraySetAsSeries(volATRBuf, true);");
    code.onDeinit.push("if(volATRHandle != INVALID_HANDLE) IndicatorRelease(volATRHandle);");
    code.onTick.push(`//--- Volatility filter (ATR)`);
    code.onTick.push(`if(CopyBuffer(volATRHandle, 0, 0, 1, volATRBuf) == 1)`);
    code.onTick.push(`{`);
    code.onTick.push(`   double atrPips = volATRBuf[0] / (_Point * _pipFactor);`);
    code.onTick.push(`   if(InpMinATRPips > 0 && atrPips < InpMinATRPips) return;`);
    code.onTick.push(`   if(InpMaxATRPips > 0 && atrPips > InpMaxATRPips) return;`);
    code.onTick.push(`}`);
  }

  // Generate friday close filter code
  const fridayCloseNodes = maxSpreadNodes.filter(
    (n) => (n.data as { filterType?: string }).filterType === "friday-close"
  );
  if (fridayCloseNodes.length > 0) {
    const fcNode = fridayCloseNodes[0];
    const fcData = fcNode.data as FridayCloseFilterNodeData;
    const closeHour = fcData.closeHour ?? 17;
    const closeMinute = fcData.closeMinute ?? 0;
    const useServer = fcData.useServerTime ?? true;
    const closePending = fcData.closePending ?? true;
    const timeFunc = useServer ? "TimeCurrent()" : "TimeGMT()";
    const timeLabel = useServer ? "Server time" : "GMT";

    code.inputs.push({
      name: "InpFridayCloseHour",
      type: "int",
      value: closeHour,
      comment: "Friday Close Hour",
      isOptimizable: isFieldOptimizable(fcNode, "closeHour"),
      group: "Friday Close",
    });
    code.inputs.push({
      name: "InpFridayCloseMinute",
      type: "int",
      value: closeMinute,
      comment: "Friday Close Minute",
      isOptimizable: isFieldOptimizable(fcNode, "closeMinute"),
      group: "Friday Close",
    });
    code.onTick.push(
      `//--- Friday close filter (${String(closeHour).padStart(2, "0")}:${String(closeMinute).padStart(2, "0")} ${timeLabel})`
    );
    code.onTick.push(`{`);
    code.onTick.push(`   MqlDateTime fcDt;`);
    code.onTick.push(`   TimeToStruct(${timeFunc}, fcDt);`);
    code.onTick.push(`   if(fcDt.day_of_week == 5)`);
    code.onTick.push(`   {`);
    code.onTick.push(`      int fcMinutes = fcDt.hour * 60 + fcDt.min;`);
    code.onTick.push(`      int fcCloseMinutes = InpFridayCloseHour * 60 + InpFridayCloseMinute;`);
    code.onTick.push(`      if(fcMinutes >= fcCloseMinutes)`);
    code.onTick.push(`      {`);
    code.onTick.push(`         // Close all open positions`);
    code.onTick.push(`         for(int i = PositionsTotal() - 1; i >= 0; i--)`);
    code.onTick.push(`         {`);
    code.onTick.push(`            ulong ticket = PositionGetTicket(i);`);
    code.onTick.push(
      `            if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)`
    );
    code.onTick.push(`               trade.PositionClose(ticket);`);
    code.onTick.push(`         }`);
    if (closePending) {
      code.onTick.push(`         // Delete pending orders`);
      code.onTick.push(`         for(int i = OrdersTotal() - 1; i >= 0; i--)`);
      code.onTick.push(`         {`);
      code.onTick.push(`            ulong ticket = OrderGetTicket(i);`);
      code.onTick.push(
        `            if(ticket > 0 && OrderGetInteger(ORDER_MAGIC) == InpMagicNumber && OrderGetString(ORDER_SYMBOL) == _Symbol)`
      );
      code.onTick.push(`               trade.OrderDelete(ticket);`);
      code.onTick.push(`         }`);
    }
    code.onTick.push(`         return;`);
    code.onTick.push(`      }`);
    code.onTick.push(`   }`);
    code.onTick.push(`}`);
  }

  // Generate news filter code (calendar API live, CSV backtest)
  const newsFilterNodes = maxSpreadNodes.filter(
    (n) => (n.data as { filterType?: string }).filterType === "news-filter"
  );
  if (newsFilterNodes.length > 0) {
    const nfNode = newsFilterNodes[0];
    const nfData = nfNode.data as NewsFilterNodeData;
    const hoursBefore = nfData.hoursBefore ?? 0.5;
    const hoursAfter = nfData.hoursAfter ?? 0.5;
    const minBefore = Math.round(hoursBefore * 60);
    const minAfter = Math.round(hoursAfter * 60);
    const highImpact = nfData.highImpact ?? true;
    const mediumImpact = nfData.mediumImpact ?? false;
    const lowImpact = nfData.lowImpact ?? false;
    const closePositions = nfData.closePositions ?? false;

    // Inputs (MQL5 uses minutes internally)
    code.inputs.push(
      {
        name: "InpNewsMinBefore",
        type: "int",
        value: minBefore,
        comment: `Minutes Before News (${hoursBefore}h)`,
        isOptimizable: isFieldOptimizable(nfNode, "hoursBefore"),
        group: "News Filter",
      },
      {
        name: "InpNewsMinAfter",
        type: "int",
        value: minAfter,
        comment: `Minutes After News (${hoursAfter}h)`,
        isOptimizable: isFieldOptimizable(nfNode, "hoursAfter"),
        group: "News Filter",
      },
      {
        name: "InpNewsHigh",
        type: "bool",
        value: highImpact,
        comment: "Filter High Impact",
        isOptimizable: false,
        group: "News Filter",
      },
      {
        name: "InpNewsMedium",
        type: "bool",
        value: mediumImpact,
        comment: "Filter Medium Impact",
        isOptimizable: false,
        group: "News Filter",
      },
      {
        name: "InpNewsLow",
        type: "bool",
        value: lowImpact,
        comment: "Filter Low Impact",
        isOptimizable: false,
        group: "News Filter",
      },
      {
        name: "InpNewsClosePos",
        type: "bool",
        value: closePositions,
        comment: "Close Positions During News",
        isOptimizable: false,
        group: "News Filter",
      },
      {
        name: "InpBrokerUTCOffset",
        type: "int",
        value: 0,
        comment: "Broker UTC Offset (hours, e.g. 2 for UTC+2)",
        isOptimizable: false,
        group: "News Filter",
      }
    );

    // Global variables
    code.globalVariables.push("struct SNewsEvent { datetime time; int importance; };");
    code.globalVariables.push("SNewsEvent g_newsEvents[];");
    code.globalVariables.push("int        g_newsCount = 0;");
    code.globalVariables.push("bool       g_isTesting = false;");
    code.globalVariables.push("datetime   g_lastNewsRefresh = 0;");
    code.globalVariables.push("string     g_baseCurrency, g_quoteCurrency;");

    // Embedded news data for backtesting (generated at export time)
    const newsGenerationDate = new Date().toISOString().split("T")[0];
    const newsData = generateEmbeddedNewsData(2015, 2030);
    const newsArrayEntries = newsData.map((entry) => `   "${entry}"`).join(",\n");
    code.globalVariables.push(`// NEWS CALENDAR DATA — Generated on ${newsGenerationDate}`);
    code.globalVariables.push(`// This data is static and was embedded at the time of EA export.`);
    code.globalVariables.push(`// Re-export the EA to refresh news calendar data for backtesting.`);
    code.globalVariables.push(`const string g_embeddedNews[] = {\n${newsArrayEntries}\n};`);

    // OnInit
    code.onInit.push(`   g_isTesting = (bool)MQLInfoInteger(MQL_TESTER);`);
    code.onInit.push(`   g_baseCurrency = SymbolInfoString(_Symbol, SYMBOL_CURRENCY_BASE);`);
    code.onInit.push(`   g_quoteCurrency = SymbolInfoString(_Symbol, SYMBOL_CURRENCY_PROFIT);`);
    code.onInit.push(``);
    code.onInit.push(`   if(g_isTesting)`);
    code.onInit.push(`   {`);
    code.onInit.push(`      LoadEmbeddedNews();`);
    code.onInit.push(`   }`);
    code.onInit.push(`   else`);
    code.onInit.push(`   {`);
    code.onInit.push(`      RefreshNewsCache();`);
    code.onInit.push(`   }`);

    // OnTick — news filter block
    code.onTick.push(`//--- News filter`);
    code.onTick.push(`{`);
    code.onTick.push(`   if(!g_isTesting && TimeCurrent() - g_lastNewsRefresh > 3600)`);
    code.onTick.push(`      RefreshNewsCache();`);
    code.onTick.push(``);
    code.onTick.push(`   if(IsNewsTime())`);
    code.onTick.push(`   {`);
    if (closePositions) {
      code.onTick.push(`      if(InpNewsClosePos)`);
      code.onTick.push(`      {`);
      code.onTick.push(`         for(int i = PositionsTotal()-1; i >= 0; i--)`);
      code.onTick.push(`         {`);
      code.onTick.push(`            ulong ticket = PositionGetTicket(i);`);
      code.onTick.push(
        `            if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber`
      );
      code.onTick.push(`               && PositionGetString(POSITION_SYMBOL) == _Symbol)`);
      code.onTick.push(`               trade.PositionClose(ticket);`);
      code.onTick.push(`         }`);
      code.onTick.push(`      }`);
    }
    code.onTick.push(`      return;`);
    code.onTick.push(`   }`);
    code.onTick.push(`}`);

    // Helper functions
    code.helperFunctions.push(`void RefreshNewsCache()`);
    code.helperFunctions.push(`{`);
    code.helperFunctions.push(`   ArrayResize(g_newsEvents, 0);`);
    code.helperFunctions.push(`   g_newsCount = 0;`);
    code.helperFunctions.push(`   MqlCalendarValue values[];`);
    code.helperFunctions.push(`   datetime dayStart = iTime(_Symbol, PERIOD_D1, 0);`);
    code.helperFunctions.push(`   datetime dayEnd = dayStart + 2*86400;`);
    code.helperFunctions.push(`   if(CalendarValueHistory(values, dayStart, dayEnd))`);
    code.helperFunctions.push(`   {`);
    code.helperFunctions.push(`      for(int i = 0; i < ArraySize(values); i++)`);
    code.helperFunctions.push(`      {`);
    code.helperFunctions.push(`         MqlCalendarEvent event;`);
    code.helperFunctions.push(
      `         if(!CalendarEventById(values[i].event_id, event)) continue;`
    );
    code.helperFunctions.push(`         MqlCalendarCountry country;`);
    code.helperFunctions.push(
      `         if(!CalendarCountryById(event.country_id, country)) continue;`
    );
    code.helperFunctions.push(
      `         if(country.currency != g_baseCurrency && country.currency != g_quoteCurrency) continue;`
    );
    code.helperFunctions.push(`         int imp = (int)event.importance;`);
    code.helperFunctions.push(
      `         if((imp==1 && !InpNewsLow) || (imp==2 && !InpNewsMedium) || (imp==3 && !InpNewsHigh)) continue;`
    );
    code.helperFunctions.push(`         int idx = g_newsCount++;`);
    code.helperFunctions.push(`         ArrayResize(g_newsEvents, g_newsCount);`);
    code.helperFunctions.push(`         g_newsEvents[idx].time = values[i].time;`);
    code.helperFunctions.push(`         g_newsEvents[idx].importance = imp;`);
    code.helperFunctions.push(`      }`);
    code.helperFunctions.push(`   }`);
    code.helperFunctions.push(`   g_lastNewsRefresh = TimeCurrent();`);
    code.helperFunctions.push(`}`);
    code.helperFunctions.push(``);

    code.helperFunctions.push(`bool IsNewsTime()`);
    code.helperFunctions.push(`{`);
    code.helperFunctions.push(`   datetime now = TimeCurrent();`);
    code.helperFunctions.push(`   for(int i = 0; i < g_newsCount; i++)`);
    code.helperFunctions.push(`   {`);
    code.helperFunctions.push(`      if(now >= g_newsEvents[i].time - InpNewsMinBefore*60`);
    code.helperFunctions.push(`         && now <= g_newsEvents[i].time + InpNewsMinAfter*60)`);
    code.helperFunctions.push(`      {`);
    code.helperFunctions.push(`         int imp = g_newsEvents[i].importance;`);
    code.helperFunctions.push(
      `         if((imp==3 && InpNewsHigh) || (imp==2 && InpNewsMedium) || (imp==1 && InpNewsLow))`
    );
    code.helperFunctions.push(`            return true;`);
    code.helperFunctions.push(`      }`);
    code.helperFunctions.push(`   }`);
    code.helperFunctions.push(`   return false;`);
    code.helperFunctions.push(`}`);
    code.helperFunctions.push(``);

    code.helperFunctions.push(`void LoadEmbeddedNews()`);
    code.helperFunctions.push(`{`);
    code.helperFunctions.push(`   ArrayResize(g_newsEvents, 0);`);
    code.helperFunctions.push(`   g_newsCount = 0;`);
    code.helperFunctions.push(`   for(int i = 0; i < ArraySize(g_embeddedNews); i++)`);
    code.helperFunctions.push(`   {`);
    code.helperFunctions.push(`      string parts[];`);
    code.helperFunctions.push(`      StringSplit(g_embeddedNews[i], ',', parts);`);
    code.helperFunctions.push(`      if(ArraySize(parts) < 3) continue;`);
    code.helperFunctions.push(`      string cur = parts[2];`);
    code.helperFunctions.push(
      `      if(cur != g_baseCurrency && cur != g_quoteCurrency) continue;`
    );
    code.helperFunctions.push(`      int imp = (int)StringToInteger(parts[1]);`);
    code.helperFunctions.push(
      `      if((imp==1 && !InpNewsLow) || (imp==2 && !InpNewsMedium) || (imp==3 && !InpNewsHigh)) continue;`
    );
    code.helperFunctions.push(`      int idx = g_newsCount++;`);
    code.helperFunctions.push(`      ArrayResize(g_newsEvents, g_newsCount, 1000);`);
    code.helperFunctions.push(
      `      g_newsEvents[idx].time = StringToTime(parts[0]) + InpBrokerUTCOffset*3600;`
    );
    code.helperFunctions.push(`      g_newsEvents[idx].importance = imp;`);
    code.helperFunctions.push(`   }`);
    code.helperFunctions.push(
      `   Print("Loaded ", g_newsCount, " news events from embedded data");`
    );
    code.helperFunctions.push(`}`);
  }

  // Generate volume filter code
  const volumeFilterNodes = maxSpreadNodes.filter(
    (n) => (n.data as { filterType?: string }).filterType === "volume-filter"
  );
  if (volumeFilterNodes.length > 0) {
    const vfNode = volumeFilterNodes[0];
    const vfData = vfNode.data as VolumeFilterNodeData;
    const volPeriod = vfData.volumePeriod ?? 20;
    const volMultiplier = vfData.volumeMultiplier ?? 1.5;
    const volMode = vfData.filterMode ?? "ABOVE_AVERAGE";
    const vfTf = getTimeframe(vfData.timeframe ?? "H1");

    code.inputs.push(
      {
        name: "InpVolFilterPeriod",
        type: "int",
        value: volPeriod,
        comment: "Volume SMA Period",
        isOptimizable: isFieldOptimizable(vfNode, "volumePeriod"),
        group: "Volume Filter",
      },
      {
        name: "InpVolFilterMult",
        type: "double",
        value: volMultiplier,
        comment: "Volume Multiplier",
        isOptimizable: isFieldOptimizable(vfNode, "volumeMultiplier"),
        group: "Volume Filter",
      }
    );
    code.globalVariables.push("double volFilterAvg = 0;");
    code.onTick.push(`//--- Volume filter (${volMode})`);
    code.onTick.push(`{`);
    code.onTick.push(`   long curVol = iVolume(_Symbol, ${vfTf}, 1);`);
    code.onTick.push(`   double sumVol = 0;`);
    code.onTick.push(`   for(int v = 2; v <= InpVolFilterPeriod + 1; v++)`);
    code.onTick.push(`      sumVol += (double)iVolume(_Symbol, ${vfTf}, v);`);
    code.onTick.push(`   volFilterAvg = sumVol / InpVolFilterPeriod;`);

    if (volMode === "ABOVE_AVERAGE") {
      code.onTick.push(`   if(curVol < (long)(volFilterAvg * InpVolFilterMult)) return;`);
    } else if (volMode === "BELOW_AVERAGE") {
      code.onTick.push(`   if(curVol > (long)(volFilterAvg * InpVolFilterMult)) return;`);
    } else {
      // SPIKE: volume must be at least multiplier * average
      code.onTick.push(`   if(curVol < (long)(volFilterAvg * InpVolFilterMult)) return;`);
    }
    code.onTick.push(`}`);
  }

  // Generate indicator code (only connected indicators)
  indicatorNodes.forEach((node, index) => {
    generateIndicatorCode(node, index, code);
  });

  // Generate price action code (only connected nodes)
  priceActionNodes.forEach((node, index) => {
    generatePriceActionCode(node, index, code);
  });

  // Track which trading components are connected
  const hasBuy = placeBuyNodes.length > 0;
  const hasSell = placeSellNodes.length > 0;
  const hasStopLoss = stopLossNodes.length > 0;
  const hasTakeProfit = takeProfitNodes.length > 0;

  // Add equity/balance toggle (always needed because CalculateLotSize references it)
  code.inputs.push({
    name: "InpUseEquityForRisk",
    type: "bool",
    value: false,
    comment: "Use Equity instead of Balance for risk sizing",
    isOptimizable: false,
    group: "Risk Management",
  });

  // Generate SL/TP code FIRST (so hasDirectionalSL is set before lot sizing)
  if (hasStopLoss) {
    generateStopLossCode(
      stopLossNodes[0],
      indicatorNodes,
      processedBuildJson.edges,
      code,
      priceActionNodes
    );
  } else if (hasBuy || hasSell) {
    // No SL node connected but we have trade entries - use 0 (no stop loss)
    code.onTick.push("double slPips = 0; // No Stop Loss connected");
  }

  if (hasTakeProfit) {
    generateTakeProfitCode(takeProfitNodes[0], code);
  } else if (hasBuy || hasSell) {
    // No TP node connected but we have trade entries - use 0 (no take profit)
    code.onTick.push("double tpPips = 0; // No Take Profit connected");
  }

  // Determine if range breakout is the sole entry mechanism (lot sizing handled by pending orders)
  const isRangeBreakoutOnly =
    priceActionNodes.some(
      (n) => "priceActionType" in n.data && n.data.priceActionType === "range-breakout"
    ) &&
    indicatorNodes.filter((n) => {
      const d = n.data as Record<string, unknown>;
      return !d._filterRole && !d._entryStrategyType;
    }).length === 0 &&
    priceActionNodes.every(
      (n) => "priceActionType" in n.data && n.data.priceActionType === "range-breakout"
    );

  // Generate position sizing code for buy/sell (after SL/TP so hasDirectionalSL is available)
  // Skip onTick lot sizing when range breakout is the only entry and method is RISK_PERCENT,
  // because the pending order section calculates lots from the actual SL distance independently.
  // When both buy and sell use RISK_PERCENT, consolidate into a single InpRiskPercent input.
  const buyUsesRiskPercent =
    hasBuy && (placeBuyNodes[0].data as Record<string, unknown>).method === "RISK_PERCENT";
  const sellUsesRiskPercent =
    hasSell && (placeSellNodes[0].data as Record<string, unknown>).method === "RISK_PERCENT";
  const useSharedRisk = buyUsesRiskPercent && sellUsesRiskPercent;

  if (hasBuy) {
    const skipBuyLot = isRangeBreakoutOnly && buyUsesRiskPercent;
    generatePlaceBuyCode(placeBuyNodes[0], code, skipBuyLot, useSharedRisk);
  }
  if (hasSell) {
    const skipSellLot = isRangeBreakoutOnly && sellUsesRiskPercent;
    generatePlaceSellCode(placeSellNodes[0], code, skipSellLot, useSharedRisk);
  }

  // Generate close-at-time code BEFORE entry logic so positions are closed before new orders
  // Read from virtual range-breakout nodes (decomposed from entry strategy)
  for (const paNode of priceActionNodes) {
    const paData = paNode.data as Record<string, unknown>;
    if (paData.priceActionType !== "range-breakout") continue;
    if (!paData._closeAtTime) continue;
    const h = (paData._closeAtHour as number) ?? 17;
    const m = (paData._closeAtMinute as number) ?? 0;
    const useServer = (paData._useServerTime as boolean) ?? true;
    const timeFunc = useServer ? "TimeCurrent()" : "TimeGMT()";
    const timeLabel = useServer ? "Server time" : "GMT";
    const group = "Range Breakout - Close At Time";

    // Export as input parameters so users can optimize
    code.inputs.push({
      name: "InpRangeCloseHour",
      type: "int",
      value: h,
      comment: `Close hour (${timeLabel})`,
      isOptimizable: true,
      group,
    });
    code.inputs.push({
      name: "InpRangeCloseMinute",
      type: "int",
      value: m,
      comment: `Close minute (${timeLabel})`,
      isOptimizable: true,
      group,
    });

    code.onTick.push("");
    code.onTick.push(`//--- Close range breakout positions at specified time (${timeLabel})`);
    code.onTick.push("{");
    code.onTick.push(`   MqlDateTime closeTimeDt;`);
    code.onTick.push(`   TimeToStruct(${timeFunc}, closeTimeDt);`);
    code.onTick.push(`   int closeMinutes = closeTimeDt.hour * 60 + closeTimeDt.min;`);
    code.onTick.push(`   if(closeMinutes >= InpRangeCloseHour * 60 + InpRangeCloseMinute)`);
    code.onTick.push("   {");
    code.onTick.push("      for(int i = PositionsTotal() - 1; i >= 0; i--)");
    code.onTick.push("      {");
    code.onTick.push("         ulong ticket = PositionGetTicket(i);");
    code.onTick.push(
      "         if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
    );
    code.onTick.push("            trade.PositionClose(ticket);");
    code.onTick.push("      }");
    code.onTick.push("      // Also delete pending orders");
    code.onTick.push("      for(int i = OrdersTotal() - 1; i >= 0; i--)");
    code.onTick.push("      {");
    code.onTick.push("         ulong ticket = OrderGetTicket(i);");
    code.onTick.push(
      "         if(ticket > 0 && OrderGetInteger(ORDER_MAGIC) == InpMagicNumber && OrderGetString(ORDER_SYMBOL) == _Symbol)"
    );
    code.onTick.push("            trade.OrderDelete(ticket);");
    code.onTick.push("      }");
    code.onTick.push("      return;");
    code.onTick.push("   }");
    code.onTick.push("}");
  }

  // Generate entry logic based on connected indicators, price action nodes, and buy/sell nodes
  generateEntryLogic(
    indicatorNodes,
    priceActionNodes,
    hasBuy,
    hasSell,
    ctx,
    code,
    hasBuy ? placeBuyNodes[0] : undefined,
    hasSell ? placeSellNodes[0] : undefined,
    processedBuildJson.edges
  );

  // Generate close condition code
  closeConditionNodes.forEach((ccNode) => {
    generateCloseConditionCode(
      ccNode,
      indicatorNodes,
      priceActionNodes,
      processedBuildJson.edges,
      code
    );
  });

  // Generate time-based exit code
  timeExitNodes.forEach((node) => {
    generateTimeExitCode(node, code);
  });

  // Generate trade management code (Pro only)
  tradeManagementNodes.forEach((node) => {
    generateTradeManagementCode(node, code);
  });

  // Generate grid/pyramid code
  gridPyramidNodes.forEach((node) => {
    generateGridPyramidCode(node, code, ctx);
  });

  // Generate telemetry code (live EA tracking)
  if (telemetry) {
    generateTelemetryCode(code, telemetry);
  }

  // News filter setup instructions (only when news filter is used)
  const newsSetupGuide =
    newsFilterNodes.length > 0
      ? `//+------------------------------------------------------------------+
//| NEWS FILTER — SETUP GUIDE                                        |
//+------------------------------------------------------------------+
//| This EA uses a News Filter that avoids trading around economic    |
//| news events. Follow these steps to enable backtesting support:    |
//|                                                                   |
//| STEP 1: Compile this EA in MetaEditor (F7)                       |
//|                                                                   |
//| STEP 2: Attach the EA to any live or demo chart                  |
//|         → The EA will automatically download all historical news  |
//|           data and save it to:                                    |
//|           [Common Files]/ea_builder_news.csv                      |
//|         → This happens once; future runs only append new events   |
//|                                                                   |
//| STEP 3: Open the Strategy Tester and run your backtest            |
//|         → The EA detects tester mode and reads from the CSV       |
//|         → News events are filtered by your symbol's currencies    |
//|                                                                   |
//| OPTIONAL: Set "Export News History" input to true for a full      |
//|           re-download of all calendar data since 2010.            |
//|                                                                   |
//| NOTE: The CSV is stored in the Common Files folder so it works    |
//|       across all terminals and accounts. You only need to do      |
//|       Step 2 once — after that, backtesting works immediately.    |
//+------------------------------------------------------------------+

`
      : "";

  // Assemble final code (array join avoids repeated string allocation)
  const parts = [
    generateFileHeader(ctx),
    newsSetupGuide,
    generateTradeIncludes(),
    generateInputsSection(code.inputs),
    generateGlobalVariablesSection(code.globalVariables),
    generateOnInit(ctx, code.onInit),
    generateOnDeinit(code.onDeinit),
    generateOnTick(ctx, code.onTick, code.maxIndicatorPeriod),
    generateHelperFunctions(ctx),
    code.helperFunctions.join("\n\n"),
  ];

  return parts.join("");
}
