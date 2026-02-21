import type {
  BuilderNode,
  BuilderEdge,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  TimeExitNodeData,
  GridPyramidNodeData,
  ConditionNodeData,
} from "@/types/builder";
import type { GeneratorContext, GeneratedCode } from "../types";
import { getTimeframe, getTimeframeEnum } from "../types";
import { createInput, sanitizeMQL4String } from "./shared";
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
            `   double pendEntry = Ask ${dir} InpBuyPendingOffset * _pipFactor * _Point;`
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
            `   double pendEntry = Bid ${dir} InpSellPendingOffset * _pipFactor * _Point;`
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
      code.onTick.push("double slPips = (Ask * InpSLPercent / 100.0) / _Point;");
      code.onTick.push("double slSellPips = (Bid * InpSLPercent / 100.0) / _Point;");
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
      // MQL4: iATR returns value directly, no handles/buffers needed
      code.onTick.push(
        `double _atrValue = iATR(Symbol(), (int)InpATRSLTimeframe, InpATRPeriod, 0);`
      );
      code.onTick.push('if(_atrValue == 0) { Print("ATR value is zero for SL"); return; }');
      code.onTick.push("double slPips = (_atrValue / _Point) * InpATRMultiplier;");
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
  code.onTick.push(`double slPips = MathMax((Ask - ${prefix}Low) / _Point, 10 * _pipFactor);`);
  code.onTick.push(`double slSellPips = MathMax((${prefix}High - Bid) / _Point, 10 * _pipFactor);`);
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
        code.onTick.push("double currentPrice = Bid;");
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
        code.onTick.push("double currentPrice = Bid;");
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
      // Check if SL already created an ATR value; if so, reuse it
      const hasAtrSL = code.onTick.some((v) => v.includes("_atrValue"));
      if (hasAtrSL) {
        code.onTick.push("double tpPips = (_atrValue / _Point) * InpTPATRMultiplier;");
      } else {
        // Create a dedicated ATR call for TP
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
        // MQL4: iATR returns value directly, no handles/buffers needed
        code.onTick.push("double _tpAtrValue = iATR(Symbol(), PERIOD_CURRENT, InpTPATRPeriod, 0);");
        code.onTick.push('if(_tpAtrValue == 0) { Print("ATR value is zero for TP"); return; }');
        code.onTick.push("double tpPips = (_tpAtrValue / _Point) * InpTPATRMultiplier;");
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
        buyConditions.push(`(DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${s}), ${vp}Buffer[0]))`);
        sellConditions.push(`(DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${s}), ${vp}Buffer[0]))`);
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
      code.onInit.push(`ArrayResize(${divPriceVar}Low, InpDivLookback${indIndex}+2);`);
      code.onInit.push(`ArrayResize(${divPriceVar}High, InpDivLookback${indIndex}+2);`);

      // Get the timeframe from the indicator's input variable
      let tfVar: string;
      if (indType === "rsi") {
        tfVar = `(int)InpRSI${indIndex}Timeframe`;
      } else {
        tfVar = `(int)InpMACD${indIndex}Timeframe`;
      }

      // Fill price arrays in OnTick using MQL4 direct calls
      code.onTick.push(`//--- Divergence ${indIndex + 1}: fill price arrays`);
      code.onTick.push(
        `for(int _dp${indIndex}=0; _dp${indIndex}<InpDivLookback${indIndex}+2; _dp${indIndex}++)`
      );
      code.onTick.push(`{`);
      code.onTick.push(
        `   ${divPriceVar}Low[_dp${indIndex}] = iLow(Symbol(), ${tfVar}, _dp${indIndex});`
      );
      code.onTick.push(
        `   ${divPriceVar}High[_dp${indIndex}] = iHigh(Symbol(), ${tfVar}, _dp${indIndex});`
      );
      code.onTick.push(`}`);

      // Determine which indicator buffer to use for divergence comparison
      const indBuffer = indType === "macd" ? `${varPrefix}MainBuffer` : `${varPrefix}Buffer`;

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
              code.onTick.push(
                `double fib${indIndex}SwHigh = iHigh(Symbol(), PERIOD_CURRENT, iHighest(Symbol(), PERIOD_CURRENT, MODE_HIGH, InpFib${indIndex}Lookback, 0));`
              );
              code.onTick.push(
                `double fib${indIndex}SwLow = iLow(Symbol(), PERIOD_CURRENT, iLowest(Symbol(), PERIOD_CURRENT, MODE_LOW, InpFib${indIndex}Lookback, 0));`
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
                  `(fib${indIndex}Range > 0 && DoubleLE(iClose(Symbol(), PERIOD_CURRENT, ${2 + s}), fib${indIndex}BuyLvl) && DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), fib${indIndex}BuyLvl))`
                );
                sellConditions.push(
                  `(fib${indIndex}Range > 0 && DoubleGE(iClose(Symbol(), PERIOD_CURRENT, ${2 + s}), fib${indIndex}SellLvl) && DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), fib${indIndex}SellLvl))`
                );
              } else {
                // BOUNCE (default): price touches fib level and bounces
                buyConditions.push(
                  `(fib${indIndex}Range > 0 && DoubleLE(iLow(Symbol(), PERIOD_CURRENT, ${1 + s}), fib${indIndex}BuyLvl) && DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), fib${indIndex}BuyLvl))`
                );
                sellConditions.push(
                  `(fib${indIndex}Range > 0 && DoubleGE(iHigh(Symbol(), PERIOD_CURRENT, ${1 + s}), fib${indIndex}SellLvl) && DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), fib${indIndex}SellLvl))`
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
              code.onTick.push(`double pp${indIndex}H = iHigh(Symbol(), ${ppTf}, 1);`);
              code.onTick.push(`double pp${indIndex}L = iLow(Symbol(), ${ppTf}, 1);`);
              code.onTick.push(`double pp${indIndex}C = iClose(Symbol(), ${ppTf}, 1);`);

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
                  `(DoubleLE(iClose(Symbol(), PERIOD_CURRENT, ${2 + s}), ${targetVar}) && DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
                );
                sellConditions.push(
                  `(DoubleGE(iClose(Symbol(), PERIOD_CURRENT, ${2 + s}), ${targetVar}) && DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
                );
              } else {
                // BOUNCE (default): price touches level and bounces
                buyConditions.push(
                  `(DoubleLE(iLow(Symbol(), PERIOD_CURRENT, ${1 + s}), ${targetVar}) && DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
                );
                sellConditions.push(
                  `(DoubleGE(iHigh(Symbol(), PERIOD_CURRENT, ${1 + s}), ${targetVar}) && DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${targetVar}))`
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
                `(DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]) && (iClose(Symbol(), PERIOD_CURRENT, ${1 + s}) - ${varPrefix}Buffer[${1 + s}]) / ${varPrefix}Buffer[${1 + s}] < InpPullbackMaxDist / 100.0)`
              );
              // Sell: price < EMA (downtrend) AND price within maxDistance% of EMA (pulled back near EMA)
              sellConditions.push(
                `(DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]) && (${varPrefix}Buffer[${1 + s}] - iClose(Symbol(), PERIOD_CURRENT, ${1 + s})) / ${varPrefix}Buffer[${1 + s}] < InpPullbackMaxDist / 100.0)`
              );
            } else {
              buyConditions.push(
                `(DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
              );
              sellConditions.push(
                `(DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
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
              `(DoubleLE(iLow(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}LowerBuffer[${1 + s}]))`
            );
            sellConditions.push(
              `(DoubleGE(iHigh(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}UpperBuffer[${1 + s}]))`
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
            const cloudBuyC = `(DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanABuffer[${0 + s}]) && DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanBBuffer[${0 + s}]))`;
            const cloudSellC = `(DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanABuffer[${0 + s}]) && DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanBBuffer[${0 + s}]))`;

            // Chikou Span confirmation: close 26 bars ago must be above/below the cloud AT THAT TIME
            const chikouBuyC = `(DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanABuffer[${26 + s}]) && DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanBBuffer[${26 + s}]))`;
            const chikouSellC = `(DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanABuffer[${26 + s}]) && DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${26 + s}), ${varPrefix}SpanBBuffer[${26 + s}]))`;

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
              `(DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${0 + s}]))`
            );
            sellConditions.push(
              `(DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${0 + s}]))`
            );
            break;

          case "bb-squeeze":
            // BB Squeeze: breakout from squeeze = buy when close > BB middle, sell when close < BB middle
            buyConditions.push(
              `(${varPrefix}WasSqueeze && !${varPrefix}InSqueeze && DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${0 + s}), ${varPrefix}BBMiddle[${0 + s}]))`
            );
            sellConditions.push(
              `(${varPrefix}WasSqueeze && !${varPrefix}InSqueeze && DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${0 + s}), ${varPrefix}BBMiddle[${0 + s}]))`
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
    code.onTick.push("datetime today = iTime(Symbol(), PERIOD_D1, 0);");
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
          ? `   if(buyCondition && CountPositionsByType(OP_BUY) < ${ctx.maxBuyPositions} && CountPositionsByType(OP_SELL) == 0)`
          : `   if(buyCondition && CountPositionsByType(OP_BUY) < ${ctx.maxBuyPositions})`;
      code.onTick.push(buyCheck);
      code.onTick.push("   {");
      if (closeOnOppositeBuy) {
        code.onTick.push("      CloseSellPositions(); // Close opposite on buy signal");
      }

      const minBarsTrack = ctx.minBarsBetweenTrades > 0 ? " gLastTradeBar = Bars;" : "";
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
          ? `   if(sellCondition && CountPositionsByType(OP_SELL) < ${ctx.maxSellPositions} && CountPositionsByType(OP_BUY) == 0)`
          : `   if(sellCondition && CountPositionsByType(OP_SELL) < ${ctx.maxSellPositions})`;
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

      const minBarsTrackSell = ctx.minBarsBetweenTrades > 0 ? " gLastTradeBar = Bars;" : "";
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
    const comment = sanitizeMQL4String(ctx.comment);
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
      code.onTick.push(`   long vol = iVolume(Symbol(), PERIOD_CURRENT, 1);`);
      code.onTick.push(`   double avgVol = 0;`);
      code.onTick.push(
        `   for(int v=2; v<=InpVolConfirmPeriod+1; v++) avgVol += (double)iVolume(Symbol(), PERIOD_CURRENT, v);`
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
    code.onTick.push("      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))");
    code.onTick.push("      {");
    code.onTick.push(
      "         if(OrderType() > OP_SELL && OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())"
    );
    code.onTick.push("            OrderDelete(OrderTicket());");
    code.onTick.push("      }");
    code.onTick.push("   }");
    code.onTick.push("");

    // Calculate entry prices
    code.onTick.push(`   double bufferPts = InpRange${pi}Buffer * _pipFactor * _Point;`);
    code.onTick.push(`   double buyStopPrice = NormalizeDouble(${pv}High + bufferPts, Digits);`);
    code.onTick.push(`   double sellStopPrice = NormalizeDouble(${pv}Low - bufferPts, Digits);`);
    code.onTick.push("");

    // SL calculation — from pending entry price (not current market price)
    if (code.slMethod === "RANGE_OPPOSITE") {
      // RANGE_OPPOSITE: SL at opposite range boundary
      code.onTick.push(`   // SL at opposite side of range`);
      code.onTick.push(`   double pendBuySL = NormalizeDouble(${pv}Low - bufferPts, Digits);`);
      code.onTick.push(`   double pendSellSL = NormalizeDouble(${pv}High + bufferPts, Digits);`);
    } else if (code.slMethod === "PERCENT") {
      // PERCENT: recalculate SL based on pending entry price, not current Ask
      code.onTick.push(`   double pendBuySLPips = (buyStopPrice * InpSLPercent / 100.0) / _Point;`);
      code.onTick.push(
        `   double pendBuySL = NormalizeDouble(buyStopPrice - pendBuySLPips * _Point, Digits);`
      );
      code.onTick.push(
        `   double pendSellSLPips = (sellStopPrice * InpSLPercent / 100.0) / _Point;`
      );
      code.onTick.push(
        `   double pendSellSL = NormalizeDouble(sellStopPrice + pendSellSLPips * _Point, Digits);`
      );
    } else {
      // ATR/FIXED: use slPips (distance-based, doesn't depend on entry price)
      code.onTick.push(
        `   double pendBuySL = NormalizeDouble(buyStopPrice - slPips * _Point, Digits);`
      );
      code.onTick.push(
        `   double pendSellSL = NormalizeDouble(sellStopPrice + slPips * _Point, Digits);`
      );
    }
    code.onTick.push(`   double pendBuySLDist = (buyStopPrice - pendBuySL) / _Point;`);
    code.onTick.push(`   double pendSellSLDist = (pendSellSL - sellStopPrice) / _Point;`);
    code.onTick.push("");

    // TP calculation
    if (hasRR) {
      code.onTick.push(
        `   double pendBuyTP = NormalizeDouble(buyStopPrice + pendBuySLDist * InpRiskReward * _Point, Digits);`
      );
      code.onTick.push(
        `   double pendSellTP = NormalizeDouble(sellStopPrice - pendSellSLDist * InpRiskReward * _Point, Digits);`
      );
    } else {
      code.onTick.push(
        `   double pendBuyTP = NormalizeDouble(buyStopPrice + tpPips * _Point, Digits);`
      );
      code.onTick.push(
        `   double pendSellTP = NormalizeDouble(sellStopPrice - tpPips * _Point, Digits);`
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

    // Place pending orders (MQL4: OrderSend with OP_BUYSTOP/OP_SELLSTOP)
    if (hasBuyNode) {
      code.onTick.push(
        `   int buyTicket = OrderSend(Symbol(), OP_BUYSTOP, pendBuyLot, buyStopPrice, InpMaxSlippage, pendBuySL, pendBuyTP, "${comment}", InpMagicNumber, 0, clrGreen);`
      );
      code.onTick.push(
        `   if(buyTicket > 0) Print("Range Buy Stop at ", buyStopPrice, " SL:", pendBuySL, " TP:", pendBuyTP, " Lot:", pendBuyLot);`
      );
      code.onTick.push(`   else Print("Range Buy Stop failed: ", GetLastError());`);
    }
    if (hasSellNode) {
      code.onTick.push(
        `   int sellTicket = OrderSend(Symbol(), OP_SELLSTOP, pendSellLot, sellStopPrice, InpMaxSlippage, pendSellSL, pendSellTP, "${comment}", InpMagicNumber, 0, clrRed);`
      );
      code.onTick.push(
        `   if(sellTicket > 0) Print("Range Sell Stop at ", sellStopPrice, " SL:", pendSellSL, " TP:", pendSellTP, " Lot:", pendSellLot);`
      );
      code.onTick.push(`   else Print("Range Sell Stop failed: ", GetLastError());`);
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
      code.onTick.push("      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))");
      code.onTick.push("      {");
      code.onTick.push(
        "         if(OrderType() > OP_SELL && OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())"
      );
      code.onTick.push("            OrderDelete(OrderTicket());");
      code.onTick.push("      }");
      code.onTick.push("   }");
      code.onTick.push("}");
    }
  }
}

