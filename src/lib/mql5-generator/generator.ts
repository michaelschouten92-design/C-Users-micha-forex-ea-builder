// Main MQL5 Code Generator — orchestrates modular generators

import type { BuildJsonSchema, BuilderNode, BuilderEdge } from "@/types/builder";

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

export function generateMQL5Code(buildJson: BuildJsonSchema, projectName: string): string {
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
  const connectedNodeIds = getConnectedNodeIds(buildJson.nodes, buildJson.edges, [
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
  const positionSizeNodes: BuilderNode[] = [];

  for (const n of buildJson.nodes) {
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
      nodeType === "position-size" ||
      ("tradingType" in data && data.tradingType === "position-size")
    ) {
      positionSizeNodes.push(n);
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

  // If a Position Size node exists, override buy/sell sizing data
  if (positionSizeNodes.length > 0) {
    const psData = positionSizeNodes[0].data as import("@/types/builder").PositionSizeNodeData;
    for (const buyNode of placeBuyNodes) {
      const d = buyNode.data as import("@/types/builder").PlaceBuyNodeData;
      d.method = psData.method;
      d.fixedLot = psData.fixedLot;
      d.riskPercent = psData.riskPercent;
      d.minLot = psData.minLot;
      d.maxLot = psData.maxLot;
    }
    for (const sellNode of placeSellNodes) {
      const d = sellNode.data as import("@/types/builder").PlaceSellNodeData;
      d.method = psData.method;
      d.fixedLot = psData.fixedLot;
      d.riskPercent = psData.riskPercent;
      d.minLot = psData.minLot;
      d.maxLot = psData.maxLot;
    }
  }

  // Generate position sizing code for buy/sell (only if connected)
  if (hasBuy) {
    generatePlaceBuyCode(placeBuyNodes[0], code);
  }
  if (hasSell) {
    generatePlaceSellCode(placeSellNodes[0], code);
  }

  // Generate SL/TP code (only if connected, otherwise use 0)
  if (hasStopLoss) {
    generateStopLossCode(stopLossNodes[0], indicatorNodes, buildJson.edges, code);
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
    generateCloseConditionCode(ccNode, indicatorNodes, priceActionNodes, buildJson.edges, code);
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
