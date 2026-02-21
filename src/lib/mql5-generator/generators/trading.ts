import type {
  BuilderNode,
  BuilderEdge,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  TimeExitNodeData,
  ConditionNodeData,
  GridPyramidNodeData,
} from "@/types/builder";
import type { GeneratorContext, GeneratedCode } from "../types";
import { getTimeframe, getTimeframeEnum } from "../types";
import { createInput, sanitizeMQL5String } from "./shared";
import { generateDivergenceHelpers } from "./divergence";

export function generatePlaceBuyCode(
  node: BuilderNode,
  code: GeneratedCode,
  skipOnTickLotSizing = false,
  useSharedRisk = false
): void {
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
      if (!skipOnTickLotSizing) code.onTick.push("double buyLotSize = InpBuyLotSize;");
      break;

    case "RISK_PERCENT": {
      const riskInput = useSharedRisk ? "InpRiskPercent" : "InpBuyRiskPercent";
      const riskComment = useSharedRisk ? "Risk %" : "Buy Risk %";
      const riskGroup = useSharedRisk ? "Risk Management" : group;
      code.inputs.push(
        createInput(
          node,
          "riskPercent",
          riskInput,
          "double",
          data.riskPercent,
          riskComment,
          riskGroup,
          true
        )
      );
      if (!skipOnTickLotSizing) {
        code.onTick.push(`double buyLotSize = CalculateLotSize(${riskInput}, slPips);`);
        // For pending orders with PERCENT SL, recalculate lot size based on entry price
        if (orderType !== "MARKET" && code.slMethod === "PERCENT") {
          const dir = orderType === "STOP" ? "+" : "-";
          code.onTick.push(`{`);
          code.onTick.push(
            `   double pendEntry = SymbolInfoDouble(_Symbol, SYMBOL_ASK) ${dir} InpBuyPendingOffset * _pipFactor * _Point;`
          );
          code.onTick.push(`   double adjSlPips = (pendEntry * InpSLPercent / 100.0) / _Point;`);
          code.onTick.push(`   buyLotSize = CalculateLotSize(${riskInput}, adjSlPips);`);
          code.onTick.push(`}`);
        }
      }
      break;
    }
  }

  code.inputs.push(
    createInput(node, "minLot", "InpBuyMinLot", "double", data.minLot, "Buy Minimum Lot", group)
  );
  code.inputs.push(
    createInput(node, "maxLot", "InpBuyMaxLot", "double", data.maxLot, "Buy Maximum Lot", group)
  );
  if (!skipOnTickLotSizing)
    code.onTick.push("buyLotSize = MathMax(InpBuyMinLot, MathMin(InpBuyMaxLot, buyLotSize));");
}

