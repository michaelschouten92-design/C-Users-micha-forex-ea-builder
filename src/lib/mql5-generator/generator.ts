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
  EntryStrategyNodeData,
  VolatilityFilterNodeData,
  EquityFilterNodeData,
  FridayCloseFilterNodeData,
  NewsFilterNodeData,
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
} from "./generators/trading";
import { generateTradeManagementCode } from "./generators/trade-management";
import { generateCloseConditionCode } from "./generators/close-conditions";

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
        optimizableFields: mapOpt(["fastEma", "period"]),
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
        optimizableFields: mapOpt(["slowEma", "period"]),
        _entryStrategyType: "ema-crossover",
        _entryStrategyId: baseId,
        _role: "slow",
      })
    );
    // HTF trend filter: price must be above/below HTF EMA
    if (ema.htfTrendFilter) {
      virtualNodes.push(
        vNode("htf-ema", "moving-average", {
          label: `HTF EMA(${ema.htfEma})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: ema.htfTimeframe ?? "H4",
          period: ema.htfEma,
          method: "EMA",
          signalMode: "candle_close",
          shift: 0,
          optimizableFields: mapOpt(["htfEma", "period"]),
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
          overboughtLevel: ema.rsiShortMin,
          oversoldLevel: ema.rsiLongMax,
          signalMode: "candle_close",
          optimizableFields: mapOpt(
            ["rsiPeriod", "period"],
            ["rsiLongMax", "oversoldLevel"],
            ["rsiShortMin", "overboughtLevel"]
          ),
          _filterRole: "rsi-confirm",
          _rsiLongMax: ema.rsiLongMax,
          _rsiShortMin: ema.rsiShortMin,
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
        optimizableFields: mapOpt(
          ["rangePeriod", "lookbackCandles"],
          ["bufferPips", "bufferPips"],
          ["minRangePips", "minRangePips"],
          ["maxRangePips", "maxRangePips"]
        ),
      })
    );
    // HTF trend filter
    if (rb.htfTrendFilter) {
      virtualNodes.push(
        vNode("htf-ema", "moving-average", {
          label: `HTF EMA(${rb.htfEma})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: rb.htfTimeframe ?? "H4",
          period: rb.htfEma,
          method: "EMA",
          signalMode: "candle_close",
          shift: 0,
          optimizableFields: mapOpt(["htfEma", "period"]),
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
          ["oversoldLevel", "oversoldLevel"]
        ),
      })
    );
    // Trend filter: price above/below EMA
    if (rsi.trendFilter) {
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
          optimizableFields: mapOpt(["trendEma", "period"]),
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
        optimizableFields: mapOpt(["trendEma", "period"]),
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
          ["rsiPullbackLevel", "overboughtLevel"]
        ),
      })
    );
    // ADX trend strength filter
    if (tp.useAdxFilter) {
      virtualNodes.push(
        vNode("adx-filter", "adx", {
          label: `ADX(${tp.adxPeriod})`,
          category: "indicator",
          indicatorType: "adx",
          timeframe: tpTf,
          period: tp.adxPeriod,
          trendLevel: tp.adxThreshold,
          signalMode: "candle_close",
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
          ["macdSignal", "signalPeriod"]
        ),
      })
    );
    // HTF trend filter
    if (macd.htfTrendFilter) {
      virtualNodes.push(
        vNode("htf-ema", "moving-average", {
          label: `HTF EMA(${macd.htfEma})`,
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: macd.htfTimeframe ?? "H4",
          period: macd.htfEma,
          method: "EMA",
          signalMode: "candle_close",
          shift: 0,
          optimizableFields: mapOpt(["htfEma", "period"]),
          _filterRole: "htf-trend",
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
    maxLot: 10,
    optimizableFields: mapOpt(["riskPercent", "riskPercent"]),
  };

  if (direction === "BUY" || direction === "BOTH") {
    virtualNodes.push(
      vNode("buy", "place-buy", {
        label: "Place Buy",
        category: "entry",
        tradingType: "place-buy",
        ...sizingData,
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
        ["slAtrPeriod", "atrPeriod"]
      ),
    })
  );

  // Create TP node (always R-multiple)
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
  }
  if (direction === "SELL" || direction === "BOTH") {
    virtualEdges.push(
      { id: `${baseId}__e-sell-sl`, source: `${baseId}__sell`, target: `${baseId}__sl` },
      { id: `${baseId}__e-sell-tp`, source: `${baseId}__sell`, target: `${baseId}__tp` }
    );
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

export function generateMQL5Code(
  buildJson: BuildJsonSchema,
  projectName: string,
  description?: string
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
    description: description ?? "",
    magicNumber: buildJson.settings?.magicNumber ?? 123456,
    comment: buildJson.settings?.comment ?? "AlgoStudio EA",
    maxOpenTrades: buildJson.settings?.maxOpenTrades ?? 1,
    allowHedging: buildJson.settings?.allowHedging ?? false,
    maxBuyPositions: buildJson.settings?.maxBuyPositions ?? buildJson.settings?.maxOpenTrades ?? 1,
    maxSellPositions:
      buildJson.settings?.maxSellPositions ?? buildJson.settings?.maxOpenTrades ?? 1,
    conditionMode: buildJson.settings?.conditionMode ?? "AND",
    maxTradesPerDay: buildJson.settings?.maxTradesPerDay ?? 0,
    maxDailyProfitPercent: buildJson.settings?.maxDailyProfitPercent ?? 0,
    maxDailyLossPercent: buildJson.settings?.maxDailyLossPercent ?? 0,
  };

  const descValue = `"${sanitizeMQL5String(projectName)}"`;

  const code: GeneratedCode = {
    inputs: [
      {
        name: "InpMagicNumber",
        type: "int",
        value: ctx.magicNumber,
        comment: "Magic Number",
        isOptimizable: true,
        group: "General Settings",
      },
      {
        name: "InpStrategyDescription",
        type: "string",
        value: descValue,
        comment: "Strategy Description (shown on chart)",
        isOptimizable: false,
        group: "General Settings",
      },
      {
        name: "InpTradeComment",
        type: "string",
        value: `"${sanitizeMQL5String(ctx.comment || ctx.description || ctx.projectName)}"`,
        comment: "Trade Order Comment",
        isOptimizable: false,
        group: "General Settings",
      },
      {
        name: "InpMaxSlippage",
        type: "int",
        value: 10,
        comment: "Max Slippage (points)",
        isOptimizable: false,
        group: "Risk Management",
      },
    ],
    globalVariables: ["int _pipFactor = 10; // 10 for 5/3-digit brokers, 1 for 4/2-digit"],
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
  ]);
  const tradeManagementTypeSet = new Set([
    "breakeven-stop",
    "trailing-stop",
    "partial-close",
    "lock-profit",
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
    } else if (tradeManagementTypeSet.has(nodeType) || "managementType" in data) {
      tradeManagementNodes.push(n);
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
        name: "InpATRPeriod",
        type: "int",
        value: atrPeriod,
        comment: "ATR Period",
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
    code.onTick.push(`//--- Volatility filter (ATR)`);
    code.onTick.push(`{`);
    code.onTick.push(`   double atrBuf[];`);
    code.onTick.push(`   ArraySetAsSeries(atrBuf, true);`);
    code.onTick.push(`   int atrHandle = iATR(_Symbol, ${atrTf}, InpATRPeriod);`);
    code.onTick.push(
      `   if(atrHandle != INVALID_HANDLE && CopyBuffer(atrHandle, 0, 0, 1, atrBuf) == 1)`
    );
    code.onTick.push(`   {`);
    code.onTick.push(`      double atrPips = atrBuf[0] / (_Point * _pipFactor);`);
    code.onTick.push(`      if(InpMinATRPips > 0 && atrPips < InpMinATRPips) return;`);
    code.onTick.push(`      if(InpMaxATRPips > 0 && atrPips > InpMaxATRPips) return;`);
    code.onTick.push(`   }`);
    code.onTick.push(`}`);
  }

  // Generate equity filter code (daily drawdown)
  const equityNodes = maxSpreadNodes.filter(
    (n) => (n.data as { filterType?: string }).filterType === "equity-filter"
  );
  if (equityNodes.length > 0) {
    const eNode = equityNodes[0];
    const eData = eNode.data as EquityFilterNodeData;
    const maxDD = eData.maxDrawdownPercent ?? 5;
    code.inputs.push({
      name: "InpMaxDailyDD",
      type: "double",
      value: maxDD,
      comment: "Max Daily Drawdown (%)",
      isOptimizable: isFieldOptimizable(eNode, "maxDrawdownPercent"),
      group: "Equity Filter",
    });
    code.globalVariables.push("double g_dayStartBalance = 0;");
    code.globalVariables.push("int    g_lastDay = 0;");
    code.onTick.push(`//--- Equity filter (daily drawdown)`);
    code.onTick.push(`{`);
    code.onTick.push(`   MqlDateTime dt;`);
    code.onTick.push(`   TimeCurrent(dt);`);
    code.onTick.push(`   if(dt.day != g_lastDay)`);
    code.onTick.push(`   {`);
    code.onTick.push(`      g_dayStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);`);
    code.onTick.push(`      g_lastDay = dt.day;`);
    code.onTick.push(`   }`);
    code.onTick.push(`   if(g_dayStartBalance > 0)`);
    code.onTick.push(`   {`);
    code.onTick.push(
      `      double ddPercent = (g_dayStartBalance - AccountInfoDouble(ACCOUNT_EQUITY)) / g_dayStartBalance * 100.0;`
    );
    code.onTick.push(`      if(ddPercent >= InpMaxDailyDD)`);
    code.onTick.push(`         return;`);
    code.onTick.push(`   }`);
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
    const minBefore = nfData.minutesBefore ?? 30;
    const minAfter = nfData.minutesAfter ?? 30;
    const highImpact = nfData.highImpact ?? true;
    const mediumImpact = nfData.mediumImpact ?? true;
    const lowImpact = nfData.lowImpact ?? false;
    const closePositions = nfData.closePositions ?? false;

    // Inputs
    code.inputs.push(
      {
        name: "InpNewsMinBefore",
        type: "int",
        value: minBefore,
        comment: "Minutes Before News",
        isOptimizable: isFieldOptimizable(nfNode, "minutesBefore"),
        group: "News Filter",
      },
      {
        name: "InpNewsMinAfter",
        type: "int",
        value: minAfter,
        comment: "Minutes After News",
        isOptimizable: isFieldOptimizable(nfNode, "minutesAfter"),
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
        name: "InpExportNewsData",
        type: "bool",
        value: false,
        comment: "Export News History (run once on live)",
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

    // OnInit
    code.onInit.push(`   g_isTesting = (bool)MQLInfoInteger(MQL_TESTER);`);
    code.onInit.push(`   g_baseCurrency = SymbolInfoString(_Symbol, SYMBOL_CURRENCY_BASE);`);
    code.onInit.push(`   g_quoteCurrency = SymbolInfoString(_Symbol, SYMBOL_CURRENCY_PROFIT);`);
    code.onInit.push(``);
    code.onInit.push(`   if(InpExportNewsData && !g_isTesting)`);
    code.onInit.push(`   {`);
    code.onInit.push(`      ExportNewsHistory();`);
    code.onInit.push(
      `      Print("News history exported. Set ExportNewsData=false and restart.");`
    );
    code.onInit.push(`   }`);
    code.onInit.push(``);
    code.onInit.push(`   if(g_isTesting)`);
    code.onInit.push(`   {`);
    code.onInit.push(`      if(!LoadNewsFromCSV())`);
    code.onInit.push(
      `         Print("WARNING: ea_builder_news.csv not found in Common Files. Run EA on live chart with ExportNewsData=true first.");`
    );
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

    code.helperFunctions.push(`bool LoadNewsFromCSV()`);
    code.helperFunctions.push(`{`);
    code.helperFunctions.push(
      `   int handle = FileOpen("ea_builder_news.csv", FILE_READ|FILE_CSV|FILE_COMMON, ',');`
    );
    code.helperFunctions.push(`   if(handle == INVALID_HANDLE) return false;`);
    code.helperFunctions.push(`   ArrayResize(g_newsEvents, 0);`);
    code.helperFunctions.push(`   g_newsCount = 0;`);
    code.helperFunctions.push(
      `   FileReadString(handle); FileReadString(handle); FileReadString(handle);`
    );
    code.helperFunctions.push(`   while(!FileIsEnding(handle))`);
    code.helperFunctions.push(`   {`);
    code.helperFunctions.push(`      string dtStr = FileReadString(handle);`);
    code.helperFunctions.push(`      string impStr = FileReadString(handle);`);
    code.helperFunctions.push(`      string cur = FileReadString(handle);`);
    code.helperFunctions.push(`      if(StringLen(dtStr) == 0) break;`);
    code.helperFunctions.push(
      `      if(cur != g_baseCurrency && cur != g_quoteCurrency) continue;`
    );
    code.helperFunctions.push(`      int imp = (int)StringToInteger(impStr);`);
    code.helperFunctions.push(
      `      if((imp==1 && !InpNewsLow) || (imp==2 && !InpNewsMedium) || (imp==3 && !InpNewsHigh)) continue;`
    );
    code.helperFunctions.push(`      int idx = g_newsCount++;`);
    code.helperFunctions.push(`      ArrayResize(g_newsEvents, g_newsCount, 1000);`);
    code.helperFunctions.push(`      g_newsEvents[idx].time = StringToTime(dtStr);`);
    code.helperFunctions.push(`      g_newsEvents[idx].importance = imp;`);
    code.helperFunctions.push(`   }`);
    code.helperFunctions.push(`   FileClose(handle);`);
    code.helperFunctions.push(`   Print("Loaded ", g_newsCount, " news events from CSV");`);
    code.helperFunctions.push(`   return g_newsCount > 0;`);
    code.helperFunctions.push(`}`);
    code.helperFunctions.push(``);

    code.helperFunctions.push(`void ExportNewsHistory()`);
    code.helperFunctions.push(`{`);
    code.helperFunctions.push(`   MqlCalendarValue values[];`);
    code.helperFunctions.push(`   datetime from = D'2010.01.01';`);
    code.helperFunctions.push(`   datetime to = TimeCurrent();`);
    code.helperFunctions.push(
      `   if(!CalendarValueHistory(values, from, to)) { Print("Calendar export failed"); return; }`
    );
    code.helperFunctions.push(
      `   int handle = FileOpen("ea_builder_news.csv", FILE_WRITE|FILE_CSV|FILE_COMMON, ',');`
    );
    code.helperFunctions.push(
      `   if(handle == INVALID_HANDLE) { Print("Cannot create CSV file"); return; }`
    );
    code.helperFunctions.push(`   FileWrite(handle, "datetime", "importance", "currency");`);
    code.helperFunctions.push(`   for(int i = 0; i < ArraySize(values); i++)`);
    code.helperFunctions.push(`   {`);
    code.helperFunctions.push(`      MqlCalendarEvent event;`);
    code.helperFunctions.push(`      if(!CalendarEventById(values[i].event_id, event)) continue;`);
    code.helperFunctions.push(`      MqlCalendarCountry country;`);
    code.helperFunctions.push(
      `      if(!CalendarCountryById(event.country_id, country)) continue;`
    );
    code.helperFunctions.push(`      if((int)event.importance < 1) continue;`);
    code.helperFunctions.push(
      `      FileWrite(handle, TimeToString(values[i].time, TIME_DATE|TIME_MINUTES),`
    );
    code.helperFunctions.push(`               (int)event.importance, country.currency);`);
    code.helperFunctions.push(`   }`);
    code.helperFunctions.push(`   FileClose(handle);`);
    code.helperFunctions.push(
      `   Print("Exported ", ArraySize(values), " calendar events to ea_builder_news.csv");`
    );
    code.helperFunctions.push(`}`);
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
  if (hasBuy) {
    const skipBuyLot =
      isRangeBreakoutOnly &&
      (placeBuyNodes[0].data as Record<string, unknown>).method === "RISK_PERCENT";
    generatePlaceBuyCode(placeBuyNodes[0], code, skipBuyLot);
  }
  if (hasSell) {
    const skipSellLot =
      isRangeBreakoutOnly &&
      (placeSellNodes[0].data as Record<string, unknown>).method === "RISK_PERCENT";
    generatePlaceSellCode(placeSellNodes[0], code, skipSellLot);
  }

  // Generate close-at-time code BEFORE entry logic so positions are closed before new orders
  for (const node of buildJson.nodes) {
    if (!("entryType" in node.data) || node.data.entryType !== "range-breakout") continue;
    const rb = node.data as RangeBreakoutEntryData;
    if (!rb.closeAtTime) continue;
    const h = rb.closeAtHour ?? 17;
    const m = rb.closeAtMinute ?? 0;
    const closeMinutes = h * 60 + m;
    const useServer = rb.useServerTime ?? true;
    const timeFunc = useServer ? "TimeCurrent()" : "TimeGMT()";
    const timeLabel = useServer ? "Server time" : "GMT";
    code.onTick.push("");
    code.onTick.push(
      `//--- Close all positions at ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} (${timeLabel})`
    );
    code.onTick.push("{");
    const needsDecl = !code.onTick.some((l) => l.includes("MqlDateTime closeTimeDt;"));
    if (needsDecl) {
      code.onTick.push(`   MqlDateTime closeTimeDt;`);
      code.onTick.push(`   TimeToStruct(${timeFunc}, closeTimeDt);`);
      code.onTick.push(`   int closeMinutes = closeTimeDt.hour * 60 + closeTimeDt.min;`);
    }
    code.onTick.push(`   if(closeMinutes >= ${closeMinutes})`);
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
    hasSell ? placeSellNodes[0] : undefined
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
    generateTradeManagementCode(node, indicatorNodes, code);
  });

  // Assemble final code (array join avoids repeated string allocation)
  const parts = [
    generateFileHeader(ctx),
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
