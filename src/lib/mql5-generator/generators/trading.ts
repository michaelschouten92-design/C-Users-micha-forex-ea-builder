import type {
  BuilderNode,
  BuilderEdge,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  RangeBreakoutNodeData,
} from "@/types/builder";
import type { GeneratorContext, GeneratedCode } from "../types";
import { createInput } from "./shared";

export function generatePlaceBuyCode(
  node: BuilderNode,
  code: GeneratedCode
): void {
  const data = node.data as PlaceBuyNodeData;

  const group = "Buy Order";
  switch (data.method) {
    case "FIXED_LOT":
      code.inputs.push(createInput(node, "fixedLot", "InpBuyLotSize", "double", data.fixedLot, "Buy Lot Size", group));
      code.onTick.push("double buyLotSize = InpBuyLotSize;");
      break;

    case "RISK_PERCENT":
      code.inputs.push(createInput(node, "riskPercent", "InpBuyRiskPercent", "double", data.riskPercent, "Buy Risk %", group));
      code.onTick.push("double buyLotSize = CalculateLotSize(InpBuyRiskPercent, slPips);");
      break;
  }

  code.inputs.push(createInput(node, "minLot", "InpBuyMinLot", "double", data.minLot, "Buy Minimum Lot", group));
  code.inputs.push(createInput(node, "maxLot", "InpBuyMaxLot", "double", data.maxLot, "Buy Maximum Lot", group));
  code.onTick.push("buyLotSize = MathMax(InpBuyMinLot, MathMin(InpBuyMaxLot, buyLotSize));");
}

export function generatePlaceSellCode(
  node: BuilderNode,
  code: GeneratedCode
): void {
  const data = node.data as PlaceSellNodeData;

  const group = "Sell Order";
  switch (data.method) {
    case "FIXED_LOT":
      code.inputs.push(createInput(node, "fixedLot", "InpSellLotSize", "double", data.fixedLot, "Sell Lot Size", group));
      code.onTick.push("double sellLotSize = InpSellLotSize;");
      break;

    case "RISK_PERCENT":
      code.inputs.push(createInput(node, "riskPercent", "InpSellRiskPercent", "double", data.riskPercent, "Sell Risk %", group));
      code.onTick.push("double sellLotSize = CalculateLotSize(InpSellRiskPercent, slPips);");
      break;
  }

  code.inputs.push(createInput(node, "minLot", "InpSellMinLot", "double", data.minLot, "Sell Minimum Lot", group));
  code.inputs.push(createInput(node, "maxLot", "InpSellMaxLot", "double", data.maxLot, "Sell Maximum Lot", group));
  code.onTick.push("sellLotSize = MathMax(InpSellMinLot, MathMin(InpSellMaxLot, sellLotSize));");
}

