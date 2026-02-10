// Main MQL5 Code Generator — orchestrates modular generators

import type {
  BuildJsonSchema,
  BuilderNode,
  BuilderEdge,
  BuilderNodeData,
  EMACrossoverEntryData,
  RSIReversalEntryData,
  RangeBreakoutEntryData,
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

import { sanitizeName } from "./generators/shared";
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

  // Find all starting nodes (timing nodes)
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

// Decompose entry strategy composite nodes into virtual primitive nodes
function expandEntryStrategy(node: BuilderNode): { nodes: BuilderNode[]; edges: BuilderEdge[] } {
  const d = node.data as EntryStrategyNodeData;
  const baseId = node.id;
  const virtualNodes: BuilderNode[] = [];
  const virtualEdges: BuilderEdge[] = [];

  // Determine direction
  const wantBuy = d.direction === "BOTH" || d.direction === "BUY_ONLY";
  const wantSell = d.direction === "BOTH" || d.direction === "SELL_ONLY";

  // Create indicator/priceaction nodes based on entry type
  if (d.entryType === "ema-crossover") {
    const ema = d as EMACrossoverEntryData;
    virtualNodes.push({
      id: `${baseId}__ma-fast`,
      type: "moving-average",
      position: node.position,
      data: {
        label: `Fast EMA(${ema.fastPeriod})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: ema.timeframe,
        period: ema.fastPeriod,
        method: "EMA",
        signalMode: ema.signalMode,
        shift: 0,
      } as BuilderNodeData,
    });
    virtualNodes.push({
      id: `${baseId}__ma-slow`,
      type: "moving-average",
      position: node.position,
      data: {
        label: `Slow EMA(${ema.slowPeriod})`,
        category: "indicator",
        indicatorType: "moving-average",
        timeframe: ema.timeframe,
        period: ema.slowPeriod,
        method: "EMA",
        signalMode: ema.signalMode,
        shift: 0,
      } as BuilderNodeData,
    });
  } else if (d.entryType === "rsi-reversal") {
    const rsi = d as RSIReversalEntryData;
    virtualNodes.push({
      id: `${baseId}__rsi`,
      type: "rsi",
      position: node.position,
      data: {
        label: `RSI(${rsi.period})`,
        category: "indicator",
        indicatorType: "rsi",
        timeframe: rsi.timeframe,
        period: rsi.period,
        overboughtLevel: rsi.overboughtLevel,
        oversoldLevel: rsi.oversoldLevel,
        signalMode: rsi.signalMode,
      } as BuilderNodeData,
    });
  } else if (d.entryType === "range-breakout") {
    const rb = d as RangeBreakoutEntryData;
    virtualNodes.push({
      id: `${baseId}__rb`,
      type: "range-breakout",
      position: node.position,
      data: {
        label: "Range Breakout",
        category: "priceaction",
        priceActionType: "range-breakout",
        timeframe: rb.timeframe,
        rangeType: rb.rangeType,
        lookbackCandles: rb.lookbackCandles,
        rangeSession: rb.rangeSession,
        sessionStartHour: rb.sessionStartHour,
        sessionStartMinute: rb.sessionStartMinute,
        sessionEndHour: rb.sessionEndHour,
        sessionEndMinute: rb.sessionEndMinute,
        breakoutDirection: rb.breakoutDirection,
        entryMode: rb.entryMode,
        bufferPips: rb.bufferPips,
        minRangePips: rb.minRangePips,
        maxRangePips: rb.maxRangePips,
      } as BuilderNodeData,
    });
  }

  // Create buy node
  if (wantBuy) {
    virtualNodes.push({
      id: `${baseId}__buy`,
      type: "place-buy",
      position: node.position,
      data: {
        label: "Place Buy",
        category: "entry",
        tradingType: "place-buy",
        method: d.sizingMethod,
        fixedLot: d.fixedLot,
        riskPercent: d.riskPercent,
        minLot: d.minLot,
        maxLot: d.maxLot,
      } as BuilderNodeData,
    });
  }

  // Create sell node
  if (wantSell) {
    virtualNodes.push({
      id: `${baseId}__sell`,
      type: "place-sell",
      position: node.position,
      data: {
        label: "Place Sell",
        category: "entry",
        tradingType: "place-sell",
        method: d.sizingMethod,
        fixedLot: d.fixedLot,
        riskPercent: d.riskPercent,
        minLot: d.minLot,
        maxLot: d.maxLot,
      } as BuilderNodeData,
    });
  }

  // Create SL node
  virtualNodes.push({
    id: `${baseId}__sl`,
    type: "stop-loss",
    position: node.position,
    data: {
      label: "Stop Loss",
      category: "riskmanagement",
      tradingType: "stop-loss",
      method: d.slMethod,
      fixedPips: d.slFixedPips,
      atrMultiplier: d.slAtrMultiplier,
      atrPeriod: d.slAtrPeriod,
    } as BuilderNodeData,
  });

  // Create TP node
  virtualNodes.push({
    id: `${baseId}__tp`,
    type: "take-profit",
    position: node.position,
    data: {
      label: "Take Profit",
      category: "riskmanagement",
      tradingType: "take-profit",
      method: d.tpMethod,
      fixedPips: d.tpFixedPips,
      riskRewardRatio: d.tpRiskRewardRatio,
      atrMultiplier: d.tpAtrMultiplier,
      atrPeriod: d.tpAtrPeriod,
    } as BuilderNodeData,
  });

  // Create edges: indicators → buy/sell → sl/tp
  const indicatorIds = virtualNodes
    .filter((n) => "indicatorType" in n.data || "priceActionType" in n.data)
    .map((n) => n.id);

  for (const indId of indicatorIds) {
    if (wantBuy) {
      virtualEdges.push({
        id: `${baseId}__e-${indId}-buy`,
        source: indId,
        target: `${baseId}__buy`,
      });
    }
    if (wantSell) {
      virtualEdges.push({
        id: `${baseId}__e-${indId}-sell`,
        source: indId,
        target: `${baseId}__sell`,
      });
    }
  }

  if (wantBuy) {
    virtualEdges.push({
      id: `${baseId}__e-buy-sl`,
      source: `${baseId}__buy`,
      target: `${baseId}__sl`,
    });
    virtualEdges.push({
      id: `${baseId}__e-buy-tp`,
      source: `${baseId}__buy`,
      target: `${baseId}__tp`,
    });
  }
  if (wantSell) {
    virtualEdges.push({
      id: `${baseId}__e-sell-sl`,
      source: `${baseId}__sell`,
      target: `${baseId}__sl`,
    });
    virtualEdges.push({
      id: `${baseId}__e-sell-tp`,
      source: `${baseId}__sell`,
      target: `${baseId}__tp`,
    });
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
    maxSpreadPips: buildJson.settings?.maxSpreadPips ?? 0,
  };

  const code: GeneratedCode = {
    inputs: [
      {
        name: "InpMagicNumber",
        type: "int",
        value: ctx.magicNumber,
        comment: "Magic Number",
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
      {
        name: "InpMaxSpread",
        type: "int",
        value: 0,
        comment: "Max Spread (points, 0=no limit)",
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

  // Helper to check if a node is connected to the strategy
  const isConnected = (node: BuilderNode) => connectedNodeIds.has(node.id);

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

  for (const n of processedBuildJson.nodes) {
    const nodeType = n.type as string;
    const data = n.data;
    const connected = isConnected(n);

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

  // Generate position sizing code for buy/sell (only if connected)
  if (hasBuy) {
    generatePlaceBuyCode(placeBuyNodes[0], code);
  }
  if (hasSell) {
    generatePlaceSellCode(placeSellNodes[0], code);
  }

  // Generate SL/TP code (only if connected, otherwise use 0)
  if (hasStopLoss) {
    generateStopLossCode(stopLossNodes[0], indicatorNodes, processedBuildJson.edges, code);
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

  // Generate entry logic based on connected indicators, price action nodes, and buy/sell nodes
  generateEntryLogic(indicatorNodes, priceActionNodes, hasBuy, hasSell, ctx, code);

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
    generateOnTick(ctx, code.onTick),
    generateHelperFunctions(ctx),
    code.helperFunctions.join("\n\n"),
  ];

  return parts.join("");
}
