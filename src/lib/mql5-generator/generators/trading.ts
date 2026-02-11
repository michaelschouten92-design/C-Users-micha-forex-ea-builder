import type {
  BuilderNode,
  BuilderEdge,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  RangeBreakoutNodeData,
  TimeExitNodeData,
} from "@/types/builder";
import type { GeneratorContext, GeneratedCode } from "../types";
import { getTimeframe } from "../types";
import { createInput, sanitizeMQL5String } from "./shared";

export function generatePlaceBuyCode(node: BuilderNode, code: GeneratedCode): void {
  const data = node.data as PlaceBuyNodeData;

  const group = "Buy Order";
  const orderType = data.orderType ?? "MARKET";

  if (orderType !== "MARKET") {
    code.inputs.push(
      createInput(
        node,
        "pendingOffset",
        "InpBuyPendingOffset",
        "double",
        data.pendingOffset ?? 10,
        "Buy Pending Offset (pips)",
        group
      )
    );
  }

  switch (data.method) {
    case "FIXED_LOT":
      code.inputs.push(
        createInput(
          node,
          "fixedLot",
          "InpBuyLotSize",
          "double",
          data.fixedLot,
          "Buy Lot Size",
          group
        )
      );
      code.onTick.push("double buyLotSize = InpBuyLotSize;");
      break;

    case "RISK_PERCENT":
      code.inputs.push(
        createInput(
          node,
          "riskPercent",
          "InpBuyRiskPercent",
          "double",
          data.riskPercent,
          "Buy Risk %",
          group
        )
      );
      code.onTick.push("double buyLotSize = CalculateLotSize(InpBuyRiskPercent, slPips);");
      break;
  }

  code.inputs.push(
    createInput(node, "minLot", "InpBuyMinLot", "double", data.minLot, "Buy Minimum Lot", group)
  );
  code.inputs.push(
    createInput(node, "maxLot", "InpBuyMaxLot", "double", data.maxLot, "Buy Maximum Lot", group)
  );
  code.onTick.push("buyLotSize = MathMax(InpBuyMinLot, MathMin(InpBuyMaxLot, buyLotSize));");
}

export function generatePlaceSellCode(node: BuilderNode, code: GeneratedCode): void {
  const data = node.data as PlaceSellNodeData;

  const group = "Sell Order";
  const orderType = data.orderType ?? "MARKET";

  if (orderType !== "MARKET") {
    code.inputs.push(
      createInput(
        node,
        "pendingOffset",
        "InpSellPendingOffset",
        "double",
        data.pendingOffset ?? 10,
        "Sell Pending Offset (pips)",
        group
      )
    );
  }

  switch (data.method) {
    case "FIXED_LOT":
      code.inputs.push(
        createInput(
          node,
          "fixedLot",
          "InpSellLotSize",
          "double",
          data.fixedLot,
          "Sell Lot Size",
          group
        )
      );
      code.onTick.push("double sellLotSize = InpSellLotSize;");
      break;

    case "RISK_PERCENT":
      code.inputs.push(
        createInput(
          node,
          "riskPercent",
          "InpSellRiskPercent",
          "double",
          data.riskPercent,
          "Sell Risk %",
          group
        )
      );
      if (code.hasDirectionalSL) {
        code.onTick.push("double sellLotSize = CalculateLotSize(InpSellRiskPercent, slSellPips);");
      } else {
        code.onTick.push("double sellLotSize = CalculateLotSize(InpSellRiskPercent, slPips);");
      }
      break;
  }

  code.inputs.push(
    createInput(node, "minLot", "InpSellMinLot", "double", data.minLot, "Sell Minimum Lot", group)
  );
  code.inputs.push(
    createInput(node, "maxLot", "InpSellMaxLot", "double", data.maxLot, "Sell Maximum Lot", group)
  );
  code.onTick.push("sellLotSize = MathMax(InpSellMinLot, MathMin(InpSellMaxLot, sellLotSize));");
}