export function generatePlaceSellCode(
  node: BuilderNode,
  code: GeneratedCode,
  skipOnTickLotSizing = false,
  useSharedRisk = false
): void {
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
      if (!skipOnTickLotSizing) code.onTick.push("double sellLotSize = InpSellLotSize;");
      break;

    case "RISK_PERCENT": {
      const riskInput = useSharedRisk ? "InpRiskPercent" : "InpSellRiskPercent";
      // When using shared risk, the input was already created by generatePlaceBuyCode
      if (!useSharedRisk) {
        code.inputs.push(
          createInput(
            node,
            "riskPercent",
            riskInput,
            "double",
            data.riskPercent,
            "Sell Risk %",
            group,
            true
          )
        );
      }
      if (!skipOnTickLotSizing) {
        if (code.hasDirectionalSL) {
          code.onTick.push(`double sellLotSize = CalculateLotSize(${riskInput}, slSellPips);`);
        } else {
          code.onTick.push(`double sellLotSize = CalculateLotSize(${riskInput}, slPips);`);
        }
        // For pending orders with PERCENT SL, recalculate lot size based on entry price
        if (orderType !== "MARKET" && code.slMethod === "PERCENT") {
          const dir = orderType === "STOP" ? "-" : "+";
          code.onTick.push(`{`);
          code.onTick.push(
            `   double pendEntry = SymbolInfoDouble(_Symbol, SYMBOL_BID) ${dir} InpSellPendingOffset * _pipFactor * _Point;`
          );
          code.onTick.push(`   double adjSlPips = (pendEntry * InpSLPercent / 100.0) / _Point;`);
          code.onTick.push(`   sellLotSize = CalculateLotSize(${riskInput}, adjSlPips);`);
          code.onTick.push(`}`);
        }
      }
      break;
    }
  }

  code.inputs.push(
    createInput(node, "minLot", "InpSellMinLot", "double", data.minLot, "Sell Minimum Lot", group)
  );
  code.inputs.push(
    createInput(node, "maxLot", "InpSellMaxLot", "double", data.maxLot, "Sell Maximum Lot", group)
  );
  if (!skipOnTickLotSizing)
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
      code.onTick.push(
        "double slSellPips = (SymbolInfoDouble(_Symbol, SYMBOL_BID) * InpSLPercent / 100.0) / _Point;"
      );
      code.hasDirectionalSL = true;
      break;

    case "ATR_BASED": {
      const atrTfDefault = getTimeframeEnum(data.atrTimeframe);
      code.inputs.push(
        createInput(
          node,
          "atrTimeframe",
          "InpATRSLTimeframe",
          "ENUM_AS_TIMEFRAMES",
          atrTfDefault,
          "ATR Timeframe for SL",
          slGroup
        )
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
      code.onInit.push(
        `atrHandle = iATR(_Symbol, (ENUM_TIMEFRAMES)InpATRSLTimeframe, InpATRPeriod);`
      );
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

  if (rbIndex < 0) {
    throw new Error("RANGE_OPPOSITE stop loss requires a Range Breakout entry strategy");
  }

  const prefix = `pa${rbIndex}`;
  code.onTick.push("//--- Range Opposite SL: use range high/low as stop loss");
  code.onTick.push(
    `double slPips = MathMax((SymbolInfoDouble(_Symbol, SYMBOL_ASK) - ${prefix}Low) / _Point, 10 * _pipFactor);`
  );
  code.onTick.push(
    `double slSellPips = MathMax((${prefix}High - SymbolInfoDouble(_Symbol, SYMBOL_BID)) / _Point, 10 * _pipFactor);`
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
          "double slPips = MathMax(distToLower + (InpBBSLBuffer * _pipFactor), 10 * _pipFactor); // Buy direction"
        );
        code.onTick.push(
          "double slSellPips = MathMax(distToUpper + (InpBBSLBuffer * _pipFactor), 10 * _pipFactor); // Sell direction"
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
        code.onTick.push("slPips = MathMax(slPips, 10 * _pipFactor); // Minimum 10 pips SL");
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
      code.tpMethod = "RISK_REWARD";
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
  sellNode?: BuilderNode,
  edges: BuilderEdge[] = []
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
    const emaCrossGroups = new Map<
      string,
      { fast?: number; slow?: number; minEmaSeparation?: number }
    >();
    indicatorNodes.forEach((indNode, indIndex) => {
      const d = indNode.data as Record<string, unknown>;
      if (d._entryStrategyType === "ema-crossover" && d._entryStrategyId) {
        const esId = d._entryStrategyId as string;
        if (!emaCrossGroups.has(esId)) emaCrossGroups.set(esId, {});
        const group = emaCrossGroups.get(esId)!;
        if (d._role === "fast") {
          group.fast = indIndex;
          group.minEmaSeparation = Number(d._minEmaSeparation) || 0;
        }
        if (d._role === "slow") group.slow = indIndex;
      }
    });
    for (const [, group] of emaCrossGroups) {
      if (group.fast !== undefined && group.slow !== undefined) {
        const fp = `ind${group.fast}`;
        const sp = `ind${group.slow}`;
        // Fast EMA crosses above Slow EMA (bullish crossover)
        let buyCross = `(DoubleLE(${fp}Buffer[2], ${sp}Buffer[2]) && DoubleGT(${fp}Buffer[1], ${sp}Buffer[1]))`;
        let sellCross = `(DoubleGE(${fp}Buffer[2], ${sp}Buffer[2]) && DoubleLT(${fp}Buffer[1], ${sp}Buffer[1]))`;
        // Minimum EMA separation filter
        if (group.minEmaSeparation && group.minEmaSeparation > 0) {
          const fastNode = indicatorNodes[group.fast!];
          code.inputs.push(
            createInput(
              fastNode,
              "_minEmaSeparation",
              "InpMinEmaSeparation",
              "double",
              group.minEmaSeparation,
              "Min EMA Separation (pips)",
              "EMA Crossover"
            )
          );
          const sepCondition = `MathAbs(${fp}Buffer[1] - ${sp}Buffer[1]) / (_Point * _pipFactor) >= InpMinEmaSeparation`;
          buyCross = `(${buyCross} && ${sepCondition})`;
          sellCross = `(${sellCross} && ${sepCondition})`;
        }
        buyConditions.push(buyCross);
        sellConditions.push(sellCross);
        handledIndices.add(group.fast);
        handledIndices.add(group.slow);
      }
    }

    // Process filter nodes (HTF trend, RSI confirmation) — these add additional conditions
    indicatorNodes.forEach((indNode, indIndex) => {
      const d = indNode.data as Record<string, unknown>;
      if (d._filterRole === "htf-trend") {
        // Price above HTF EMA = allow buy, below = allow sell
        // Use buffer[0] for current HTF bar value and current-TF close for price
        const vp = `ind${indIndex}`;
        const s = d.signalMode === "candle_close" ? 1 : 0;
        buyConditions.push(`(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${s}), ${vp}Buffer[0]))`);
        sellConditions.push(`(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${s}), ${vp}Buffer[0]))`);
        handledIndices.add(indIndex);
      } else if (d._filterRole === "rsi-confirm") {
        // RSI < longMax (overbought) for buy, RSI > shortMin (oversold) for sell
        const vp = `ind${indIndex}`;
        const s = d.signalMode === "candle_close" ? 1 : 0;
        buyConditions.push(`(DoubleLT(${vp}Buffer[${0 + s}], InpRSI${indIndex}Overbought))`);
        sellConditions.push(`(DoubleGT(${vp}Buffer[${0 + s}], InpRSI${indIndex}Oversold))`);
        handledIndices.add(indIndex);
      } else if (d._filterRole === "adx-trend-strength") {
        // ADX > threshold = trend is strong enough (both directions)
        const vp = `ind${indIndex}`;
        const s = d.signalMode === "candle_close" ? 1 : 0;
        buyConditions.push(`(DoubleGT(${vp}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel))`);
        sellConditions.push(`(DoubleGT(${vp}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel))`);
        handledIndices.add(indIndex);
      }
    });

    // Process divergence mode indicators — these need price arrays and helper functions
    let divergenceHelpersAdded = false;
    indicatorNodes.forEach((indNode, indIndex) => {
      const d = indNode.data as Record<string, unknown>;
      if (!d._divergenceMode) return;

      // Add helper functions once
      if (!divergenceHelpersAdded) {
        generateDivergenceHelpers(code);
        divergenceHelpersAdded = true;
      }

      const varPrefix = `ind${indIndex}`;
      const lookback = Number(d._divergenceLookback) || 20;
      const minSwing = Number(d._divergenceMinSwing) || 5;
      const indType = d.indicatorType as string;
      const divPriceVar = `g_divPrice${indIndex}`;

      // Create divergence inputs
      code.inputs.push(
        createInput(
          indNode,
          "_divergenceLookback",
          `InpDivLookback${indIndex}`,
          "int",
          lookback,
          `Divergence ${indIndex + 1} Lookback Bars`,
          `Divergence ${indIndex + 1}`
        )
      );
      code.inputs.push(
        createInput(
          indNode,
          "_divergenceMinSwing",
          `InpDivMinSwing${indIndex}`,
          "int",
          minSwing,
          `Divergence ${indIndex + 1} Min Swing Bars`,
          `Divergence ${indIndex + 1}`
        )
      );

      // Add price low/high arrays for swing detection
      code.globalVariables.push(`double ${divPriceVar}Low[];`);
      code.globalVariables.push(`double ${divPriceVar}High[];`);
      code.onInit.push(`ArraySetAsSeries(${divPriceVar}Low, true);`);
      code.onInit.push(`ArraySetAsSeries(${divPriceVar}High, true);`);

      // Get the timeframe from the indicator's input variable
      let tfVar: string;
      if (indType === "rsi") {
        tfVar = `(ENUM_TIMEFRAMES)InpRSI${indIndex}Timeframe`;
      } else {
        tfVar = `(ENUM_TIMEFRAMES)InpMACD${indIndex}Timeframe`;
      }

      // Copy price data in OnTick (with explicit count validation)
      code.onTick.push(
        `int divCopied${indIndex}L = CopyLow(_Symbol, ${tfVar}, 0, InpDivLookback${indIndex}+2, ${divPriceVar}Low);`
      );
      code.onTick.push(
        `int divCopied${indIndex}H = CopyHigh(_Symbol, ${tfVar}, 0, InpDivLookback${indIndex}+2, ${divPriceVar}High);`
      );
      code.onTick.push(
        `if(divCopied${indIndex}L < InpDivLookback${indIndex}+2 || divCopied${indIndex}H < InpDivLookback${indIndex}+2) return; // Not enough bars for divergence`
      );

      // Determine which indicator buffer to use for divergence comparison
      const indBuffer = indType === "macd" ? `${varPrefix}MainBuffer` : `${varPrefix}Buffer`;

      // Also verify indicator buffer has enough bars (ArraySize check)
      code.onTick.push(
        `if(ArraySize(${indBuffer}) < InpDivLookback${indIndex}+2) return; // Indicator buffer too small for divergence lookback`
      );

      buyConditions.push(
        `(CheckBullishDivergence(${divPriceVar}Low, ${indBuffer}, InpDivLookback${indIndex}, InpDivMinSwing${indIndex}))`
      );
      sellConditions.push(
        `(CheckBearishDivergence(${divPriceVar}High, ${indBuffer}, InpDivLookback${indIndex}, InpDivMinSwing${indIndex}))`
      );
      handledIndices.add(indIndex);
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
          case "moving-average": {
            // --- Fix 7c: Fibonacci entry (virtual MA node with _entryStrategyType) ---
            if (
              "_entryStrategyType" in indData &&
              indData._entryStrategyType === "fibonacci-entry"
            ) {
              const fibMode = (
                "_fibEntryMode" in indData ? indData._fibEntryMode : "BOUNCE"
              ) as string;
              const fibLevel = Number("_fibLevel" in indData ? indData._fibLevel : 0.618);
              const fibLookback = Number("_fibLookback" in indData ? indData._fibLookback : 100);

              code.inputs.push(
                createInput(
                  indNode,
                  "_fibLevel",
                  `InpFib${indIndex}Level`,
                  "double",
                  fibLevel,
                  "Fibonacci Level (0.236-0.786)",
                  `Fibonacci ${indIndex + 1}`
                ),
                createInput(
                  indNode,
                  "_fibLookback",
                  `InpFib${indIndex}Lookback`,
                  "int",
                  fibLookback,
                  "Bars to look back for swing high/low",
                  `Fibonacci ${indIndex + 1}`
                )
              );

              code.onTick.push(
                `// --- Fibonacci Retracement Entry (Indicator ${indIndex + 1}) ---`
              );
              code.onTick.push(`double fib${indIndex}High[], fib${indIndex}Low[];`);
              code.onTick.push(`ArraySetAsSeries(fib${indIndex}High, true);`);
              code.onTick.push(`ArraySetAsSeries(fib${indIndex}Low, true);`);
              code.onTick.push(
                `CopyHigh(_Symbol, PERIOD_CURRENT, 0, InpFib${indIndex}Lookback, fib${indIndex}High);`
              );
              code.onTick.push(
                `CopyLow(_Symbol, PERIOD_CURRENT, 0, InpFib${indIndex}Lookback, fib${indIndex}Low);`
              );
              code.onTick.push(
                `int fib${indIndex}HighIdx = ArrayMaximum(fib${indIndex}High, 0, InpFib${indIndex}Lookback);`
              );
              code.onTick.push(
                `int fib${indIndex}LowIdx = ArrayMinimum(fib${indIndex}Low, 0, InpFib${indIndex}Lookback);`
              );
              code.onTick.push(
                `double fib${indIndex}SwHigh = fib${indIndex}High[fib${indIndex}HighIdx];`
              );
              code.onTick.push(
                `double fib${indIndex}SwLow = fib${indIndex}Low[fib${indIndex}LowIdx];`
              );
              code.onTick.push(
                `double fib${indIndex}Range = fib${indIndex}SwHigh - fib${indIndex}SwLow;`
              );
              code.onTick.push(
                `double fib${indIndex}BuyLvl = fib${indIndex}SwLow + fib${indIndex}Range * (1.0 - InpFib${indIndex}Level);`
              );
              code.onTick.push(
                `double fib${indIndex}SellLvl = fib${indIndex}SwHigh - fib${indIndex}Range * (1.0 - InpFib${indIndex}Level);`
              );

              if (fibMode === "BREAK") {
                buyConditions.push(
                  `(fib${indIndex}Range > 0 && DoubleLE(iClose(_Symbol, PERIOD_CURRENT, ${2 + s}), fib${indIndex}BuyLvl) && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), fib${indIndex}BuyLvl))`
                );
                sellConditions.push(
                  `(fib${indIndex}Range > 0 && DoubleGE(iClose(_Symbol, PERIOD_CURRENT, ${2 + s}), fib${indIndex}SellLvl) && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), fib${indIndex}SellLvl))`
                );
              } else {
                // BOUNCE (default): price touches fib level and bounces
                buyConditions.push(
                  `(fib${indIndex}Range > 0 && DoubleLE(iLow(_Symbol, PERIOD_CURRENT, ${1 + s}), fib${indIndex}BuyLvl) && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), fib${indIndex}BuyLvl))`
                );
                sellConditions.push(
                  `(fib${indIndex}Range > 0 && DoubleGE(iHigh(_Symbol, PERIOD_CURRENT, ${1 + s}), fib${indIndex}SellLvl) && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), fib${indIndex}SellLvl))`
                );
              }
              break;
            }

            // --- Fix 7d: Pivot Point entry (virtual MA node with _entryStrategyType) ---
            if (
              "_entryStrategyType" in indData &&
              indData._entryStrategyType === "pivot-point-entry"
            ) {
              const pivotType = (
                "_pivotType" in indData ? indData._pivotType : "CLASSIC"
              ) as string;
              const pivotTf = (
                "_pivotTimeframe" in indData ? indData._pivotTimeframe : "DAILY"
              ) as string;
              const pivotEntryMode = (
                "_pivotEntryMode" in indData ? indData._pivotEntryMode : "BOUNCE"
              ) as string;
              const pivotTarget = (
                "_pivotTargetLevel" in indData ? indData._pivotTargetLevel : "PIVOT"
              ) as string;

              const tfMql: Record<string, string> = {
                DAILY: "PERIOD_D1",
                WEEKLY: "PERIOD_W1",
                MONTHLY: "PERIOD_MN1",
              };
              const ppTf = tfMql[pivotTf] ?? "PERIOD_D1";

              code.onTick.push(`// --- Pivot Point Entry (Indicator ${indIndex + 1}) ---`);
              code.onTick.push(`double pp${indIndex}H = iHigh(_Symbol, ${ppTf}, 1);`);
              code.onTick.push(`double pp${indIndex}L = iLow(_Symbol, ${ppTf}, 1);`);
              code.onTick.push(`double pp${indIndex}C = iClose(_Symbol, ${ppTf}, 1);`);

              if (pivotType === "WOODIE") {
                code.onTick.push(
                  `double pp${indIndex}Pivot = (pp${indIndex}H + pp${indIndex}L + 2.0 * pp${indIndex}C) / 4.0;`
                );
              } else {
                code.onTick.push(
                  `double pp${indIndex}Pivot = (pp${indIndex}H + pp${indIndex}L + pp${indIndex}C) / 3.0;`
                );
              }

              if (pivotType === "CAMARILLA") {
                code.onTick.push(`double pp${indIndex}Rng = pp${indIndex}H - pp${indIndex}L;`);
                code.onTick.push(
                  `double pp${indIndex}R1 = pp${indIndex}C + pp${indIndex}Rng * 1.1 / 12.0;`
                );
                code.onTick.push(
                  `double pp${indIndex}S1 = pp${indIndex}C - pp${indIndex}Rng * 1.1 / 12.0;`
                );
                code.onTick.push(
                  `double pp${indIndex}R2 = pp${indIndex}C + pp${indIndex}Rng * 1.1 / 6.0;`
                );
                code.onTick.push(
                  `double pp${indIndex}S2 = pp${indIndex}C - pp${indIndex}Rng * 1.1 / 6.0;`
                );
                code.onTick.push(
                  `double pp${indIndex}R3 = pp${indIndex}C + pp${indIndex}Rng * 1.1 / 4.0;`
                );
                code.onTick.push(
                  `double pp${indIndex}S3 = pp${indIndex}C - pp${indIndex}Rng * 1.1 / 4.0;`
                );
              } else if (pivotType === "FIBONACCI") {
                code.onTick.push(`double pp${indIndex}Rng = pp${indIndex}H - pp${indIndex}L;`);
                code.onTick.push(
                  `double pp${indIndex}R1 = pp${indIndex}Pivot + 0.382 * pp${indIndex}Rng;`
                );
                code.onTick.push(
                  `double pp${indIndex}S1 = pp${indIndex}Pivot - 0.382 * pp${indIndex}Rng;`
                );
                code.onTick.push(
                  `double pp${indIndex}R2 = pp${indIndex}Pivot + 0.618 * pp${indIndex}Rng;`
                );
                code.onTick.push(
                  `double pp${indIndex}S2 = pp${indIndex}Pivot - 0.618 * pp${indIndex}Rng;`
                );
                code.onTick.push(
                  `double pp${indIndex}R3 = pp${indIndex}Pivot + 1.000 * pp${indIndex}Rng;`
                );
                code.onTick.push(
                  `double pp${indIndex}S3 = pp${indIndex}Pivot - 1.000 * pp${indIndex}Rng;`
                );
              } else {
                // CLASSIC or WOODIE (same S/R formula)
                code.onTick.push(
                  `double pp${indIndex}R1 = 2.0 * pp${indIndex}Pivot - pp${indIndex}L;`
                );
                code.onTick.push(
                  `double pp${indIndex}S1 = 2.0 * pp${indIndex}Pivot - pp${indIndex}H;`
                );
                code.onTick.push(
                  `double pp${indIndex}R2 = pp${indIndex}Pivot + (pp${indIndex}H - pp${indIndex}L);`
                );
                code.onTick.push(
                  `double pp${indIndex}S2 = pp${indIndex}Pivot - (pp${indIndex}H - pp${indIndex}L);`
                );
                code.onTick.push(
                  `double pp${indIndex}R3 = 2.0 * pp${indIndex}Pivot + (pp${indIndex}H - 2.0 * pp${indIndex}L);`
                );
                code.onTick.push(
                  `double pp${indIndex}S3 = 2.0 * pp${indIndex}Pivot - (2.0 * pp${indIndex}H - pp${indIndex}L);`
                );
              }

              const ppLevelMap: Record<string, string> = {
                PIVOT: `pp${indIndex}Pivot`,
                S1: `pp${indIndex}S1`,
                S2: `pp${indIndex}S2`,
                S3: `pp${indIndex}S3`,
                R1: `pp${indIndex}R1`,
                R2: `pp${indIndex}R2`,
                R3: `pp${indIndex}R3`,
              };
              const targetVar = ppLevelMap[pivotTarget] ?? `pp${indIndex}Pivot`;

              if (pivotEntryMode === "BREAKOUT") {
                buyConditions.push(
                  `(DoubleLE(iClose(_Symbol, PERIOD_CURRENT, ${2 + s}), ${targetVar}) && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
                );
                sellConditions.push(
                  `(DoubleGE(iClose(_Symbol, PERIOD_CURRENT, ${2 + s}), ${targetVar}) && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
                );
              } else {
                // BOUNCE (default): price touches level and bounces
                buyConditions.push(
                  `(DoubleLE(iLow(_Symbol, PERIOD_CURRENT, ${1 + s}), ${targetVar}) && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
                );
                sellConditions.push(
                  `(DoubleGE(iHigh(_Symbol, PERIOD_CURRENT, ${1 + s}), ${targetVar}) && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
                );
              }
              break;
            }

            // Regular moving average logic
            const requireBuffer = "_requireEmaBuffer" in indData && indData._requireEmaBuffer;
            if (requireBuffer) {
              code.inputs.push(
                createInput(
                  indNode,
                  "_pullbackMaxDistance",
                  "InpPullbackMaxDist",
                  "double",
                  Number(
                    ("_pullbackMaxDistance" in indData && indData._pullbackMaxDistance) || 2.0
                  ),
                  "Max Distance from EMA (%)",
                  "Trend Pullback"
                )
              );
              // Buy: price > EMA (uptrend) AND price within maxDistance% of EMA (pulled back near EMA)
              buyConditions.push(
                `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]) && (iClose(_Symbol, PERIOD_CURRENT, ${1 + s}) - ${varPrefix}Buffer[${1 + s}]) / ${varPrefix}Buffer[${1 + s}] < InpPullbackMaxDist / 100.0)`
              );
              // Sell: price < EMA (downtrend) AND price within maxDistance% of EMA (pulled back near EMA)
              sellConditions.push(
                `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]) && (${varPrefix}Buffer[${1 + s}] - iClose(_Symbol, PERIOD_CURRENT, ${1 + s})) / ${varPrefix}Buffer[${1 + s}] < InpPullbackMaxDist / 100.0)`
              );
            } else {
              buyConditions.push(
                `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
              );
              sellConditions.push(
                `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
              );
            }
            break;
          }

          case "rsi":
            buyConditions.push(
              `(DoubleLE(${varPrefix}Buffer[${1 + s}], InpRSI${indIndex}Oversold) && DoubleGT(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Oversold))`
            );
            sellConditions.push(
              `(DoubleGE(${varPrefix}Buffer[${1 + s}], InpRSI${indIndex}Overbought) && DoubleLT(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Overbought))`
            );
            break;

          case "macd":
            // SIGNAL_CROSS: MACD main crosses signal line
            buyConditions.push(
              `(DoubleLE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleGT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
            );
            sellConditions.push(
              `(DoubleGE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleLT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
            );
            break;

          case "bollinger-bands":
            // BAND_TOUCH: price touches lower band (buy) / upper band (sell)
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

          case "adx": {
            // DI_CROSS: +DI > -DI (buy), -DI > +DI (sell) with ADX above threshold
            const diPlusBuy = `DoubleGT(${varPrefix}PlusDIBuffer[${0 + s}], ${varPrefix}MinusDIBuffer[${0 + s}])`;
            const diPlusSell = `DoubleGT(${varPrefix}MinusDIBuffer[${0 + s}], ${varPrefix}PlusDIBuffer[${0 + s}])`;
            const adxAbove = `DoubleGT(${varPrefix}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel)`;
            buyConditions.push(`(${adxAbove} && ${diPlusBuy})`);
            sellConditions.push(`(${adxAbove} && ${diPlusSell})`);
            break;
          }

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

          case "ichimoku": {
            const ichiMode =
              ("ichimokuMode" in indData ? indData.ichimokuMode : "TENKAN_KIJUN_CROSS") ??
              "TENKAN_KIJUN_CROSS";

            // Tenkan/Kijun cross conditions
            const tkBuyC = `(DoubleLE(${varPrefix}TenkanBuffer[${1 + s}], ${varPrefix}KijunBuffer[${1 + s}]) && DoubleGT(${varPrefix}TenkanBuffer[${0 + s}], ${varPrefix}KijunBuffer[${0 + s}]))`;
            const tkSellC = `(DoubleGE(${varPrefix}TenkanBuffer[${1 + s}], ${varPrefix}KijunBuffer[${1 + s}]) && DoubleLT(${varPrefix}TenkanBuffer[${0 + s}], ${varPrefix}KijunBuffer[${0 + s}]))`;

            // Price above/below cloud conditions
            const cloudBuyC = `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanABuffer[${0 + s}]) && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanBBuffer[${0 + s}]))`;
            const cloudSellC = `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanABuffer[${0 + s}]) && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanBBuffer[${0 + s}]))`;

            // Chikou Span confirmation: close 26 bars ago must be above/below the cloud AT THAT TIME
            // Chikou Span = current close plotted 26 bars back; the confirmation checks
            // whether close[26] is above SpanA[26] and SpanB[26] (cloud at that historical bar)
            const chikouBuyC = `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanABuffer[${26 + s}]) && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanBBuffer[${26 + s}]))`;
            const chikouSellC = `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanABuffer[${26 + s}]) && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanBBuffer[${26 + s}]))`;

            if (ichiMode === "TENKAN_KIJUN_CROSS") {
              buyConditions.push(
                `(${tkBuyC} && DoubleGT(${varPrefix}SpanABuffer[${0 + s}], ${varPrefix}SpanBBuffer[${0 + s}]))`
              );
              sellConditions.push(
                `(${tkSellC} && DoubleLT(${varPrefix}SpanABuffer[${0 + s}], ${varPrefix}SpanBBuffer[${0 + s}]))`
              );
            } else if (ichiMode === "PRICE_CLOUD") {
              buyConditions.push(cloudBuyC);
              sellConditions.push(cloudSellC);
            } else {
              // FULL: all three conditions combined with AND
              buyConditions.push(`(${tkBuyC} && ${cloudBuyC} && ${chikouBuyC})`);
              sellConditions.push(`(${tkSellC} && ${cloudSellC} && ${chikouSellC})`);
            }
            break;
          }

          case "vwap":
            // VWAP: price above VWAP = buy, price below VWAP = sell
            buyConditions.push(
              `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Value))`
            );
            sellConditions.push(
              `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Value))`
            );
            break;

          case "bb-squeeze":
            // BB Squeeze: breakout from squeeze = buy when close > BB middle, sell when close < BB middle
            // Squeeze state: prev bar was in squeeze (BB inside KC), current bar is not
            buyConditions.push(
              `(${varPrefix}WasSqueeze && !${varPrefix}InSqueeze && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}BBMiddle[${0 + s}]))`
            );
            sellConditions.push(
              `(${varPrefix}WasSqueeze && !${varPrefix}InSqueeze && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}BBMiddle[${0 + s}]))`
            );
            break;

          case "condition": {
            // Condition node: compares a connected indicator's buffer against a threshold
            const condData = indData as ConditionNodeData;
            const threshold = condData.threshold;

            // Find the connected source indicator via edges
            const connEdge = edges.find((e) => e.target === indNode.id);
            if (!connEdge) break;

            const sourceInd = indicatorNodes.find((n) => n.id === connEdge.source);
            if (!sourceInd) break;

            const sourceIndex = indicatorNodes.indexOf(sourceInd);
            const srcPrefix = `ind${sourceIndex}`;
            const srcData = sourceInd.data;

            // Determine the correct buffer name for the source indicator
            let bufName = `${srcPrefix}Buffer`;
            if ("indicatorType" in srcData) {
              switch (srcData.indicatorType) {
                case "macd":
                  bufName = `${srcPrefix}MainBuffer`;
                  break;
                case "adx":
                  bufName = `${srcPrefix}MainBuffer`;
                  break;
                case "stochastic":
                  bufName = `${srcPrefix}MainBuffer`;
                  break;
                case "ichimoku":
                  bufName = `${srcPrefix}TenkanBuffer`;
                  break;
                case "bollinger-bands":
                  bufName = `${srcPrefix}MiddleBuffer`;
                  break;
              }
            }

            // Use the source indicator's signal mode for bar offset
            const cs = "signalMode" in srcData && srcData.signalMode === "candle_close" ? 1 : 0;

            switch (condData.conditionType) {
              case "GREATER_THAN":
                buyConditions.push(`(DoubleGT(${bufName}[${cs}], ${threshold}))`);
                sellConditions.push(`(DoubleLT(${bufName}[${cs}], ${threshold}))`);
                break;
              case "LESS_THAN":
                buyConditions.push(`(DoubleLT(${bufName}[${cs}], ${threshold}))`);
                sellConditions.push(`(DoubleGT(${bufName}[${cs}], ${threshold}))`);
                break;
              case "GREATER_EQUAL":
                buyConditions.push(`(DoubleGE(${bufName}[${cs}], ${threshold}))`);
                sellConditions.push(`(DoubleLE(${bufName}[${cs}], ${threshold}))`);
                break;
              case "LESS_EQUAL":
                buyConditions.push(`(DoubleLE(${bufName}[${cs}], ${threshold}))`);
                sellConditions.push(`(DoubleGE(${bufName}[${cs}], ${threshold}))`);
                break;
              case "EQUAL":
                buyConditions.push(`(MathAbs(${bufName}[${cs}] - ${threshold}) < 1e-8)`);
                sellConditions.push(`(MathAbs(${bufName}[${cs}] - ${threshold}) < 1e-8)`);
                break;
              case "CROSSES_ABOVE":
                buyConditions.push(
                  `(DoubleLE(${bufName}[${1 + cs}], ${threshold}) && DoubleGT(${bufName}[${cs}], ${threshold}))`
                );
                sellConditions.push(
                  `(DoubleGE(${bufName}[${1 + cs}], ${threshold}) && DoubleLT(${bufName}[${cs}], ${threshold}))`
                );
                break;
              case "CROSSES_BELOW":
                buyConditions.push(
                  `(DoubleGE(${bufName}[${1 + cs}], ${threshold}) && DoubleLT(${bufName}[${cs}], ${threshold}))`
                );
                sellConditions.push(
                  `(DoubleLE(${bufName}[${1 + cs}], ${threshold}) && DoubleGT(${bufName}[${cs}], ${threshold}))`
                );
                break;
            }
            break;
          }
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

    // Fix 10: Warn when direction is BOTH but only one side has real conditions
    const buyIsAlwaysFalse = buyConditions.length === 1 && buyConditions[0] === "false";
    const sellIsAlwaysFalse = sellConditions.length === 1 && sellConditions[0] === "false";
    if (hasBuyNode && hasSellNode) {
      if (buyIsAlwaysFalse && !sellIsAlwaysFalse) {
        code.onTick.push(
          "// WARNING: Direction is BOTH but no BUY entry conditions were generated."
        );
        code.onTick.push(
          "// The EA will only open SELL positions. Add buy-side indicator conditions or change direction to SELL."
        );
      } else if (!buyIsAlwaysFalse && sellIsAlwaysFalse) {
        code.onTick.push(
          "// WARNING: Direction is BOTH but no SELL entry conditions were generated."
        );
        code.onTick.push(
          "// The EA will only open BUY positions. Add sell-side indicator conditions or change direction to BUY."
        );
      }
    }

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

  // Detect signal mode: if any signal indicator uses candle_close, use isNewBar for signal evaluation
  const useCandleClose = indicatorNodes.some((n) => {
    const d = n.data as Record<string, unknown>;
    return d.signalMode === "candle_close";
  });

  // One-trade-per-bar protection (reuse currentBarTime declared in OnTick template)
  code.globalVariables.push("datetime lastEntryBar = 0; // Prevent multiple entries per bar");
  code.onTick.push("");

  if (useCandleClose) {
    // candle_close mode: only evaluate signals once per new bar (confirmed close)
    // Buffer indices are shifted by +1 so only closed bar data is used
    code.onTick.push("//--- Signal Mode: candle_close -- evaluate only on new bar");
    code.onTick.push("if(!isNewBar) { /* Skip signal evaluation until new bar */ }");
    code.onTick.push("else {");
    code.onTick.push("");
  } else if (hasConditions) {
    // every_tick mode: evaluate signals on every tick using current bar data
    // The newBar check below prevents multiple entries on the same bar
    code.onTick.push("//--- Signal Mode: every_tick -- evaluate on every tick, enter once per bar");
  }

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

    // Check if close-on-opposite is enabled (from virtual node data)
    const closeOnOppositeBuy = buyNode
      ? (buyNode.data as Record<string, unknown>)._closeOnOpposite === true
      : false;
    const closeOnOppositeSell = sellNode
      ? (sellNode.data as Record<string, unknown>)._closeOnOpposite === true
      : false;

    // Only generate buy logic if there's a Place Buy node
    if (hasBuyNode) {
      // When closeOnOpposite is enabled, skip the opposite-position check since we'll close them
      const buyCheck =
        noHedge && !closeOnOppositeBuy
          ? `   if(buyCondition && CountPositionsByType(POSITION_TYPE_BUY) < ${ctx.maxBuyPositions} && CountPositionsByType(POSITION_TYPE_SELL) == 0)`
          : `   if(buyCondition && CountPositionsByType(POSITION_TYPE_BUY) < ${ctx.maxBuyPositions})`;
      code.onTick.push(buyCheck);
      code.onTick.push("   {");
      if (closeOnOppositeBuy) {
        code.onTick.push("      CloseSellPositions(); // Close opposite on buy signal");
      }

      const minBarsTrack =
        ctx.minBarsBetweenTrades > 0 ? " gLastTradeBar = iBars(_Symbol, PERIOD_CURRENT);" : "";
      if (buyOrderType === "MARKET") {
        if (hasDaily) {
          code.onTick.push(
            `      if(OpenBuy(buyLotSize, slPips, tpPips)) { lastEntryBar = currentBarTime; tradesToday++;${minBarsTrack} }`
          );
        } else {
          code.onTick.push(
            `      if(OpenBuy(buyLotSize, slPips, tpPips)) { lastEntryBar = currentBarTime;${minBarsTrack} }`
          );
        }
      } else {
        const fn = buyOrderType === "STOP" ? "PlaceBuyStop" : "PlaceBuyLimit";
        if (hasDaily) {
          code.onTick.push(
            `      if(${fn}(buyLotSize, slPips, tpPips, InpBuyPendingOffset)) { lastEntryBar = currentBarTime; tradesToday++;${minBarsTrack} }`
          );
        } else {
          code.onTick.push(
            `      if(${fn}(buyLotSize, slPips, tpPips, InpBuyPendingOffset)) { lastEntryBar = currentBarTime;${minBarsTrack} }`
          );
        }
      }
      code.onTick.push("   }");
    }

    // Only generate sell logic if there's a Place Sell node
    if (hasSellNode) {
      // When closeOnOpposite is enabled, skip the opposite-position check since we'll close them
      const sellCheck =
        noHedge && !closeOnOppositeSell
          ? `   if(sellCondition && CountPositionsByType(POSITION_TYPE_SELL) < ${ctx.maxSellPositions} && CountPositionsByType(POSITION_TYPE_BUY) == 0)`
          : `   if(sellCondition && CountPositionsByType(POSITION_TYPE_SELL) < ${ctx.maxSellPositions})`;
      code.onTick.push(sellCheck);
      code.onTick.push("   {");
      if (closeOnOppositeSell) {
        code.onTick.push("      CloseBuyPositions(); // Close opposite on sell signal");
      }
      // Use direction-aware SL for sell if available (e.g., BB-based SL)
      const sellSL = code.hasDirectionalSL ? "slSellPips" : "slPips";
      const sellTP = code.hasDirectionalSL ? "(slSellPips * InpRiskReward)" : "tpPips";
      // Only override TP if it's risk-reward based; otherwise use the same tpPips
      const sellTPVar =
        code.hasDirectionalSL && code.tpMethod === "RISK_REWARD" ? sellTP : "tpPips";

      const minBarsTrackSell =
        ctx.minBarsBetweenTrades > 0 ? " gLastTradeBar = iBars(_Symbol, PERIOD_CURRENT);" : "";
      if (sellOrderType === "MARKET") {
        if (hasDaily) {
          code.onTick.push(
            `      if(OpenSell(sellLotSize, ${sellSL}, ${sellTPVar})) { lastEntryBar = currentBarTime; tradesToday++;${minBarsTrackSell} }`
          );
        } else {
          code.onTick.push(
            `      if(OpenSell(sellLotSize, ${sellSL}, ${sellTPVar})) { lastEntryBar = currentBarTime;${minBarsTrackSell} }`
          );
        }
      } else {
        const fn = sellOrderType === "STOP" ? "PlaceSellStop" : "PlaceSellLimit";
        if (hasDaily) {
          code.onTick.push(
            `      if(${fn}(sellLotSize, ${sellSL}, ${sellTPVar}, InpSellPendingOffset)) { lastEntryBar = currentBarTime; tradesToday++;${minBarsTrackSell} }`
          );
        } else {
          code.onTick.push(
            `      if(${fn}(sellLotSize, ${sellSL}, ${sellTPVar}, InpSellPendingOffset)) { lastEntryBar = currentBarTime;${minBarsTrackSell} }`
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

    // Volume confirmation filter for range breakout
    const rbPAData = priceActionNodes[rangeBreakoutPAIndex].data as Record<string, unknown>;
    const hasVolumeConfirm = rbPAData._volumeConfirmation === true;
    const volPeriod = (rbPAData._volumeConfirmationPeriod as number) ?? 20;
    if (hasVolumeConfirm) {
      code.inputs.push({
        name: "InpVolConfirmPeriod",
        type: "int",
        value: volPeriod,
        comment: "Volume Confirmation Period",
        isOptimizable: true,
        group: "Range Breakout",
      });
    }

    code.onTick.push("");
    code.onTick.push("//--- Range Breakout Pending Orders");
    if (hasVolumeConfirm) {
      code.onTick.push(`bool volumeOK = true;`);
      code.onTick.push(`{`);
      code.onTick.push(`   long vol = iVolume(_Symbol, PERIOD_CURRENT, 1);`);
      code.onTick.push(`   double avgVol = 0;`);
      code.onTick.push(
        `   for(int v=2; v<=InpVolConfirmPeriod+1; v++) avgVol += (double)iVolume(_Symbol, PERIOD_CURRENT, v);`
      );
      code.onTick.push(`   avgVol /= InpVolConfirmPeriod;`);
      code.onTick.push(`   volumeOK = vol > avgVol;`);
      code.onTick.push(`}`);
      code.onTick.push(`if(${pv}NewRange && volumeOK)`);
    } else {
      code.onTick.push(`if(${pv}NewRange)`);
    }
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
    if (code.slMethod === "RANGE_OPPOSITE") {
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
    const hasSharedRisk = code.inputs.some((i) => i.name === "InpRiskPercent");
    const hasBuyRisk = hasSharedRisk || code.inputs.some((i) => i.name === "InpBuyRiskPercent");
    const hasSellRisk = hasSharedRisk || code.inputs.some((i) => i.name === "InpSellRiskPercent");
    const buyRiskInput = hasSharedRisk ? "InpRiskPercent" : "InpBuyRiskPercent";
    const sellRiskInput = hasSharedRisk ? "InpRiskPercent" : "InpSellRiskPercent";
    if (hasBuyRisk) {
      code.onTick.push(`   double pendBuyLot = CalculateLotSize(${buyRiskInput}, pendBuySLDist);`);
      code.onTick.push(`   pendBuyLot = MathMax(InpBuyMinLot, MathMin(InpBuyMaxLot, pendBuyLot));`);
    } else {
      code.onTick.push(`   double pendBuyLot = buyLotSize;`);
    }
    if (hasSellRisk) {
      code.onTick.push(
        `   double pendSellLot = CalculateLotSize(${sellRiskInput}, pendSellSLDist);`
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

  // Close candle_close signal evaluation block
  if (useCandleClose) {
    code.onTick.push("");
    code.onTick.push("} // end candle_close signal evaluation");
  }
}

function addPendingOrderHelpers(code: GeneratedCode, ctx: GeneratorContext): void {
  const comment = sanitizeMQL5String(ctx.comment);

  code.inputs.push({
    name: "InpPendingExpiryHours",
    type: "int",
    value: 24,
    comment: "Pending Order Expiry (hours, 0=no expiry)",
    isOptimizable: false,
    group: "Pending Orders",
  });

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Get pending order expiry time                                      |
//+------------------------------------------------------------------+
datetime GetPendingExpiry()
{
   if(InpPendingExpiryHours <= 0) return 0;
   return TimeCurrent() + InpPendingExpiryHours * 3600;
}

//+------------------------------------------------------------------+
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
   double stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(ask + stopsLevel, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice - sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice + tp * _Point, _Digits) : 0;
   datetime expiry = GetPendingExpiry();
   ENUM_ORDER_TYPE_TIME timeType = (expiry > 0) ? ORDER_TIME_SPECIFIED : ORDER_TIME_GTC;

   if(trade.BuyStop(lots, entryPrice, _Symbol, slPrice, tpPrice, timeType, expiry, "${comment}"))
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
   double stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(ask - stopsLevel, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice - sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice + tp * _Point, _Digits) : 0;
   datetime expiry = GetPendingExpiry();
   ENUM_ORDER_TYPE_TIME timeType = (expiry > 0) ? ORDER_TIME_SPECIFIED : ORDER_TIME_GTC;

   if(trade.BuyLimit(lots, entryPrice, _Symbol, slPrice, tpPrice, timeType, expiry, "${comment}"))
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
   double stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(bid - stopsLevel, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice + sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice - tp * _Point, _Digits) : 0;
   datetime expiry = GetPendingExpiry();
   ENUM_ORDER_TYPE_TIME timeType = (expiry > 0) ? ORDER_TIME_SPECIFIED : ORDER_TIME_GTC;

   if(trade.SellStop(lots, entryPrice, _Symbol, slPrice, tpPrice, timeType, expiry, "${comment}"))
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
   double stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(bid + stopsLevel, _Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice + sl * _Point, _Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice - tp * _Point, _Digits) : 0;
   datetime expiry = GetPendingExpiry();
   ENUM_ORDER_TYPE_TIME timeType = (expiry > 0) ? ORDER_TIME_SPECIFIED : ORDER_TIME_GTC;

   if(trade.SellLimit(lots, entryPrice, _Symbol, slPrice, tpPrice, timeType, expiry, "${comment}"))
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
    `         if(Bars(_Symbol, ${getTimeframe(data.exitTimeframe)}) < InpTimeExitBars + 10) continue;`
  );
  code.onTick.push(
    `         int barsSinceEntry = iBarShift(_Symbol, ${getTimeframe(data.exitTimeframe)}, openTime);`
  );
  code.onTick.push("         if(barsSinceEntry < 0) continue; // iBarShift failed");
  code.onTick.push("         if(barsSinceEntry >= InpTimeExitBars)");
  code.onTick.push("         {");
  code.onTick.push("            trade.PositionClose(ticket);");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

export function generateGridPyramidCode(
  node: BuilderNode,
  code: GeneratedCode,
  ctx: GeneratorContext
): void {
  const data = node.data as GridPyramidNodeData;
  const group = "Grid/Pyramid";
  const comment = sanitizeMQL5String(ctx.comment);

  code.inputs.push(
    createInput(
      node,
      "gridSpacing",
      "InpGridSpacing",
      "double",
      data.gridSpacing,
      "Grid Spacing (pips)",
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "maxGridLevels",
      "InpMaxGridLevels",
      "int",
      data.maxGridLevels,
      "Max Grid Levels",
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "lotMultiplier",
      "InpGridLotMultiplier",
      "double",
      data.lotMultiplier,
      "Lot Multiplier",
      group
    )
  );

  code.globalVariables.push("double gridBasePrice = 0;");
  code.globalVariables.push("datetime gridLastBarTime = 0; // Bar-based throttle for grid/pyramid");

  code.onTick.push("");
  code.onTick.push("//--- Grid/Pyramid Management");

  if (data.gridMode === "GRID") {
    // GRID mode: place orders at fixed intervals from the base price
    code.onTick.push("// Grid Mode: place orders at fixed intervals");
    code.onTick.push("{");
    code.onTick.push("   double spacing = InpGridSpacing * _pipFactor * _Point;");
    code.onTick.push("   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);");
    code.onTick.push("   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
    code.onTick.push("");
    code.onTick.push("   // Count ACTUAL open positions (not a stale counter)");
    code.onTick.push("   int gridOpenCount = 0;");
    code.onTick.push("   for(int i = 0; i < PositionsTotal(); i++)");
    code.onTick.push("   {");
    code.onTick.push("      ulong ticket = PositionGetTicket(i);");
    code.onTick.push(
      "      if(PositionSelectByTicket(ticket) && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
    );
    code.onTick.push("         gridOpenCount++;");
    code.onTick.push("   }");
    code.onTick.push("");
    code.onTick.push("   // Reset base price when all positions closed (new grid cycle)");
    code.onTick.push("   if(gridOpenCount == 0) gridBasePrice = 0;");
    code.onTick.push("");
    code.onTick.push("   // Initialize grid base price from first position");
    code.onTick.push("   if(gridBasePrice == 0 && gridOpenCount > 0)");
    code.onTick.push("   {");
    code.onTick.push("      for(int i = 0; i < PositionsTotal(); i++)");
    code.onTick.push("      {");
    code.onTick.push("         ulong ticket = PositionGetTicket(i);");
    code.onTick.push(
      "         if(PositionSelectByTicket(ticket) && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
    );
    code.onTick.push("         { gridBasePrice = PositionGetDouble(POSITION_PRICE_OPEN); break; }");
    code.onTick.push("      }");
    code.onTick.push("   }");
    code.onTick.push("");
    code.onTick.push("   // Bar-based throttle: only place one grid order per bar");
    code.onTick.push("   datetime gridBarTime = iTime(_Symbol, PERIOD_CURRENT, 0);");
    code.onTick.push("   bool gridNewBar = (gridBarTime != gridLastBarTime);");
    code.onTick.push("");
    code.onTick.push("   if(gridBasePrice > 0 && gridOpenCount < InpMaxGridLevels && gridNewBar)");
    code.onTick.push("   {");
    code.onTick.push("      // Check if price is at a grid level not already occupied");
    code.onTick.push("      double lotSize = InpBuyLotSize;");
    code.onTick.push("      if(InpGridLotMultiplier != 1.0)");
    code.onTick.push(
      "         lotSize = NormalizeDouble(lotSize * MathPow(InpGridLotMultiplier, gridOpenCount), 2);"
    );
    code.onTick.push("");
    code.onTick.push("      // Check each level to find one that matches current price");
    code.onTick.push("      for(int lvl = 1; lvl <= InpMaxGridLevels; lvl++)");
    code.onTick.push("      {");
    code.onTick.push("         double levelUp = gridBasePrice + lvl * spacing;");
    code.onTick.push("         double levelDown = gridBasePrice - lvl * spacing;");
    code.onTick.push("");
    code.onTick.push(
      "         // Check if a position already exists at this level (deduplication)"
    );
    code.onTick.push("         bool levelOccupied = false;");
    code.onTick.push("         for(int p = 0; p < PositionsTotal(); p++)");
    code.onTick.push("         {");
    code.onTick.push("            ulong pt = PositionGetTicket(p);");
    code.onTick.push(
      "            if(!PositionSelectByTicket(pt) || PositionGetInteger(POSITION_MAGIC) != InpMagicNumber || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;"
    );
    code.onTick.push("            double poPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
    code.onTick.push(
      "            if(MathAbs(poPrice - levelUp) < spacing * 0.3 || MathAbs(poPrice - levelDown) < spacing * 0.3)"
    );
    code.onTick.push("            { levelOccupied = true; break; }");
    code.onTick.push("         }");
    code.onTick.push("         if(levelOccupied) continue;");

    if (data.direction === "BUY_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("         // Buy grid: place buy when price drops to level");
      code.onTick.push(
        "         if(bid <= levelDown + spacing * 0.1 && bid >= levelDown - spacing * 0.3)"
      );
      code.onTick.push("         {");
      code.onTick.push(`            if(trade.Buy(lotSize, _Symbol, 0, 0, 0, "${comment} Grid"))`);
      code.onTick.push("            { gridLastBarTime = gridBarTime; break; }");
      code.onTick.push("         }");
    }

    if (data.direction === "SELL_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("         // Sell grid: place sell when price rises to level");
      code.onTick.push(
        "         if(ask >= levelUp - spacing * 0.1 && ask <= levelUp + spacing * 0.3)"
      );
      code.onTick.push("         {");
      code.onTick.push(`            if(trade.Sell(lotSize, _Symbol, 0, 0, 0, "${comment} Grid"))`);
      code.onTick.push("            { gridLastBarTime = gridBarTime; break; }");
      code.onTick.push("         }");
    }

    code.onTick.push("      } // end level loop");
    code.onTick.push("   }");
    code.onTick.push("}");
  } else {
    // PYRAMID mode: add to winning positions at each spacing interval
    code.onTick.push("// Pyramid Mode: add to winning positions");
    code.onTick.push("{");
    code.onTick.push("   double spacing = InpGridSpacing * _pipFactor * _Point;");
    code.onTick.push("   datetime pyramidBarTime = iTime(_Symbol, PERIOD_CURRENT, 0);");
    code.onTick.push("   bool pyramidNewBar = (pyramidBarTime != gridLastBarTime);");
    code.onTick.push("");
    code.onTick.push("   // Count actual open positions");
    code.onTick.push("   int pyramidCount = 0;");
    code.onTick.push("   for(int c = 0; c < PositionsTotal(); c++)");
    code.onTick.push("   {");
    code.onTick.push("      ulong ct = PositionGetTicket(c);");
    code.onTick.push(
      "      if(PositionSelectByTicket(ct) && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
    );
    code.onTick.push("         pyramidCount++;");
    code.onTick.push("   }");
    code.onTick.push("");
    code.onTick.push("   if(pyramidCount < InpMaxGridLevels && pyramidNewBar)");
    code.onTick.push("   {");
    code.onTick.push("      // Process ALL winning positions (not just the most recent)");
    code.onTick.push("      for(int i = PositionsTotal() - 1; i >= 0; i--)");
    code.onTick.push("      {");
    code.onTick.push("         ulong ticket = PositionGetTicket(i);");
    code.onTick.push("         if(!PositionSelectByTicket(ticket)) continue;");
    code.onTick.push(
      "         if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;"
    );
    code.onTick.push("");
    code.onTick.push("         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
    code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");
    code.onTick.push("         double volume = PositionGetDouble(POSITION_VOLUME);");
    code.onTick.push("");
    code.onTick.push("         // Re-check count inside loop (may have just added)");
    code.onTick.push("         if(pyramidCount >= InpMaxGridLevels) break;");
    code.onTick.push("");
    code.onTick.push(
      "         double nextLotSize = NormalizeDouble(volume * InpGridLotMultiplier, 2);"
    );
    code.onTick.push("         double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);");
    code.onTick.push("         if(nextLotSize < minLot) nextLotSize = minLot;");

    if (data.direction === "BUY_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("         if(posType == POSITION_TYPE_BUY)");
      code.onTick.push("         {");
      code.onTick.push("            double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
      code.onTick.push("            if(bid >= openPrice + spacing)");
      code.onTick.push("            {");
      code.onTick.push(
        `               if(trade.Buy(nextLotSize, _Symbol, 0, 0, 0, "${comment} Pyramid"))`
      );
      code.onTick.push("               { gridLastBarTime = pyramidBarTime; pyramidCount++; }");
      code.onTick.push("            }");
      code.onTick.push("         }");
    }

    if (data.direction === "SELL_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("         if(posType == POSITION_TYPE_SELL)");
      code.onTick.push("         {");
      code.onTick.push("            double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);");
      code.onTick.push("            if(ask <= openPrice - spacing)");
      code.onTick.push("            {");
      code.onTick.push(
        `               if(trade.Sell(nextLotSize, _Symbol, 0, 0, 0, "${comment} Pyramid"))`
      );
      code.onTick.push("               { gridLastBarTime = pyramidBarTime; pyramidCount++; }");
      code.onTick.push("            }");
      code.onTick.push("         }");
    }

    code.onTick.push("      } // end position loop");
    code.onTick.push("   }");
    code.onTick.push("}");
  }
}
