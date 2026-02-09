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
import { generateTimingCode, generateMultipleTimingCode } from "./generators/timing";
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

    // Find all edges where current node is the source
    const outgoingEdges = edges.filter((e) => e.source === currentId);
    for (const edge of outgoingEdges) {
      if (!connectedIds.has(edge.target)) {
        queue.push(edge.target);
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

  // Process nodes by type (check both node.type and node.data properties)
  // Only include nodes that are connected to the strategy
  const indicatorTypes = [
    "moving-average",
    "rsi",
    "macd",
    "bollinger-bands",
    "atr",
    "adx",
    "stochastic",
    "cci",
    "williams-r",
    "parabolic-sar",
    "momentum",
    "envelopes",
  ];
  const indicatorNodes = buildJson.nodes.filter(
    (n) =>
      (indicatorTypes.includes(n.type as string) || "indicatorType" in n.data) && isConnected(n)
  );
  const placeBuyNodes = buildJson.nodes.filter(
    (n) =>
      (n.type === "place-buy" || ("tradingType" in n.data && n.data.tradingType === "place-buy")) &&
      isConnected(n)
  );
  const placeSellNodes = buildJson.nodes.filter(
    (n) =>
      (n.type === "place-sell" ||
        ("tradingType" in n.data && n.data.tradingType === "place-sell")) &&
      isConnected(n)
  );
  const stopLossNodes = buildJson.nodes.filter(
    (n) =>
      (n.type === "stop-loss" || ("tradingType" in n.data && n.data.tradingType === "stop-loss")) &&
      isConnected(n)
  );
  const takeProfitNodes = buildJson.nodes.filter(
    (n) =>
      (n.type === "take-profit" ||
        ("tradingType" in n.data && n.data.tradingType === "take-profit")) &&
      isConnected(n)
  );
  const timingNodes = buildJson.nodes.filter(
    (n) =>
      n.type === "trading-session" ||
      n.type === "always" ||
      n.type === "custom-times" ||
      "timingType" in n.data
  );

  // Trade Management nodes (Pro only) - only connected ones
  const tradeManagementTypes = ["breakeven-stop", "trailing-stop", "partial-close", "lock-profit"];
  const tradeManagementNodes = buildJson.nodes.filter(
    (n) =>
      (tradeManagementTypes.includes(n.type as string) || "managementType" in n.data) &&
      isConnected(n)
  );

  // Price Action nodes - only connected ones
  const priceActionTypes = ["candlestick-pattern", "support-resistance", "range-breakout"];
  const priceActionNodes = buildJson.nodes.filter(
    (n) =>
      (priceActionTypes.includes(n.type as string) || "priceActionType" in n.data) && isConnected(n)
  );

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
  const closeConditionNodes = buildJson.nodes.filter(
    (n) =>
      (n.type === "close-condition" ||
        ("tradingType" in n.data && n.data.tradingType === "close-condition")) &&
      isConnected(n)
  );
  closeConditionNodes.forEach((ccNode) => {
    generateCloseConditionCode(ccNode, indicatorNodes, priceActionNodes, buildJson.edges, code);
  });

  // Generate time-based exit code
  const timeExitNodes = buildJson.nodes.filter(
    (n) =>
      (n.type === "time-exit" || ("tradingType" in n.data && n.data.tradingType === "time-exit")) &&
      isConnected(n)
  );
  timeExitNodes.forEach((node) => {
    generateTimeExitCode(node, code);
  });

  // Generate trade management code (Pro only)
  tradeManagementNodes.forEach((node) => {
    generateTradeManagementCode(node, indicatorNodes, code);
  });

  // Assemble final code
  let output = "";
  output += generateFileHeader(ctx);
  output += generateTradeIncludes();
  output += generateInputsSection(code.inputs);
  output += generateGlobalVariablesSection(code.globalVariables);
  output += generateOnInit(ctx, code.onInit);
  output += generateOnDeinit(code.onDeinit);
  output += generateOnTick(ctx, code.onTick);
  output += generateHelperFunctions(ctx);
  output += code.helperFunctions.join("\n\n");

  return output;
}