export function generateStopLossCode(
  node: BuilderNode,
  indicatorNodes: BuilderNode[],
  edges: BuilderEdge[],
  code: GeneratedCode,
  priceActionNodes: BuilderNode[] = []
): void {
  const data = node.data as StopLossNodeData;
  code.slMethod = data.method;

  const slGroup = "Stop Loss";
  switch (data.method) {
    case "FIXED_PIPS":
      code.inputs.push(
        createInput(
          node,
          "fixedPips",
          "InpStopLoss",
          "double",
          data.fixedPips,
          "Stop Loss (pips)",
          slGroup
        )
      );
      code.onTick.push("double slPips = InpStopLoss * _pipFactor; // Convert to points");
      break;

    case "PERCENT":
      code.inputs.push(
        createInput(
          node,
          "slPercent",
          "InpSLPercent",
          "double",
          ((data as Record<string, unknown>).slPercent as number) ?? 1,
          "Stop Loss (%)",
          slGroup
        )
      );
      code.onTick.push(
        "double slPips = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) * InpSLPercent / 100.0) / _Point;"
      );
      break;

    case "ATR_BASED": {
      const atrTf = getTimeframe(
        (node.data as Record<string, unknown>).atrTimeframe as string | undefined
      );
      code.inputs.push(
        createInput(
          node,
          "atrPeriod",
          "InpATRPeriod",
          "int",
          data.atrPeriod,
          "ATR Period for SL",
          slGroup
        )
      );
      code.inputs.push(
        createInput(
          node,
          "atrMultiplier",
          "InpATRMultiplier",
          "double",
          data.atrMultiplier,
          "ATR Multiplier for SL",
          slGroup
        )
      );
      code.globalVariables.push("int atrHandle = INVALID_HANDLE;");
      code.globalVariables.push("double atrBuffer[];");
      code.onInit.push(`atrHandle = iATR(_Symbol, ${atrTf}, InpATRPeriod);`);
      code.onInit.push(
        'if(atrHandle == INVALID_HANDLE) { Print("Failed to create ATR handle for SL"); return(INIT_FAILED); }'
      );
      code.onDeinit.push("if(atrHandle != INVALID_HANDLE) IndicatorRelease(atrHandle);");
      code.onInit.push("ArraySetAsSeries(atrBuffer, true);");
      code.onTick.push("if(CopyBuffer(atrHandle, 0, 0, 1, atrBuffer) < 1) return;");
      code.onTick.push("double slPips = (atrBuffer[0] / _Point) * InpATRMultiplier;");
      break;
    }

    case "RANGE_OPPOSITE":
      generateRangeOppositeSL(priceActionNodes, code);
      break;

    case "INDICATOR":
      generateIndicatorBasedSL(node, indicatorNodes, edges, code);
      break;
  }
}

function generateRangeOppositeSL(priceActionNodes: BuilderNode[], code: GeneratedCode): void {
  // Find the range-breakout price action node to reference its variables
  const rbIndex = priceActionNodes.findIndex(
    (n) => "priceActionType" in n.data && n.data.priceActionType === "range-breakout"
  );
  const prefix = rbIndex >= 0 ? `pa${rbIndex}` : "pa0";

  code.onTick.push("//--- Range Opposite SL: use range high/low as stop loss");
  code.onTick.push(
    `double slPips = MathMax((SymbolInfoDouble(_Symbol, SYMBOL_ASK) - ${prefix}Low) / _Point, 100);`
  );
  code.onTick.push(
    `double slSellPips = MathMax((${prefix}High - SymbolInfoDouble(_Symbol, SYMBOL_BID)) / _Point, 100);`
  );
  code.hasDirectionalSL = true;
}