function addPendingOrderHelpers(code: GeneratedCode, ctx: GeneratorContext): void {
  const comment = sanitizeMQL4String(ctx.comment);

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
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() > OP_SELL && OrderMagicNumber() == InpMagicNumber &&
            OrderSymbol() == Symbol())
         {
            OrderDelete(OrderTicket());
         }
      }
   }
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Buy Stop Order                                               |
//+------------------------------------------------------------------+
bool PlaceBuyStop(double lots, double sl, double tp, double offsetPips)
{
   double ask = Ask;
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(ask + offset, Digits);
   double stopsLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(ask + stopsLevel, Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice - sl * _Point, Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice + tp * _Point, Digits) : 0;
   datetime expiry = GetPendingExpiry();

   int ticket = OrderSend(Symbol(), OP_BUYSTOP, lots, entryPrice, InpMaxSlippage, slPrice, tpPrice, "${comment}", InpMagicNumber, expiry, clrGreen);
   if(ticket > 0) return true;

   Print("BuyStop failed: ", GetLastError());
   return false;
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Buy Limit Order                                              |
//+------------------------------------------------------------------+
bool PlaceBuyLimit(double lots, double sl, double tp, double offsetPips)
{
   double ask = Ask;
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(ask - offset, Digits);
   double stopsLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(ask - stopsLevel, Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice - sl * _Point, Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice + tp * _Point, Digits) : 0;
   datetime expiry = GetPendingExpiry();

   int ticket = OrderSend(Symbol(), OP_BUYLIMIT, lots, entryPrice, InpMaxSlippage, slPrice, tpPrice, "${comment}", InpMagicNumber, expiry, clrGreen);
   if(ticket > 0) return true;

   Print("BuyLimit failed: ", GetLastError());
   return false;
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Sell Stop Order                                              |
//+------------------------------------------------------------------+
bool PlaceSellStop(double lots, double sl, double tp, double offsetPips)
{
   double bid = Bid;
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(bid - offset, Digits);
   double stopsLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(bid - stopsLevel, Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice + sl * _Point, Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice - tp * _Point, Digits) : 0;
   datetime expiry = GetPendingExpiry();

   int ticket = OrderSend(Symbol(), OP_SELLSTOP, lots, entryPrice, InpMaxSlippage, slPrice, tpPrice, "${comment}", InpMagicNumber, expiry, clrRed);
   if(ticket > 0) return true;

   Print("SellStop failed: ", GetLastError());
   return false;
}`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Place Sell Limit Order                                             |
//+------------------------------------------------------------------+
bool PlaceSellLimit(double lots, double sl, double tp, double offsetPips)
{
   double bid = Bid;
   double offset = offsetPips * _pipFactor * _Point;
   double entryPrice = NormalizeDouble(bid + offset, Digits);
   double stopsLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * _Point;
   if(stopsLevel > 0 && offset < stopsLevel)
      entryPrice = NormalizeDouble(bid + stopsLevel, Digits);
   double slPrice = (sl > 0) ? NormalizeDouble(entryPrice + sl * _Point, Digits) : 0;
   double tpPrice = (tp > 0) ? NormalizeDouble(entryPrice - tp * _Point, Digits) : 0;
   datetime expiry = GetPendingExpiry();

   int ticket = OrderSend(Symbol(), OP_SELLLIMIT, lots, entryPrice, InpMaxSlippage, slPrice, tpPrice, "${comment}", InpMagicNumber, expiry, clrRed);
   if(ticket > 0) return true;

   Print("SellLimit failed: ", GetLastError());
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
  code.onTick.push("for(int i = OrdersTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))");
  code.onTick.push("   {");
  code.onTick.push(
    "      if(OrderType() <= OP_SELL && OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())"
  );
  code.onTick.push("      {");
  code.onTick.push("         datetime openTime = OrderOpenTime();");
  code.onTick.push(`         if(Bars < InpTimeExitBars + 10) continue;`);
  code.onTick.push(
    `         int barsSinceEntry = iBarShift(Symbol(), ${getTimeframe(data.exitTimeframe)}, openTime);`
  );
  code.onTick.push("         if(barsSinceEntry < 0) continue; // iBarShift failed");
  code.onTick.push("         if(barsSinceEntry >= InpTimeExitBars)");
  code.onTick.push("         {");
  code.onTick.push("            double closePrice = (OrderType() == OP_BUY) ? Bid : Ask;");
  code.onTick.push(
    "            OrderClose(OrderTicket(), OrderLots(), closePrice, InpMaxSlippage, clrYellow);"
  );
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
  const comment = sanitizeMQL4String(ctx.comment);

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
  code.globalVariables.push("datetime gridLastBarTime = 0;");

  code.onTick.push("");
  code.onTick.push("//--- Grid/Pyramid Management");

  if (data.gridMode === "GRID") {
    code.onTick.push("// Grid Mode: place orders at fixed intervals");
    code.onTick.push("{");
    code.onTick.push("   double spacing = InpGridSpacing * _pipFactor * _Point;");
    code.onTick.push("");
    code.onTick.push("   // Count ACTUAL open positions (not a stale counter)");
    code.onTick.push("   int gridOpenCount = 0;");
    code.onTick.push("   for(int i = 0; i < OrdersTotal(); i++)");
    code.onTick.push("   {");
    code.onTick.push("      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
    code.onTick.push(
      "      if(OrderType() <= OP_SELL && OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())"
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
    code.onTick.push("      for(int i = 0; i < OrdersTotal(); i++)");
    code.onTick.push("      {");
    code.onTick.push("         if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
    code.onTick.push(
      "         if(OrderType() <= OP_SELL && OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())"
    );
    code.onTick.push("         { gridBasePrice = OrderOpenPrice(); break; }");
    code.onTick.push("      }");
    code.onTick.push("   }");
    code.onTick.push("");
    code.onTick.push("   // Bar-based throttle: only allow one grid order per bar");
    code.onTick.push("   datetime currentBarTime = iTime(Symbol(), Period(), 0);");
    code.onTick.push("   bool gridBarAllowed = (currentBarTime != gridLastBarTime);");
    code.onTick.push("");
    code.onTick.push(
      "   if(gridBasePrice > 0 && gridOpenCount < InpMaxGridLevels && gridBarAllowed)"
    );
    code.onTick.push("   {");
    code.onTick.push("      double lotSize = InpBuyLotSize;");
    code.onTick.push("      if(InpGridLotMultiplier != 1.0)");
    code.onTick.push(
      "         lotSize = NormalizeDouble(lotSize * MathPow(InpGridLotMultiplier, gridOpenCount), 2);"
    );

    if (data.direction === "BUY_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("      // Buy grid: place buy when price drops to next level down");
      code.onTick.push("      double nextLevelDown = gridBasePrice - (gridOpenCount) * spacing;");
      code.onTick.push("      if(Bid <= nextLevelDown + spacing * 0.1)");
      code.onTick.push("      {");
      code.onTick.push("         // Price-level dedup: check no existing position at this level");
      code.onTick.push("         bool levelExists = false;");
      code.onTick.push("         for(int j = 0; j < OrdersTotal(); j++)");
      code.onTick.push("         {");
      code.onTick.push("            if(!OrderSelect(j, SELECT_BY_POS, MODE_TRADES)) continue;");
      code.onTick.push(
        "            if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;"
      );
      code.onTick.push(
        "            if(MathAbs(OrderOpenPrice() - nextLevelDown) < spacing * 0.3) { levelExists = true; break; }"
      );
      code.onTick.push("         }");
      code.onTick.push("         if(!levelExists)");
      code.onTick.push("         {");
      code.onTick.push(
        `            int ticket = OrderSend(Symbol(), OP_BUY, lotSize, Ask, InpMaxSlippage, 0, 0, "${comment} Grid", InpMagicNumber, 0, clrGreen);`
      );
      code.onTick.push("            if(ticket > 0) gridLastBarTime = currentBarTime;");
      code.onTick.push("         }");
      code.onTick.push("      }");
    }

    if (data.direction === "SELL_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("      // Sell grid: place sell when price rises to next level up");
      code.onTick.push("      double nextLevel = gridBasePrice + (gridOpenCount) * spacing;");
      code.onTick.push("      if(Ask >= nextLevel - spacing * 0.1)");
      code.onTick.push("      {");
      code.onTick.push("         // Price-level dedup: check no existing position at this level");
      code.onTick.push("         bool levelExists = false;");
      code.onTick.push("         for(int j = 0; j < OrdersTotal(); j++)");
      code.onTick.push("         {");
      code.onTick.push("            if(!OrderSelect(j, SELECT_BY_POS, MODE_TRADES)) continue;");
      code.onTick.push(
        "            if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;"
      );
      code.onTick.push(
        "            if(MathAbs(OrderOpenPrice() - nextLevel) < spacing * 0.3) { levelExists = true; break; }"
      );
      code.onTick.push("         }");
      code.onTick.push("         if(!levelExists)");
      code.onTick.push("         {");
      code.onTick.push(
        `            int ticket = OrderSend(Symbol(), OP_SELL, lotSize, Bid, InpMaxSlippage, 0, 0, "${comment} Grid", InpMagicNumber, 0, clrRed);`
      );
      code.onTick.push("            if(ticket > 0) gridLastBarTime = currentBarTime;");
      code.onTick.push("         }");
      code.onTick.push("      }");
    }

    code.onTick.push("   }");
    code.onTick.push("}");
  } else {
    // PYRAMID mode
    code.onTick.push("// Pyramid Mode: add to winning positions");
    code.onTick.push("{");
    code.onTick.push("   double spacing = InpGridSpacing * _pipFactor * _Point;");
    code.onTick.push("");
    code.onTick.push("   // Bar-based throttle: only allow one pyramid order per bar");
    code.onTick.push("   datetime currentBarTime = iTime(Symbol(), Period(), 0);");
    code.onTick.push("   bool pyramidBarAllowed = (currentBarTime != gridLastBarTime);");
    code.onTick.push("");
    code.onTick.push("   // Count actual pyramid positions and track for max level check");
    code.onTick.push("   int pyramidCount = positionsCount;");
    code.onTick.push("");
    code.onTick.push("   if(pyramidBarAllowed)");
    code.onTick.push("   {");
    code.onTick.push("   for(int i = OrdersTotal() - 1; i >= 0; i--)");
    code.onTick.push("   {");
    code.onTick.push("      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
    code.onTick.push(
      "      if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;"
    );
    code.onTick.push("      if(OrderType() > OP_SELL) continue; // Skip pending orders");
    code.onTick.push("");
    code.onTick.push("      double openPrice = OrderOpenPrice();");
    code.onTick.push("      int posType = OrderType();");
    code.onTick.push("      double volume = OrderLots();");
    code.onTick.push("");
    code.onTick.push("      if(pyramidCount >= InpMaxGridLevels) break;");
    code.onTick.push("");
    code.onTick.push(
      "      double nextLotSize = NormalizeDouble(volume * InpGridLotMultiplier, 2);"
    );
    code.onTick.push("      double minLot = MarketInfo(Symbol(), MODE_MINLOT);");
    code.onTick.push("      if(nextLotSize < minLot) nextLotSize = minLot;");

    if (data.direction === "BUY_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("      if(posType == OP_BUY)");
      code.onTick.push("      {");
      code.onTick.push("         if(Bid >= openPrice + spacing)");
      code.onTick.push("         {");
      code.onTick.push(
        `            int ticket = OrderSend(Symbol(), OP_BUY, nextLotSize, Ask, InpMaxSlippage, 0, 0, "${comment} Pyramid", InpMagicNumber, 0, clrGreen);`
      );
      code.onTick.push(
        "            if(ticket > 0) { gridLastBarTime = currentBarTime; pyramidCount++; }"
      );
      code.onTick.push("         }");
      code.onTick.push("      }");
    }

    if (data.direction === "SELL_ONLY" || data.direction === "BOTH") {
      code.onTick.push("");
      code.onTick.push("      if(posType == OP_SELL)");
      code.onTick.push("      {");
      code.onTick.push("         if(Ask <= openPrice - spacing)");
      code.onTick.push("         {");
      code.onTick.push(
        `            int ticket = OrderSend(Symbol(), OP_SELL, nextLotSize, Bid, InpMaxSlippage, 0, 0, "${comment} Pyramid", InpMagicNumber, 0, clrRed);`
      );
      code.onTick.push(
        "            if(ticket > 0) { gridLastBarTime = currentBarTime; pyramidCount++; }"
      );
      code.onTick.push("         }");
      code.onTick.push("      }");
    }

    code.onTick.push("      // Process ALL winning positions (no break)");
    code.onTick.push("   }");
    code.onTick.push("   } // end pyramidBarAllowed");
    code.onTick.push("}");
  }
}
