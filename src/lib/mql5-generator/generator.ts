// Main MQL5 Code Generator — orchestrates modular generators

import type {
  BuildJsonSchema,
  BuilderNode,
  BuilderEdge,
  BuilderNodeData,
  PlaceBuyNodeData,
  VolatilityFilterNodeData,
  FridayCloseFilterNodeData,
  NewsFilterNodeData,
  VolumeFilterNodeData,
} from "@/types/builder";

import { type GeneratorContext, type GeneratedCode, getTimeframeEnum } from "./types";

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
  generateStopLossFromBuySell,
  generateTakeProfitFromBuySell,
  generateEntryLogic,
  generateTimeExitCode,
  generateGridPyramidCode,
} from "./generators/trading";
import { generateTradeManagementCode } from "./generators/trade-management";
import { generateCloseConditionCode } from "./generators/close-conditions";
import { generateTelemetryCode, type TelemetryConfig } from "./generators/telemetry";
import { transformCodeForMultiPair } from "./generators/multi-pair";

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

// Build a const string array with strategy summary lines for the chart overlay.
function buildStrategyOverlayArray(nodes: BuilderNode[], ctx: GeneratorContext): string {
  const lines: string[] = [];

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
    }
  }

  // Default: no timing node = 24/5
  if (!nodes.some((n) => n.type === "trading-session" || n.type === "custom-times")) {
    lines.push("Session: 24/5");
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
    symbolVar: buildJson.settings?.multiPair?.enabled ? "tradeSym" : "_Symbol",
    multiPairEnabled: buildJson.settings?.multiPair?.enabled ?? false,
    maxPositionsPerPair: buildJson.settings?.multiPair?.maxPositionsPerPair ?? 1,
    maxTotalPositions: buildJson.settings?.multiPair?.maxTotalPositions ?? 10,
    correlationFilter: buildJson.settings?.multiPair?.correlationFilter ?? false,
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
  const connectedNodeIds = getConnectedNodeIds(buildJson.nodes, buildJson.edges, [
    "trading-session",
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
    "ichimoku",
    "custom-indicator",
    "obv",
    "vwap",
    "bb-squeeze",
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
    "order-block",
    "fair-value-gap",
    "market-structure",
  ]);

  const indicatorNodes: BuilderNode[] = [];
  const placeBuyNodes: BuilderNode[] = [];
  const placeSellNodes: BuilderNode[] = [];
  const timingNodes: BuilderNode[] = [];
  const tradeManagementNodes: BuilderNode[] = [];
  const priceActionNodes: BuilderNode[] = [];
  const closeConditionNodes: BuilderNode[] = [];
  const timeExitNodes: BuilderNode[] = [];
  const gridPyramidNodes: BuilderNode[] = [];
  const maxSpreadNodes: BuilderNode[] = [];

  for (const n of buildJson.nodes) {
    const nodeType = n.type as string;
    const data = n.data;
    const connected = isConnected(n);

    // Max spread filter nodes (always included regardless of connection)
    if (nodeType === "max-spread" || "filterType" in data) {
      maxSpreadNodes.push(n);
      continue;
    }

    // Timing nodes (always included regardless of connection)
    if (nodeType === "trading-session" || nodeType === "custom-times" || "timingType" in data) {
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
  } else {
    code.onTick.push("bool isTradingTime = true;");
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
    const minPips = vData.minAtrPips ?? 0;
    const maxPips = vData.maxAtrPips ?? 50;
    code.inputs.push(
      {
        name: "InpVolATRTimeframe",
        type: "ENUM_AS_TIMEFRAMES",
        value: getTimeframeEnum(vData.atrTimeframe ?? "H1"),
        comment: "ATR Timeframe (Volatility Filter)",
        isOptimizable: isFieldOptimizable(vNode, "atrTimeframe"),
        group: "Volatility Filter",
      },
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
    code.onInit.push(
      `volATRHandle = iATR(_Symbol, (ENUM_TIMEFRAMES)InpVolATRTimeframe, InpVolATRPeriod);`
    );
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

    code.inputs.push(
      {
        name: "InpVolFilterTimeframe",
        type: "ENUM_AS_TIMEFRAMES",
        value: getTimeframeEnum(vfData.timeframe ?? "H1"),
        comment: "Volume Filter Timeframe",
        isOptimizable: isFieldOptimizable(vfNode, "timeframe"),
        group: "Volume Filter",
      },
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
    code.onTick.push(
      `   long curVol = iVolume(_Symbol, (ENUM_TIMEFRAMES)InpVolFilterTimeframe, 1);`
    );
    code.onTick.push(`   double sumVol = 0;`);
    code.onTick.push(`   for(int v = 2; v <= InpVolFilterPeriod + 1; v++)`);
    code.onTick.push(
      `      sumVol += (double)iVolume(_Symbol, (ENUM_TIMEFRAMES)InpVolFilterTimeframe, v);`
    );
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
  const slTpSource = placeBuyNodes[0] ?? placeSellNodes[0];
  if (slTpSource) {
    const slTpData = slTpSource.data as PlaceBuyNodeData;
    generateStopLossFromBuySell(
      slTpData,
      indicatorNodes,
      buildJson.edges,
      code,
      priceActionNodes,
      slTpSource
    );
  } else {
    code.onTick.push("double slPips = 0;");
  }

  if (slTpSource) {
    const tpData = slTpSource.data as PlaceBuyNodeData;
    generateTakeProfitFromBuySell(tpData, code, slTpSource);
  } else {
    code.onTick.push("double tpPips = 0;");
  }

  // Determine if range breakout is the sole entry mechanism (lot sizing handled by pending orders)
  const isRangeBreakoutOnly =
    priceActionNodes.some(
      (n) => "priceActionType" in n.data && n.data.priceActionType === "range-breakout"
    ) &&
    indicatorNodes.filter((n) => {
      const d = n.data as Record<string, unknown>;
      return !d._filterRole;
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
    buildJson.edges
  );

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

  // Multi-Pair: transform generated code for multi-symbol trading
  // Must run after all sub-generators but before final assembly
  if (ctx.multiPairEnabled && buildJson.settings?.multiPair) {
    transformCodeForMultiPair(buildJson.settings.multiPair, code, ctx);
  }

  // News filter setup instructions (only when news filter is used)
  const newsSetupGuide =
    newsFilterNodes.length > 0
      ? `//+------------------------------------------------------------------+
//| NEWS FILTER — HOW IT WORKS                                       |
//+------------------------------------------------------------------+
//| This EA uses a News Filter that avoids trading around economic    |
//| news events.                                                      |
//|                                                                   |
//| LIVE TRADING:                                                     |
//|   The EA uses the MQL5 Calendar API to fetch upcoming news        |
//|   events in real-time. No setup required.                         |
//|                                                                   |
//| BACKTESTING:                                                      |
//|   News data is embedded in this EA at export time. The EA         |
//|   detects Strategy Tester mode and uses the embedded data.        |
//|   To refresh the news calendar, re-export the EA.                 |
//|                                                                   |
//| News events are filtered by your symbol's base and quote          |
//| currencies automatically.                                         |
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