function generateIndicatorBasedSL(
  slNode: BuilderNode,
  indicatorNodes: BuilderNode[],
  edges: BuilderEdge[],
  code: GeneratedCode
): void {
  const data = slNode.data as StopLossNodeData;

  // Find connected indicator via indicatorNodeId or edges
  let connectedIndicator: BuilderNode | undefined;

  if (data.indicatorNodeId) {
    connectedIndicator = indicatorNodes.find((n) => n.id === data.indicatorNodeId);
  }

  // Fallback: check edges for connection to SL node (either direction)
  if (!connectedIndicator) {
    const connectedEdge = edges.find((e) => e.target === slNode.id || e.source === slNode.id);
    if (connectedEdge) {
      const otherId =
        connectedEdge.target === slNode.id ? connectedEdge.source : connectedEdge.target;
      connectedIndicator = indicatorNodes.find((n) => n.id === otherId);
    }
  }

  if (!connectedIndicator) {
    // No indicator connected - use default fixed pips with warning
    code.inputs.push({
      name: "InpStopLoss",
      type: "double",
      value: 50,
      comment: "Stop Loss (pips) - No indicator connected",
      isOptimizable: false,
    });
    code.onTick.push(
      "double slPips = InpStopLoss * _pipFactor; // Fallback: no indicator connected"
    );
    return;
  }

  const indIndex = indicatorNodes.indexOf(connectedIndicator);
  const varPrefix = `ind${indIndex}`;
  const indData = connectedIndicator.data;

  if ("indicatorType" in indData) {
    switch (indData.indicatorType) {
      case "bollinger-bands":
        // Use distance from price to opposite Bollinger Band as SL
        code.inputs.push({
          name: "InpBBSLBuffer",
          type: "double",
          value: 5,
          comment: "Additional buffer pips for BB SL",
          isOptimizable: false,
        });
        code.onTick.push("// Indicator-based SL using Bollinger Bands (direction-aware)");
        code.onTick.push("double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
        code.onTick.push(`double bbLower = ${varPrefix}LowerBuffer[0];`);
        code.onTick.push(`double bbUpper = ${varPrefix}UpperBuffer[0];`);
        code.onTick.push("double distToLower = MathAbs(currentPrice - bbLower) / _Point;");
        code.onTick.push("double distToUpper = MathAbs(bbUpper - currentPrice) / _Point;");
        code.onTick.push("// Buy SL: distance to lower band, Sell SL: distance to upper band");
        code.onTick.push(
          "double slPips = MathMax(distToLower + (InpBBSLBuffer * _pipFactor), 100); // Buy direction"
        );
        code.onTick.push(
          "double slSellPips = MathMax(distToUpper + (InpBBSLBuffer * _pipFactor), 100); // Sell direction"
        );
        code.hasDirectionalSL = true;
        break;

      case "moving-average":
        // Use distance from price to MA as SL
        code.inputs.push({
          name: "InpMASLMultiplier",
          type: "double",
          value: 1.5,
          comment: "MA SL distance multiplier",
          isOptimizable: false,
        });
        code.onTick.push("// Indicator-based SL using Moving Average");
        code.onTick.push("double slPips;");
        code.onTick.push("double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
        code.onTick.push(`double maValue = ${varPrefix}Buffer[0];`);
        code.onTick.push("double distToMA = MathAbs(currentPrice - maValue) / _Point;");
        code.onTick.push("slPips = distToMA * InpMASLMultiplier;");
        code.onTick.push("slPips = MathMax(slPips, 100); // Minimum 10 pips SL");
        break;

      case "atr":
        // Use ATR value directly as SL (similar to ATR_BASED but from connected node)
        code.inputs.push({
          name: "InpATRSLMultiplier",
          type: "double",
          value: 1.5,
          comment: "ATR SL multiplier",
          isOptimizable: false,
        });
        code.onTick.push("// Indicator-based SL using ATR");
        code.onTick.push(`double slPips = (${varPrefix}Buffer[0] / _Point) * InpATRSLMultiplier;`);
        break;

      case "adx":
        // Use ATR-style calculation scaled by ADX strength
        code.inputs.push({
          name: "InpADXSLBase",
          type: "double",
          value: 50,
          comment: "Base SL pips when ADX is at trend level",
          isOptimizable: false,
        });
        code.onTick.push("// Indicator-based SL using ADX (scaled by trend strength)");
        code.onTick.push(`double adxValue = ${varPrefix}MainBuffer[0];`);
        code.onTick.push("// Stronger trend = tighter SL, weaker trend = wider SL");
        code.onTick.push("double slMultiplier = 2.0 - (adxValue / 100.0); // Range: 1.0 to 2.0");
        code.onTick.push("double slPips = InpADXSLBase * slMultiplier * _pipFactor;");
        break;

      default:
        // RSI, MACD etc. not typically used for SL - use default
        code.inputs.push({
          name: "InpStopLoss",
          type: "double",
          value: 50,
          comment: "Stop Loss (pips)",
          isOptimizable: false,
        });
        code.onTick.push(
          `double slPips = InpStopLoss * _pipFactor; // ${indData.indicatorType} not suitable for SL calculation`
        );
        break;
    }
  } else {
    // Unknown indicator type
    code.inputs.push({
      name: "InpStopLoss",
      type: "double",
      value: 50,
      comment: "Stop Loss (pips)",
      isOptimizable: false,
    });
    code.onTick.push("double slPips = InpStopLoss * _pipFactor; // Unknown indicator type");
  }
}

export function generateTakeProfitCode(node: BuilderNode, code: GeneratedCode): void {
  const data = node.data as TakeProfitNodeData;

  const tpGroup = "Take Profit";
  switch (data.method) {
    case "FIXED_PIPS":
      code.inputs.push(
        createInput(
          node,
          "fixedPips",
          "InpTakeProfit",
          "double",
          data.fixedPips,
          "Take Profit (pips)",
          tpGroup
        )
      );
      code.onTick.push("double tpPips = InpTakeProfit * _pipFactor; // Convert to points");
      break;

    case "RISK_REWARD":
      code.inputs.push(
        createInput(
          node,
          "riskRewardRatio",
          "InpRiskReward",
          "double",
          data.riskRewardRatio,
          "Risk:Reward Ratio",
          tpGroup
        )
      );
      code.onTick.push("double tpPips = slPips * InpRiskReward;");
      break;

    case "ATR_BASED": {
      code.inputs.push(
        createInput(
          node,
          "atrMultiplier",
          "InpTPATRMultiplier",
          "double",
          data.atrMultiplier,
          "ATR Multiplier for TP",
          tpGroup
        )
      );
      // Check if SL already created an atrHandle; if so, reuse its buffer
      const hasAtrHandle = code.globalVariables.some((v) => v.startsWith("int atrHandle"));
      if (hasAtrHandle) {
        code.onTick.push("double tpPips = (atrBuffer[0] / _Point) * InpTPATRMultiplier;");
      } else {
        // Create a dedicated ATR handle for TP
        code.inputs.push(
          createInput(
            node,
            "atrPeriod",
            "InpTPATRPeriod",
            "int",
            data.atrPeriod,
            "ATR Period for TP",
            tpGroup
          )
        );
        code.globalVariables.push("int tpAtrHandle = INVALID_HANDLE;");
        code.globalVariables.push("double tpAtrBuffer[];");
        code.onInit.push("tpAtrHandle = iATR(_Symbol, PERIOD_CURRENT, InpTPATRPeriod);");
        code.onInit.push(
          'if(tpAtrHandle == INVALID_HANDLE) { Print("Failed to create ATR handle for TP"); return(INIT_FAILED); }'
        );
        code.onDeinit.push("if(tpAtrHandle != INVALID_HANDLE) IndicatorRelease(tpAtrHandle);");
        code.onInit.push("ArraySetAsSeries(tpAtrBuffer, true);");
        code.onTick.push("if(CopyBuffer(tpAtrHandle, 0, 0, 1, tpAtrBuffer) < 1) return;");
        code.onTick.push("double tpPips = (tpAtrBuffer[0] / _Point) * InpTPATRMultiplier;");
      }
      break;
    }
  }
}

export function generateEntryLogic(
  indicatorNodes: BuilderNode[],
  priceActionNodes: BuilderNode[],
  hasBuyNode: boolean,
  hasSellNode: boolean,
  ctx: GeneratorContext,
  code: GeneratedCode,
  buyNode?: BuilderNode,
  sellNode?: BuilderNode
): void {
  code.onTick.push("");
  code.onTick.push("//--- Entry Logic");

  // Track range breakout nodes for pending order generation (set in condition loop below)
  let rangeBreakoutPAIndex = -1;

  const hasConditions = indicatorNodes.length > 0 || priceActionNodes.length > 0;

  if (!hasConditions) {
    code.onTick.push("bool buyCondition = false;");
    code.onTick.push("bool sellCondition = false;");
  } else {
    // Generate conditions based on all indicators and price action
    const buyConditions: string[] = [];
    const sellConditions: string[] = [];

    // Handle EMA Crossover entry strategies (need cross-indicator comparison, not price vs MA)
    const handledIndices = new Set<number>();
    const emaCrossGroups = new Map<string, { fast?: number; slow?: number }>();
    indicatorNodes.forEach((indNode, indIndex) => {
      const d = indNode.data as Record<string, unknown>;
      if (d._entryStrategyType === "ema-crossover" && d._entryStrategyId) {
        const esId = d._entryStrategyId as string;
        if (!emaCrossGroups.has(esId)) emaCrossGroups.set(esId, {});
        const group = emaCrossGroups.get(esId)!;
        if (d._role === "fast") group.fast = indIndex;
        if (d._role === "slow") group.slow = indIndex;
      }
    });
    for (const [, group] of emaCrossGroups) {
      if (group.fast !== undefined && group.slow !== undefined) {
        const fp = `ind${group.fast}`;
        const sp = `ind${group.slow}`;
        // Fast EMA crosses above Slow EMA (bullish crossover)
        buyConditions.push(
          `(DoubleLE(${fp}Buffer[2], ${sp}Buffer[2]) && DoubleGT(${fp}Buffer[1], ${sp}Buffer[1]))`
        );
        // Fast EMA crosses below Slow EMA (bearish crossover)
        sellConditions.push(
          `(DoubleGE(${fp}Buffer[2], ${sp}Buffer[2]) && DoubleLT(${fp}Buffer[1], ${sp}Buffer[1]))`
        );
        handledIndices.add(group.fast);
        handledIndices.add(group.slow);
      }
    }

    // Process filter nodes (HTF trend, RSI confirmation) — these add additional conditions
    indicatorNodes.forEach((indNode, indIndex) => {
      const d = indNode.data as Record<string, unknown>;
      if (d._filterRole === "htf-trend") {
        // Price above EMA = allow buy, below = allow sell
        const vp = `ind${indIndex}`;
        const s = d.signalMode === "candle_close" ? 1 : 0;
        buyConditions.push(
          `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${vp}Buffer[${1 + s}]))`
        );
        sellConditions.push(
          `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${vp}Buffer[${1 + s}]))`
        );
        handledIndices.add(indIndex);
      } else if (d._filterRole === "rsi-confirm") {
        // RSI < longMax for buy, RSI > shortMin for sell
        const vp = `ind${indIndex}`;
        const s = d.signalMode === "candle_close" ? 1 : 0;
        buyConditions.push(`(DoubleLT(${vp}Buffer[${0 + s}], InpRSI${indIndex}Oversold))`);
        sellConditions.push(`(DoubleGT(${vp}Buffer[${0 + s}], InpRSI${indIndex}Overbought))`);
        handledIndices.add(indIndex);
      }
    });

    // Process indicator conditions (skip EMA crossover indicators and filters already handled above)
    indicatorNodes.forEach((indNode, indIndex) => {
      if (handledIndices.has(indIndex)) return;

      const varPrefix = `ind${indIndex}`;
      const indData = indNode.data;
      // Bar offset: candle_close shifts all bar indices by +1 (uses confirmed bars only)
      const s = "signalMode" in indData && indData.signalMode === "candle_close" ? 1 : 0;

      if ("indicatorType" in indData) {
        switch (indData.indicatorType) {
          case "moving-average":
            buyConditions.push(
              `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
            );
            sellConditions.push(
              `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
            );
            break;

          case "rsi":
            buyConditions.push(
              `(DoubleLE(${varPrefix}Buffer[${1 + s}], InpRSI${indIndex}Oversold) && DoubleGT(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Oversold))`
            );
            sellConditions.push(
              `(DoubleGE(${varPrefix}Buffer[${1 + s}], InpRSI${indIndex}Overbought) && DoubleLT(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Overbought))`
            );
            break;

          case "macd":
            buyConditions.push(
              `(DoubleLE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleGT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
            );
            sellConditions.push(
              `(DoubleGE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleLT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
            );
            break;

          case "bollinger-bands":
            buyConditions.push(
              `(DoubleLE(iLow(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}LowerBuffer[${1 + s}]))`
            );
            sellConditions.push(
              `(DoubleGE(iHigh(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}UpperBuffer[${1 + s}]))`
            );
            break;

          case "atr":
            // ATR is non-directional (volatility filter) - rising ATR confirms both buy and sell
            buyConditions.push(
              `(DoubleGT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
            );
            sellConditions.push(
              `(DoubleGT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
            );
            break;

          case "adx":
            buyConditions.push(
              `(DoubleGT(${varPrefix}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel) && DoubleGT(${varPrefix}PlusDIBuffer[${0 + s}], ${varPrefix}MinusDIBuffer[${0 + s}]))`
            );
            sellConditions.push(
              `(DoubleGT(${varPrefix}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel) && DoubleGT(${varPrefix}MinusDIBuffer[${0 + s}], ${varPrefix}PlusDIBuffer[${0 + s}]))`
            );
            break;

          case "stochastic":
            // Buy: %K crosses up from oversold zone
            buyConditions.push(
              `(DoubleLE(${varPrefix}MainBuffer[${1 + s}], InpStoch${indIndex}Oversold) && DoubleGT(${varPrefix}MainBuffer[${0 + s}], InpStoch${indIndex}Oversold))`
            );
            // Sell: %K crosses down from overbought zone
            sellConditions.push(
              `(DoubleGE(${varPrefix}MainBuffer[${1 + s}], InpStoch${indIndex}Overbought) && DoubleLT(${varPrefix}MainBuffer[${0 + s}], InpStoch${indIndex}Overbought))`
            );
            break;

          case "cci":
            buyConditions.push(
              `(DoubleLE(${varPrefix}Buffer[${1 + s}], InpCCI${indIndex}Oversold) && DoubleGT(${varPrefix}Buffer[${0 + s}], InpCCI${indIndex}Oversold))`
            );
            sellConditions.push(
              `(DoubleGE(${varPrefix}Buffer[${1 + s}], InpCCI${indIndex}Overbought) && DoubleLT(${varPrefix}Buffer[${0 + s}], InpCCI${indIndex}Overbought))`
            );
            break;
        }
      }
    });

    // Process price action conditions
    priceActionNodes.forEach((paNode, paIndex) => {
      const varPrefix = `pa${paIndex}`;
      const paData = paNode.data;

      if ("priceActionType" in paData) {
        switch (paData.priceActionType) {
          case "range-breakout": {
            // Don't add to buyConditions/sellConditions — handled via pending orders
            rangeBreakoutPAIndex = paIndex;
            break;
          }

          case "candlestick-pattern": {
            buyConditions.push(`(${varPrefix}BuySignal)`);
            sellConditions.push(`(${varPrefix}SellSignal)`);
            break;
          }

          case "support-resistance": {
            buyConditions.push(`(${varPrefix}NearSupport)`);
            sellConditions.push(`(${varPrefix}NearResistance)`);
            break;
          }
        }
      }
    });

    if (buyConditions.length === 0) buyConditions.push("false");
    if (sellConditions.length === 0) sellConditions.push("false");

    const joiner = ctx.conditionMode === "OR" ? " || " : " && ";
    code.onTick.push(`bool buyCondition = ${buyConditions.join(joiner)};`);
    code.onTick.push(`bool sellCondition = ${sellConditions.join(joiner)};`);
  }

  // When range breakout is the only signal source, skip the market entry block
  const rangeBreakoutOnly =
    rangeBreakoutPAIndex >= 0 &&
    indicatorNodes.filter((n) => {
      const d = n.data as Record<string, unknown>;
      return !d._filterRole && !d._entryStrategyType;
    }).length === 0 &&
    priceActionNodes.every(
      (n) => "priceActionType" in n.data && n.data.priceActionType === "range-breakout"
    );

  // One-trade-per-bar protection (reuse currentBarTime declared in OnTick template)
  code.globalVariables.push("datetime lastEntryBar = 0; // Prevent multiple entries per bar");
  code.onTick.push("");
  code.onTick.push("//--- One-trade-per-bar check");
  code.onTick.push("bool newBar = (currentBarTime != lastEntryBar);");

  // Daily trade limit logic
  const hasDaily = ctx.maxTradesPerDay > 0;
  if (hasDaily) {
    code.globalVariables.push("datetime lastTradeDay = 0; // Track current trading day");
    code.globalVariables.push("int tradesToday = 0; // Daily trade counter");
    code.onTick.push("");
    code.onTick.push("//--- Daily trade limit");
    code.onTick.push("datetime today = iTime(_Symbol, PERIOD_D1, 0);");
    code.onTick.push("if(today != lastTradeDay) { lastTradeDay = today; tradesToday = 0; }");
  }

  // Determine order types from node data
  const buyOrderType = buyNode
    ? ((buyNode.data as PlaceBuyNodeData).orderType ?? "MARKET")
    : "MARKET";
  const sellOrderType = sellNode
    ? ((sellNode.data as PlaceSellNodeData).orderType ?? "MARKET")
    : "MARKET";
  const hasPendingOrders =
    (hasBuyNode && buyOrderType !== "MARKET") || (hasSellNode && sellOrderType !== "MARKET");

  // Skip market entry block when range breakout is the sole signal (entries via pending orders)
  if (!rangeBreakoutOnly) {
    // Generate entry execution
    code.onTick.push("");
    code.onTick.push("//--- Execute Entry");
    const entryCondition = hasDaily
      ? `if(positionsCount < ${ctx.maxOpenTrades} && newBar && tradesToday < ${ctx.maxTradesPerDay})`
      : `if(positionsCount < ${ctx.maxOpenTrades} && newBar)`;
    code.onTick.push(entryCondition);
    code.onTick.push("{");

    // Anti-hedging condition: prevent opening opposite positions when hedging is disabled
    const noHedge = !ctx.allowHedging;

    // Delete stale pending orders before placing new ones
    if (hasPendingOrders) {
      code.onTick.push("   DeletePendingOrders();");
    }

    // Only generate buy logic if there's a Place Buy node
    if (hasBuyNode) {
      const buyCheck = noHedge
        ? `   if(buyCondition && CountPositionsByType(POSITION_TYPE_BUY) < ${ctx.maxBuyPositions} && CountPositionsByType(POSITION_TYPE_SELL) == 0)`
        : `   if(buyCondition && CountPositionsByType(POSITION_TYPE_BUY) < ${ctx.maxBuyPositions})`;
      code.onTick.push(buyCheck);
      code.onTick.push("   {");

      if (buyOrderType === "MARKET") {
        if (hasDaily) {
          code.onTick.push(
            "      if(OpenBuy(buyLotSize, slPips, tpPips)) { lastEntryBar = currentBarTime; tradesToday++; }"
          );
        } else {
          code.onTick.push(
            "      if(OpenBuy(buyLotSize, slPips, tpPips)) lastEntryBar = currentBarTime;"
          );
        }
      } else {
        const fn = buyOrderType === "STOP" ? "PlaceBuyStop" : "PlaceBuyLimit";
        if (hasDaily) {
          code.onTick.push(
            `      if(${fn}(buyLotSize, slPips, tpPips, InpBuyPendingOffset)) { lastEntryBar = currentBarTime; tradesToday++; }`
          );
        } else {
          code.onTick.push(
            `      if(${fn}(buyLotSize, slPips, tpPips, InpBuyPendingOffset)) lastEntryBar = currentBarTime;`
          );
        }
      }
      code.onTick.push("   }");
    }

    // Only generate sell logic if there's a Place Sell node
    if (hasSellNode) {
      const sellCheck = noHedge
        ? `   if(sellCondition && CountPositionsByType(POSITION_TYPE_SELL) < ${ctx.maxSellPositions} && CountPositionsByType(POSITION_TYPE_BUY) == 0)`
        : `   if(sellCondition && CountPositionsByType(POSITION_TYPE_SELL) < ${ctx.maxSellPositions})`;
      code.onTick.push(sellCheck);
      code.onTick.push("   {");
      // Use direction-aware SL for sell if available (e.g., BB-based SL)
      const sellSL = code.hasDirectionalSL ? "slSellPips" : "slPips";
      const sellTP = code.hasDirectionalSL ? "(slSellPips * InpRiskReward)" : "tpPips";
      // Only override TP if it's risk-reward based; otherwise use the same tpPips
      const sellTPVar = code.onTick.some((l) => l.includes("InpRiskReward")) ? sellTP : "tpPips";

      if (sellOrderType === "MARKET") {
        if (hasDaily) {
          code.onTick.push(
            `      if(OpenSell(sellLotSize, ${sellSL}, ${sellTPVar})) { lastEntryBar = currentBarTime; tradesToday++; }`
          );
        } else {
          code.onTick.push(
            `      if(OpenSell(sellLotSize, ${sellSL}, ${sellTPVar})) lastEntryBar = currentBarTime;`
          );
        }
      } else {
        const fn = sellOrderType === "STOP" ? "PlaceSellStop" : "PlaceSellLimit";
        if (hasDaily) {
          code.onTick.push(
            `      if(${fn}(sellLotSize, ${sellSL}, ${sellTPVar}, InpSellPendingOffset)) { lastEntryBar = currentBarTime; tradesToday++; }`
          );
        } else {
          code.onTick.push(
            `      if(${fn}(sellLotSize, ${sellSL}, ${sellTPVar}, InpSellPendingOffset)) lastEntryBar = currentBarTime;`
          );
        }
      }
      code.onTick.push("   }");
    }

    code.onTick.push("}");
  } // end if (!rangeBreakoutOnly)

  // Add pending order helper functions if needed
  if (hasPendingOrders) {
    addPendingOrderHelpers(code, ctx);
  }

  // Range Breakout: place pending orders at range boundaries instead of market orders
  if (rangeBreakoutPAIndex >= 0) {
    const pv = `pa${rangeBreakoutPAIndex}`;
    const pi = rangeBreakoutPAIndex;
    const comment = sanitizeMQL5String(ctx.comment);
    const hasRR = code.inputs.some((i) => i.name === "InpRiskReward");

    code.onTick.push("");
    code.onTick.push("//--- Range Breakout Pending Orders");
    code.onTick.push(`if(${pv}NewRange)`);
    code.onTick.push("{");
    // Delete old pending orders
    code.onTick.push("   // Delete old pending orders from this EA");
    code.onTick.push("   for(int i = OrdersTotal() - 1; i >= 0; i--)");
    code.onTick.push("   {");
    code.onTick.push("      ulong ticket = OrderGetTicket(i);");
    code.onTick.push(
      "      if(ticket > 0 && OrderGetInteger(ORDER_MAGIC) == InpMagicNumber && OrderGetString(ORDER_SYMBOL) == _Symbol)"
    );
    code.onTick.push("         trade.OrderDelete(ticket);");
    code.onTick.push("   }");
    code.onTick.push("");

    // Calculate entry prices
    code.onTick.push(`   double bufferPts = InpRange${pi}Buffer * _pipFactor * _Point;`);
    code.onTick.push(`   double buyStopPrice = NormalizeDouble(${pv}High + bufferPts, _Digits);`);
    code.onTick.push(`   double sellStopPrice = NormalizeDouble(${pv}Low - bufferPts, _Digits);`);
    code.onTick.push("");

    // SL calculation — from pending entry price (not current market price)
    if (code.hasDirectionalSL) {
      // RANGE_OPPOSITE: SL at opposite range boundary
      code.onTick.push(`   // SL at opposite side of range`);
      code.onTick.push(`   double pendBuySL = NormalizeDouble(${pv}Low - bufferPts, _Digits);`);
      code.onTick.push(`   double pendSellSL = NormalizeDouble(${pv}High + bufferPts, _Digits);`);
    } else if (code.slMethod === "PERCENT") {
      // PERCENT: recalculate SL based on pending entry price, not current Ask
      code.onTick.push(`   double pendBuySLPips = (buyStopPrice * InpSLPercent / 100.0) / _Point;`);
      code.onTick.push(
        `   double pendBuySL = NormalizeDouble(buyStopPrice - pendBuySLPips * _Point, _Digits);`
      );
      code.onTick.push(
        `   double pendSellSLPips = (sellStopPrice * InpSLPercent / 100.0) / _Point;`
      );
      code.onTick.push(
        `   double pendSellSL = NormalizeDouble(sellStopPrice + pendSellSLPips * _Point, _Digits);`
      );
    } else {
      // ATR/FIXED: use slPips (distance-based, doesn't depend on entry price)
      code.onTick.push(
        `   double pendBuySL = NormalizeDouble(buyStopPrice - slPips * _Point, _Digits);`
      );
      code.onTick.push(
        `   double pendSellSL = NormalizeDouble(sellStopPrice + slPips * _Point, _Digits);`
      );
    }
    code.onTick.push(`   double pendBuySLDist = (buyStopPrice - pendBuySL) / _Point;`);
    code.onTick.push(`   double pendSellSLDist = (pendSellSL - sellStopPrice) / _Point;`);
    code.onTick.push("");

    // TP calculation
    if (hasRR) {
      code.onTick.push(
        `   double pendBuyTP = NormalizeDouble(buyStopPrice + pendBuySLDist * InpRiskReward * _Point, _Digits);`
      );
      code.onTick.push(
        `   double pendSellTP = NormalizeDouble(sellStopPrice - pendSellSLDist * InpRiskReward * _Point, _Digits);`
      );
    } else {
      code.onTick.push(
        `   double pendBuyTP = NormalizeDouble(buyStopPrice + tpPips * _Point, _Digits);`
      );
      code.onTick.push(
        `   double pendSellTP = NormalizeDouble(sellStopPrice - tpPips * _Point, _Digits);`
      );
    }
    code.onTick.push("");

    // Lot sizing from pending SL distance
    const hasBuyRisk = code.inputs.some((i) => i.name === "InpBuyRiskPercent");
    const hasSellRisk = code.inputs.some((i) => i.name === "InpSellRiskPercent");
    if (hasBuyRisk) {
      code.onTick.push(
        `   double pendBuyLot = CalculateLotSize(InpBuyRiskPercent, pendBuySLDist);`
      );
      code.onTick.push(`   pendBuyLot = MathMax(InpBuyMinLot, MathMin(InpBuyMaxLot, pendBuyLot));`);
    } else {
      code.onTick.push(`   double pendBuyLot = buyLotSize;`);
    }
    if (hasSellRisk) {
      code.onTick.push(
        `   double pendSellLot = CalculateLotSize(InpSellRiskPercent, pendSellSLDist);`
      );
      code.onTick.push(
        `   pendSellLot = MathMax(InpSellMinLot, MathMin(InpSellMaxLot, pendSellLot));`
      );
    } else {
      code.onTick.push(`   double pendSellLot = sellLotSize;`);
    }
    code.onTick.push("");

    // Place pending orders
    if (hasBuyNode) {
      code.onTick.push(
        `   if(trade.BuyStop(pendBuyLot, buyStopPrice, _Symbol, pendBuySL, pendBuyTP, ORDER_TIME_GTC, 0, "${comment}"))`
      );
      code.onTick.push(
        `      Print("Range Buy Stop at ", buyStopPrice, " SL:", pendBuySL, " TP:", pendBuyTP, " Lot:", pendBuyLot);`
      );
    }
    if (hasSellNode) {
      code.onTick.push(
        `   if(trade.SellStop(pendSellLot, sellStopPrice, _Symbol, pendSellSL, pendSellTP, ORDER_TIME_GTC, 0, "${comment}"))`
      );
      code.onTick.push(
        `      Print("Range Sell Stop at ", sellStopPrice, " SL:", pendSellSL, " TP:", pendSellTP, " Lot:", pendSellLot);`
      );
    }

    code.onTick.push("}");

    // OCO: Cancel remaining pending order when a position is filled
    const rbData = priceActionNodes[rangeBreakoutPAIndex].data as Record<string, unknown>;
    const cancelOpposite = rbData._cancelOpposite !== false;
    if (cancelOpposite) {
      code.onTick.push("");
      code.onTick.push("//--- OCO: Cancel pending orders when a position is open");
      code.onTick.push("if(positionsCount > 0)");
      code.onTick.push("{");
      code.onTick.push("   for(int i = OrdersTotal() - 1; i >= 0; i--)");
      code.onTick.push("   {");
      code.onTick.push("      ulong ticket = OrderGetTicket(i);");
      code.onTick.push(
        "      if(ticket > 0 && OrderGetInteger(ORDER_MAGIC) == InpMagicNumber && OrderGetString(ORDER_SYMBOL) == _Symbol)"
      );
      code.onTick.push("         trade.OrderDelete(ticket);");
      code.onTick.push("   }");
      code.onTick.push("}");
    }
  }
}

function addPendingOrderHelpers(code: GeneratedCode, ctx: GeneratorContext): void {
  const comment = sanitizeMQL5String(ctx.comment);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Delete Pending Orders for this EA                                  |
//+------------------------------------------------------------------+
void DeletePendingOrders()
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket > 0)
      {
         if(OrderGetInteger(ORDER_MAGIC) == InpMagicNumber &&
            OrderGetString(ORDER_SYMBOL) == _Symbol)
         {
            trade.OrderDelete(ticket);
         }
      }
   }
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Buy Stop Order                                               |
//+------------------------------------------------------------------+
bool PlaceBuyStop(double lots, double sl, double tp, double offsetPips)
{
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(ask + offset, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice - sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice + tp * _Point, _Digits) : 0;

   if(trade.BuyStop(lots, entryPrice, _Symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, "${comment}"))
      return true;

   Print("BuyStop failed: ", trade.ResultRetcodeDescription());
   return false;
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Buy Limit Order                                              |
//+------------------------------------------------------------------+
bool PlaceBuyLimit(double lots, double sl, double tp, double offsetPips)
{
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(ask - offset, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice - sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice + tp * _Point, _Digits) : 0;

   if(trade.BuyLimit(lots, entryPrice, _Symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, "${comment}"))
      return true;

   Print("BuyLimit failed: ", trade.ResultRetcodeDescription());
   return false;
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Sell Stop Order                                              |
//+------------------------------------------------------------------+
bool PlaceSellStop(double lots, double sl, double tp, double offsetPips)
{
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(bid - offset, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice + sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice - tp * _Point, _Digits) : 0;

   if(trade.SellStop(lots, entryPrice, _Symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, "${comment}"))
      return true;

   Print("SellStop failed: ", trade.ResultRetcodeDescription());
   return false;
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Sell Limit Order                                             |
//+------------------------------------------------------------------+
bool PlaceSellLimit(double lots, double sl, double tp, double offsetPips)
{
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(bid + offset, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice + sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice - tp * _Point, _Digits) : 0;

   if(trade.SellLimit(lots, entryPrice, _Symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, "${comment}"))
      return true;

   Print("SellLimit failed: ", trade.ResultRetcodeDescription());
   return false;
}`);
}

export function generateTimeExitCode(node: BuilderNode, code: GeneratedCode): void {
  const data = node.data as TimeExitNodeData;
  const group = "Time Exit";

  code.inputs.push(
    createInput(
      node,
      "exitAfterBars",
      "InpTimeExitBars",
      "int",
      data.exitAfterBars,
      "Exit After N Bars",
      group
    )
  );

  code.onTick.push("");
  code.onTick.push("//--- Time-Based Exit");
  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push(
    "      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
  );
  code.onTick.push("      {");
  code.onTick.push("         datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);");
  code.onTick.push(
    `         int barsSinceEntry = iBarShift(_Symbol, ${getTimeframe(data.exitTimeframe)}, openTime);`
  );
  code.onTick.push("         if(barsSinceEntry >= InpTimeExitBars)");
  code.onTick.push("         {");
  code.onTick.push("            trade.PositionClose(ticket);");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}
