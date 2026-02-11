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
} from "@/types/builder";

import { type GeneratorContext, type GeneratedCode } from "./types";

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

import { sanitizeName, isFieldOptimizable } from "./generators/shared";
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
    virtualNodes.push(
      vNode("ma-fast", "moving-average", {
        label: `Fast EMA(${ema.fastEma})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: emaTf,
        period: ema.fastEma,
        method: "EMA",
        signalMode: "candle_close",
        shift: 0,
        optimizableFields: mapOpt(["fastEma", "period"]),
        _entryStrategyType: "ema-crossover",
        _entryStrategyId: baseId,
        _role: "fast",
      }),
      vNode("ma-slow", "moving-average", {
        label: `Slow EMA(${ema.slowEma})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: emaTf,
        period: ema.slowEma,
        method: "EMA",
        signalMode: "candle_close",
        shift: 0,
        optimizableFields: mapOpt(["slowEma", "period"]),
        _entryStrategyType: "ema-crossover",
        _entryStrategyId: baseId,
        _role: "slow",
      })
    );
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
        bufferPips: 2,
        minRangePips: 10,
        maxRangePips: 0,
        useServerTime: rb.useServerTime ?? true,
        optimizableFields: mapOpt(["rangePeriod", "lookbackCandles"]),
      })
    );
  } else if (d.entryType === "rsi-reversal") {
    const rsi = d as RSIReversalEntryData;
    virtualNodes.push(
      vNode("rsi", "rsi", {
        label: `RSI(${rsi.rsiPeriod})`,
        category: "indicator",
        indicatorType: "rsi",
        timeframe: rsi.timeframe ?? "H1",
        period: rsi.rsiPeriod,
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
  } else if (d.entryType === "trend-pullback") {
    const tp = d as TrendPullbackEntryData;
    const tpTf = tp.timeframe ?? "H1";
    // Trend EMA for direction
    virtualNodes.push(
      vNode("ma-trend", "moving-average", {
        label: `Trend EMA(${tp.trendEma})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: tpTf,
        period: tp.trendEma,
        method: "EMA",
        signalMode: "candle_close",
        shift: 0,
        optimizableFields: mapOpt(["trendEma", "period"]),
      }),
      // RSI for pullback detection
      vNode("rsi-pullback", "rsi", {
        label: `Pullback RSI(${tp.pullbackRsiPeriod})`,
        category: "indicator",
        indicatorType: "rsi",
        timeframe: tpTf,
        period: tp.pullbackRsiPeriod,
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
  } else if (d.entryType === "macd-crossover") {
    const macd = d as MACDCrossoverEntryData;
    virtualNodes.push(
      vNode("macd", "macd", {
        label: `MACD(${macd.macdFast},${macd.macdSlow},${macd.macdSignal})`,
        category: "indicator",
        indicatorType: "macd",
        timeframe: macd.timeframe ?? "H1",
        fastPeriod: macd.macdFast,
        slowPeriod: macd.macdSlow,
        signalPeriod: macd.macdSignal,
        signalMode: "candle_close",
        optimizableFields: mapOpt(
          ["macdFast", "fastPeriod"],
          ["macdSlow", "slowPeriod"],
          ["macdSignal", "signalPeriod"]
        ),
      })
    );
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
      atrPeriod: 14,
      optimizableFields: mapOpt(
        ["slFixedPips", "fixedPips"],
        ["slPercent", "slPercent"],
        ["slAtrMultiplier", "atrMultiplier"]
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

export function generateMQL5Code(buildJson: BuildJsonSchema, projectName: string): string {
  // Preprocess: decompose entry strategy composite blocks into virtual primitive nodes
  const decomposed = decomposeEntryStrategies(buildJson.nodes, buildJson.edges);
  const processedBuildJson: BuildJsonSchema = {
    ...buildJson,
    nodes: decomposed.nodes,
    edges: decomposed.edges,
  };

  const ctx: GeneratorContext = {
    projectName: sanitizeName(projectName),
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
        name: "InpMaxSlippage",
        type: "int",
        value: 10,
        comment: "Max Slippage (points)",
        isOptimizable: false,
        group: "Risk Management",
      },
    ],
    globalVariables: [],
    onInit: [],
    onDeinit: [],
    onTick: [],
    helperFunctions: [],
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
  if (maxSpreadNodes.length > 0) {
    const spreadNode = maxSpreadNodes[0];
    const spreadPips = (spreadNode.data as { maxSpreadPips: number }).maxSpreadPips ?? 30;
    code.inputs.push({
      name: "InpMaxSpread",
      type: "int",
      value: spreadPips * 10,
      comment: "Max Spread (points)",
      isOptimizable: isFieldOptimizable(spreadNode, "maxSpreadPips"),
      group: "Risk Management",
    });
    code.onTick.push(`//--- Spread filter`);
    code.onTick.push(`{`);
    code.onTick.push(`   int currentSpread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);`);
    code.onTick.push(`   if(currentSpread > InpMaxSpread)`);
    code.onTick.push(`      return;`);
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

  // Generate position sizing code for buy/sell (after SL/TP so hasDirectionalSL is available)
  if (hasBuy) {
    generatePlaceBuyCode(placeBuyNodes[0], code);
  }
  if (hasSell) {
    generatePlaceSellCode(placeSellNodes[0], code);
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

  // Generate close-at-time code from entry strategy blocks
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
    // Ensure MqlDateTime is available
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
    generateOnTick(ctx, code.onTick),
    generateHelperFunctions(ctx),
    code.helperFunctions.join("\n\n"),
  ];

  return parts.join("");
}