export function generateStopLossCode(
  node: BuilderNode,
  indicatorNodes: BuilderNode[],
  edges: BuilderEdge[],
  code: GeneratedCode
): void {
  const data = node.data as StopLossNodeData;

  const slGroup = "Stop Loss";
  switch (data.method) {
    case "FIXED_PIPS":
      code.inputs.push(createInput(node, "fixedPips", "InpStopLoss", "double", data.fixedPips, "Stop Loss (pips)", slGroup));
      code.onTick.push("double slPips = InpStopLoss * 10; // Convert to points");
      break;

    case "ATR_BASED":
      code.inputs.push(createInput(node, "atrPeriod", "InpATRPeriod", "int", data.atrPeriod, "ATR Period for SL", slGroup));
      code.inputs.push(createInput(node, "atrMultiplier", "InpATRMultiplier", "double", data.atrMultiplier, "ATR Multiplier for SL", slGroup));
      code.globalVariables.push("int atrHandle = INVALID_HANDLE;");
      code.globalVariables.push("double atrBuffer[];");
      code.onInit.push("atrHandle = iATR(_Symbol, PERIOD_CURRENT, InpATRPeriod);");
      code.onInit.push('if(atrHandle == INVALID_HANDLE) { Print("Failed to create ATR handle for SL"); return(INIT_FAILED); }');
      code.onDeinit.push("if(atrHandle != INVALID_HANDLE) IndicatorRelease(atrHandle);");
      code.onInit.push("ArraySetAsSeries(atrBuffer, true);");
      code.onTick.push("if(CopyBuffer(atrHandle, 0, 0, 1, atrBuffer) < 1) return;");
      code.onTick.push("double slPips = (atrBuffer[0] / _Point) * InpATRMultiplier;");
      break;

    case "INDICATOR":
      generateIndicatorBasedSL(node, indicatorNodes, edges, code);
      break;
  }
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
    connectedIndicator = indicatorNodes.find(n => n.id === data.indicatorNodeId);
  }

  // Fallback: check edges for connection to SL node
  if (!connectedIndicator) {
    const connectedEdge = edges.find(e => e.target === slNode.id);
    if (connectedEdge) {
      connectedIndicator = indicatorNodes.find(n => n.id === connectedEdge.source);
    }
  }

  if (!connectedIndicator) {
    // No indicator connected - use default fixed pips with warning
    code.inputs.push({ name: "InpStopLoss", type: "double", value: 50, comment: "Stop Loss (pips) - No indicator connected", isOptimizable: true });
    code.onTick.push("double slPips = InpStopLoss * 10; // Fallback: no indicator connected");
    return;
  }

  const indIndex = indicatorNodes.indexOf(connectedIndicator);
  const varPrefix = `ind${indIndex}`;
  const indData = connectedIndicator.data;

  if ("indicatorType" in indData) {
    switch (indData.indicatorType) {
      case "bollinger-bands":
        // Use distance from price to opposite Bollinger Band as SL
        code.inputs.push({ name: "InpBBSLBuffer", type: "double", value: 5, comment: "Additional buffer pips for BB SL", isOptimizable: true });
        code.onTick.push("// Indicator-based SL using Bollinger Bands");
        code.onTick.push("double slPips;");
        code.onTick.push("double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
        code.onTick.push(`double bbLower = ${varPrefix}LowerBuffer[0];`);
        code.onTick.push(`double bbUpper = ${varPrefix}UpperBuffer[0];`);
        code.onTick.push("// For BUY: SL at lower band, for SELL: SL at upper band");
        code.onTick.push("double distToLower = (currentPrice - bbLower) / _Point;");
        code.onTick.push("double distToUpper = (bbUpper - currentPrice) / _Point;");
        code.onTick.push("slPips = MathMax(distToLower, distToUpper) + (InpBBSLBuffer * 10);");
        break;

      case "moving-average":
        // Use distance from price to MA as SL
        code.inputs.push({ name: "InpMASLMultiplier", type: "double", value: 1.5, comment: "MA SL distance multiplier", isOptimizable: true });
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
        code.inputs.push({ name: "InpATRSLMultiplier", type: "double", value: 1.5, comment: "ATR SL multiplier", isOptimizable: true });
        code.onTick.push("// Indicator-based SL using ATR");
        code.onTick.push(`double slPips = (${varPrefix}Buffer[0] / _Point) * InpATRSLMultiplier;`);
        break;

      case "adx":
        // Use ATR-style calculation scaled by ADX strength
        code.inputs.push({ name: "InpADXSLBase", type: "double", value: 50, comment: "Base SL pips when ADX is at trend level", isOptimizable: true });
        code.onTick.push("// Indicator-based SL using ADX (scaled by trend strength)");
        code.onTick.push(`double adxValue = ${varPrefix}MainBuffer[0];`);
        code.onTick.push("// Stronger trend = tighter SL, weaker trend = wider SL");
        code.onTick.push("double slMultiplier = 2.0 - (adxValue / 100.0); // Range: 1.0 to 2.0");
        code.onTick.push("double slPips = InpADXSLBase * slMultiplier * 10;");
        break;

      default:
        // RSI, MACD etc. not typically used for SL - use default
        code.inputs.push({ name: "InpStopLoss", type: "double", value: 50, comment: "Stop Loss (pips)", isOptimizable: true });
        code.onTick.push(`double slPips = InpStopLoss * 10; // ${indData.indicatorType} not suitable for SL calculation`);
        break;
    }
  } else {
    // Unknown indicator type
    code.inputs.push({ name: "InpStopLoss", type: "double", value: 50, comment: "Stop Loss (pips)", isOptimizable: true });
    code.onTick.push("double slPips = InpStopLoss * 10; // Unknown indicator type");
  }
}

export function generateTakeProfitCode(
  node: BuilderNode,
  code: GeneratedCode
): void {
  const data = node.data as TakeProfitNodeData;

  const tpGroup = "Take Profit";
  switch (data.method) {
    case "FIXED_PIPS":
      code.inputs.push(createInput(node, "fixedPips", "InpTakeProfit", "double", data.fixedPips, "Take Profit (pips)", tpGroup));
      code.onTick.push("double tpPips = InpTakeProfit * 10; // Convert to points");
      break;

    case "RISK_REWARD":
      code.inputs.push(createInput(node, "riskRewardRatio", "InpRiskReward", "double", data.riskRewardRatio, "Risk:Reward Ratio", tpGroup));
      code.onTick.push("double tpPips = slPips * InpRiskReward;");
      break;

    case "ATR_BASED":
      // Reuse ATR handle if already created
      code.inputs.push(createInput(node, "atrMultiplier", "InpTPATRMultiplier", "double", data.atrMultiplier, "ATR Multiplier for TP", tpGroup));
      code.onTick.push("double tpPips = (atrBuffer[0] / _Point) * InpTPATRMultiplier;");
      break;
  }
}

export function generateEntryLogic(
  indicatorNodes: BuilderNode[],
  priceActionNodes: BuilderNode[],
  hasBuyNode: boolean,
  hasSellNode: boolean,
  ctx: GeneratorContext,
  code: GeneratedCode
): void {
  code.onTick.push("");
  code.onTick.push("//--- Entry Logic");

  const hasConditions = indicatorNodes.length > 0 || priceActionNodes.length > 0;

  if (!hasConditions) {
    code.onTick.push("bool buyCondition = false;");
    code.onTick.push("bool sellCondition = false;");
  } else {
    // Generate conditions based on all indicators and price action
    const buyConditions: string[] = [];
    const sellConditions: string[] = [];

    // Process indicator conditions
    indicatorNodes.forEach((indNode, indIndex) => {
      const varPrefix = `ind${indIndex}`;
      const indData = indNode.data;

      if ("indicatorType" in indData) {
        switch (indData.indicatorType) {
          case "moving-average":
            buyConditions.push(`(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}Buffer[1]))`);
            sellConditions.push(`(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}Buffer[1]))`);
            break;

          case "rsi":
            buyConditions.push(`(DoubleLE(${varPrefix}Buffer[1], InpRSI${indIndex}Oversold) && DoubleGT(${varPrefix}Buffer[0], InpRSI${indIndex}Oversold))`);
            sellConditions.push(`(DoubleGE(${varPrefix}Buffer[1], InpRSI${indIndex}Overbought) && DoubleLT(${varPrefix}Buffer[0], InpRSI${indIndex}Overbought))`);
            break;

          case "macd":
            buyConditions.push(`(DoubleLE(${varPrefix}MainBuffer[1], ${varPrefix}SignalBuffer[1]) && DoubleGT(${varPrefix}MainBuffer[0], ${varPrefix}SignalBuffer[0]))`);
            sellConditions.push(`(DoubleGE(${varPrefix}MainBuffer[1], ${varPrefix}SignalBuffer[1]) && DoubleLT(${varPrefix}MainBuffer[0], ${varPrefix}SignalBuffer[0]))`);
            break;

          case "bollinger-bands":
            buyConditions.push(`(DoubleLE(iLow(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}LowerBuffer[1]))`);
            sellConditions.push(`(DoubleGE(iHigh(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}UpperBuffer[1]))`);
            break;

          case "atr":
            buyConditions.push(`(DoubleGT(${varPrefix}Buffer[0], ${varPrefix}Buffer[1]))`);
            sellConditions.push(`(DoubleGT(${varPrefix}Buffer[0], ${varPrefix}Buffer[1]))`);
            break;

          case "adx":
            buyConditions.push(`(DoubleGT(${varPrefix}MainBuffer[0], InpADX${indIndex}TrendLevel) && DoubleGT(${varPrefix}PlusDIBuffer[0], ${varPrefix}MinusDIBuffer[0]))`);
            sellConditions.push(`(DoubleGT(${varPrefix}MainBuffer[0], InpADX${indIndex}TrendLevel) && DoubleGT(${varPrefix}MinusDIBuffer[0], ${varPrefix}PlusDIBuffer[0]))`);
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
            const rb = paData as RangeBreakoutNodeData;
            // Add conditions based on breakout direction
            if (rb.breakoutDirection === "BUY_ON_HIGH" || rb.breakoutDirection === "BOTH") {
              buyConditions.push(`(${varPrefix}BreakoutUp)`);
            }
            if (rb.breakoutDirection === "SELL_ON_LOW" || rb.breakoutDirection === "BOTH") {
              sellConditions.push(`(${varPrefix}BreakoutDown)`);
            }
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

    code.onTick.push(`bool buyCondition = ${buyConditions.join(" && ")};`);
    code.onTick.push(`bool sellCondition = ${sellConditions.join(" && ")};`);
  }

  // One-trade-per-bar protection
  code.globalVariables.push("datetime lastEntryBar = 0; // Prevent multiple entries per bar");
  code.onTick.push("");
  code.onTick.push("//--- One-trade-per-bar check");
  code.onTick.push("datetime currentBarTime = iTime(_Symbol, PERIOD_CURRENT, 0);");
  code.onTick.push("bool newBar = (currentBarTime != lastEntryBar);");

  // Generate entry execution
  code.onTick.push("");
  code.onTick.push("//--- Execute Entry");
  code.onTick.push(`if(positionsCount < ${ctx.maxOpenTrades} && newBar)`);
  code.onTick.push("{");

  // Only generate buy logic if there's a Place Buy node
  if (hasBuyNode) {
    code.onTick.push(`   if(buyCondition && CountPositionsByType(POSITION_TYPE_BUY) < ${ctx.maxBuyPositions})`);
    code.onTick.push("   {");
    code.onTick.push("      if(OpenBuy(buyLotSize, slPips, tpPips)) lastEntryBar = currentBarTime;");
    code.onTick.push("   }");
  }

  // Only generate sell logic if there's a Place Sell node
  if (hasSellNode) {
    code.onTick.push(`   if(sellCondition && CountPositionsByType(POSITION_TYPE_SELL) < ${ctx.maxSellPositions})`);
    code.onTick.push("   {");
    code.onTick.push("      if(OpenSell(sellLotSize, slPips, tpPips)) lastEntryBar = currentBarTime;");
    code.onTick.push("   }");
  }

  code.onTick.push("}");
}
