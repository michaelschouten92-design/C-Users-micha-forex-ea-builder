// Main MQL5 Code Generator

import type {
  BuildJsonSchema,
  BuilderNode,
  BuilderEdge,
  TradingTimesNodeData,
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ATRNodeData,
  ADXNodeData,
  EntryConditionNodeData,
  ExitConditionNodeData,
  PositionSizingNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
} from "@/types/builder";

import {
  type GeneratorContext,
  type GeneratedCode,
  MA_METHOD_MAP,
  APPLIED_PRICE_MAP,
} from "./types";

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

export function generateMQL5Code(
  buildJson: BuildJsonSchema,
  projectName: string
): string {
  const ctx: GeneratorContext = {
    projectName: sanitizeName(projectName),
    magicNumber: buildJson.settings?.magicNumber ?? 123456,
    comment: buildJson.settings?.comment ?? "AlgoStudio EA",
    maxOpenTrades: buildJson.settings?.maxOpenTrades ?? 1,
    allowHedging: buildJson.settings?.allowHedging ?? false,
  };

  const code: GeneratedCode = {
    inputs: [],
    globalVariables: [],
    onInit: [],
    onDeinit: [],
    onTick: [],
    helperFunctions: [],
  };

  // Process nodes by type (check both node.type and node.data properties)
  const indicatorTypes = ["moving-average", "rsi", "macd", "bollinger-bands", "atr", "adx"];
  const indicatorNodes = buildJson.nodes.filter(
    (n) => indicatorTypes.includes(n.type as string) || "indicatorType" in n.data
  );
  const entryNodes = buildJson.nodes.filter(
    (n) =>
      n.type === "entry-condition" ||
      ("conditionType" in n.data && n.data.conditionType === "entry")
  );
  const exitNodes = buildJson.nodes.filter(
    (n) =>
      n.type === "exit-condition" ||
      ("conditionType" in n.data && n.data.conditionType === "exit")
  );
  const positionSizingNodes = buildJson.nodes.filter(
    (n) =>
      n.type === "position-sizing" ||
      ("tradingType" in n.data && n.data.tradingType === "position-sizing")
  );
  const stopLossNodes = buildJson.nodes.filter(
    (n) =>
      n.type === "stop-loss" ||
      ("tradingType" in n.data && n.data.tradingType === "stop-loss")
  );
  const takeProfitNodes = buildJson.nodes.filter(
    (n) =>
      n.type === "take-profit" ||
      ("tradingType" in n.data && n.data.tradingType === "take-profit")
  );
  const timingNodes = buildJson.nodes.filter(
    (n) =>
      n.type === "trading-times" ||
      ("timingType" in n.data && n.data.timingType === "trading-times")
  );

  // Generate trading times code
  if (timingNodes.length > 0) {
    generateTradingTimesCode(timingNodes[0], code);
  }

  // Generate indicator code
  indicatorNodes.forEach((node, index) => {
    generateIndicatorCode(node, index, code);
  });

  // Generate position sizing code
  if (positionSizingNodes.length > 0) {
    generatePositionSizingCode(positionSizingNodes[0], code);
  } else {
    // Default fixed lot
    code.inputs.push('input double InpLotSize = 0.1; // Lot Size');
    code.onTick.push("double lotSize = InpLotSize;");
  }

  // Generate SL/TP code
  generateStopLossCode(stopLossNodes[0], indicatorNodes, buildJson.edges, code);
  generateTakeProfitCode(takeProfitNodes[0], code);

  // Generate entry conditions
  generateEntryConditions(entryNodes, indicatorNodes, buildJson.edges, ctx, code);

  // Generate exit conditions
  generateExitConditions(exitNodes, indicatorNodes, buildJson.edges, code);

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

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 30);
}

function generateTradingTimesCode(
  node: BuilderNode,
  code: GeneratedCode
): void {
  const data = node.data as TradingTimesNodeData;

  if (data.mode === "ALWAYS") {
    // No time restrictions
    code.onTick.push("bool isTradingTime = true;");
    if (data.tradeMondayToFriday) {
      code.onTick.push("// Only trade on weekdays (Mon-Fri)");
      code.onTick.push("int dayOfWeek = TimeDayOfWeek(TimeCurrent());");
      code.onTick.push("if(dayOfWeek == 0 || dayOfWeek == 6) isTradingTime = false;");
    }
  } else if (data.mode === "CUSTOM" && data.sessions.length > 0) {
    // Custom session times
    code.onTick.push("bool isTradingTime = false;");
    code.onTick.push("MqlDateTime dt;");
    code.onTick.push("TimeToStruct(TimeCurrent(), dt);");
    code.onTick.push("int currentMinutes = dt.hour * 60 + dt.min;");

    if (data.tradeMondayToFriday) {
      code.onTick.push("// Only trade on weekdays (Mon-Fri)");
      code.onTick.push("if(dt.day_of_week >= 1 && dt.day_of_week <= 5)");
      code.onTick.push("{");
    }

    // Generate session checks
    data.sessions.forEach((session, i) => {
      const startMinutes = session.startHour * 60 + session.startMinute;
      const endMinutes = session.endHour * 60 + session.endMinute;

      if (endMinutes > startMinutes) {
        // Normal session (same day)
        code.onTick.push(`   // Session ${i + 1}: ${session.startHour.toString().padStart(2, '0')}:${session.startMinute.toString().padStart(2, '0')} - ${session.endHour.toString().padStart(2, '0')}:${session.endMinute.toString().padStart(2, '0')}`);
        code.onTick.push(`   if(currentMinutes >= ${startMinutes} && currentMinutes < ${endMinutes}) isTradingTime = true;`);
      } else {
        // Overnight session (spans midnight)
        code.onTick.push(`   // Session ${i + 1}: ${session.startHour.toString().padStart(2, '0')}:${session.startMinute.toString().padStart(2, '0')} - ${session.endHour.toString().padStart(2, '0')}:${session.endMinute.toString().padStart(2, '0')} (overnight)`);
        code.onTick.push(`   if(currentMinutes >= ${startMinutes} || currentMinutes < ${endMinutes}) isTradingTime = true;`);
      }
    });

    if (data.tradeMondayToFriday) {
      code.onTick.push("}");
    }
  } else {
    // Fallback - always trade
    code.onTick.push("bool isTradingTime = true;");
  }

  code.onTick.push("");
  code.onTick.push("if(!isTradingTime) return; // Outside trading hours");
  code.onTick.push("");
}

function generateIndicatorCode(
  node: BuilderNode,
  index: number,
  code: GeneratedCode
): void {
  const data = node.data;
  const varPrefix = `ind${index}`;

  // Determine indicator type from node.type or data.indicatorType
  const indicatorType =
    ("indicatorType" in data ? data.indicatorType : null) || node.type;

  if (indicatorType) {
    switch (indicatorType) {
      case "moving-average": {
        const ma = data as MovingAverageNodeData;
        const method = MA_METHOD_MAP[ma.method as keyof typeof MA_METHOD_MAP] ?? "MODE_SMA";
        const price = APPLIED_PRICE_MAP[ma.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";

        code.inputs.push(`input int InpMA${index}Period = ${ma.period}; // MA ${index + 1} Period`);
        code.inputs.push(`input int InpMA${index}Shift = ${ma.shift}; // MA ${index + 1} Shift`);
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMA(_Symbol, PERIOD_CURRENT, InpMA${index}Period, InpMA${index}Shift, ${method}, ${price});`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 0, 0, 3, ${varPrefix}Buffer);`);
        break;
      }

      case "rsi": {
        const rsi = data as RSINodeData;
        const price = APPLIED_PRICE_MAP[rsi.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";

        code.inputs.push(`input int InpRSI${index}Period = ${rsi.period}; // RSI ${index + 1} Period`);
        code.inputs.push(`input double InpRSI${index}Overbought = ${rsi.overboughtLevel}; // RSI ${index + 1} Overbought`);
        code.inputs.push(`input double InpRSI${index}Oversold = ${rsi.oversoldLevel}; // RSI ${index + 1} Oversold`);
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iRSI(_Symbol, PERIOD_CURRENT, InpRSI${index}Period, ${price});`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 0, 0, 3, ${varPrefix}Buffer);`);
        break;
      }

      case "macd": {
        const macd = data as MACDNodeData;
        const price = APPLIED_PRICE_MAP[macd.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";

        code.inputs.push(`input int InpMACD${index}Fast = ${macd.fastPeriod}; // MACD ${index + 1} Fast Period`);
        code.inputs.push(`input int InpMACD${index}Slow = ${macd.slowPeriod}; // MACD ${index + 1} Slow Period`);
        code.inputs.push(`input int InpMACD${index}Signal = ${macd.signalPeriod}; // MACD ${index + 1} Signal Period`);
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMACD(_Symbol, PERIOD_CURRENT, InpMACD${index}Fast, InpMACD${index}Slow, InpMACD${index}Signal, ${price});`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SignalBuffer, true);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 0, 0, 3, ${varPrefix}MainBuffer);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 1, 0, 3, ${varPrefix}SignalBuffer);`);
        break;
      }

      case "bollinger-bands": {
        const bb = data as BollingerBandsNodeData;
        const price = APPLIED_PRICE_MAP[bb.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";

        code.inputs.push(`input int InpBB${index}Period = ${bb.period}; // BB ${index + 1} Period`);
        code.inputs.push(`input double InpBB${index}Deviation = ${bb.deviation}; // BB ${index + 1} Deviation`);
        code.inputs.push(`input int InpBB${index}Shift = ${bb.shift}; // BB ${index + 1} Shift`);
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}UpperBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}MiddleBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}LowerBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iBands(_Symbol, PERIOD_CURRENT, InpBB${index}Period, InpBB${index}Shift, InpBB${index}Deviation, ${price});`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}UpperBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MiddleBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}LowerBuffer, true);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 0, 0, 3, ${varPrefix}MiddleBuffer);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 1, 0, 3, ${varPrefix}UpperBuffer);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 2, 0, 3, ${varPrefix}LowerBuffer);`);
        break;
      }

      case "atr": {
        const atr = data as ATRNodeData;

        code.inputs.push(`input int InpATR${index}Period = ${atr.period}; // ATR ${index + 1} Period`);
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iATR(_Symbol, PERIOD_CURRENT, InpATR${index}Period);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 0, 0, 3, ${varPrefix}Buffer);`);
        break;
      }

      case "adx": {
        const adx = data as ADXNodeData;

        code.inputs.push(`input int InpADX${index}Period = ${adx.period}; // ADX ${index + 1} Period`);
        code.inputs.push(`input double InpADX${index}TrendLevel = ${adx.trendLevel}; // ADX ${index + 1} Trend Level`);
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);   // ADX main line
        code.globalVariables.push(`double ${varPrefix}PlusDIBuffer[];`); // +DI line
        code.globalVariables.push(`double ${varPrefix}MinusDIBuffer[];`); // -DI line
        code.onInit.push(
          `${varPrefix}Handle = iADX(_Symbol, PERIOD_CURRENT, InpADX${index}Period);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}PlusDIBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MinusDIBuffer, true);`);
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 0, 0, 3, ${varPrefix}MainBuffer);`);   // ADX
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 1, 0, 3, ${varPrefix}PlusDIBuffer);`); // +DI
        code.onTick.push(`CopyBuffer(${varPrefix}Handle, 2, 0, 3, ${varPrefix}MinusDIBuffer);`); // -DI
        break;
      }
    }
  }
}

function generatePositionSizingCode(
  node: BuilderNode | undefined,
  code: GeneratedCode
): void {
  if (!node) {
    code.inputs.push('input double InpLotSize = 0.1; // Lot Size');
    code.onTick.push("double lotSize = InpLotSize;");
    return;
  }

  const data = node.data as PositionSizingNodeData;

  switch (data.method) {
    case "FIXED_LOT":
      code.inputs.push(`input double InpLotSize = ${data.fixedLot}; // Fixed Lot Size`);
      code.onTick.push("double lotSize = InpLotSize;");
      break;

    case "RISK_PERCENT":
      code.inputs.push(`input double InpRiskPercent = ${data.riskPercent}; // Risk Percentage`);
      code.onTick.push("double lotSize = CalculateLotSize(InpRiskPercent, slPips);");
      break;

    case "BALANCE_PERCENT":
      code.inputs.push(`input double InpBalancePercent = ${data.balancePercent}; // Balance Percentage`);
      code.onTick.push(
        "double lotSize = NormalizeDouble(AccountInfoDouble(ACCOUNT_BALANCE) * InpBalancePercent / 100.0 / 1000.0, 2);"
      );
      break;
  }

  code.inputs.push(`input double InpMinLot = ${data.minLot}; // Minimum Lot Size`);
  code.inputs.push(`input double InpMaxLot = ${data.maxLot}; // Maximum Lot Size`);
  code.onTick.push("lotSize = MathMax(InpMinLot, MathMin(InpMaxLot, lotSize));");
}

function generateStopLossCode(
  node: BuilderNode | undefined,
  indicatorNodes: BuilderNode[],
  edges: BuilderEdge[],
  code: GeneratedCode
): void {
  if (!node) {
    code.inputs.push('input double InpStopLoss = 50; // Stop Loss (pips)');
    code.onTick.push("double slPips = InpStopLoss * 10; // Convert to points");
    return;
  }

  const data = node.data as StopLossNodeData;

  switch (data.method) {
    case "FIXED_PIPS":
      code.inputs.push(`input double InpStopLoss = ${data.fixedPips}; // Stop Loss (pips)`);
      code.onTick.push("double slPips = InpStopLoss * 10; // Convert to points");
      break;

    case "ATR_BASED":
      code.inputs.push(`input int InpATRPeriod = ${data.atrPeriod}; // ATR Period for SL`);
      code.inputs.push(`input double InpATRMultiplier = ${data.atrMultiplier}; // ATR Multiplier for SL`);
      code.globalVariables.push("int atrHandle;");
      code.globalVariables.push("double atrBuffer[];");
      code.onInit.push("atrHandle = iATR(_Symbol, PERIOD_CURRENT, InpATRPeriod);");
      code.onInit.push("ArraySetAsSeries(atrBuffer, true);");
      code.onTick.push("CopyBuffer(atrHandle, 0, 0, 1, atrBuffer);");
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
    code.inputs.push('input double InpStopLoss = 50; // Stop Loss (pips) - No indicator connected');
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
        code.inputs.push('input double InpBBSLBuffer = 5; // Additional buffer pips for BB SL');
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
        code.inputs.push('input double InpMASLMultiplier = 1.5; // MA SL distance multiplier');
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
        code.inputs.push('input double InpATRSLMultiplier = 1.5; // ATR SL multiplier');
        code.onTick.push("// Indicator-based SL using ATR");
        code.onTick.push(`double slPips = (${varPrefix}Buffer[0] / _Point) * InpATRSLMultiplier;`);
        break;

      case "adx":
        // Use ATR-style calculation scaled by ADX strength
        code.inputs.push('input double InpADXSLBase = 50; // Base SL pips when ADX is at trend level');
        code.onTick.push("// Indicator-based SL using ADX (scaled by trend strength)");
        code.onTick.push(`double adxValue = ${varPrefix}MainBuffer[0];`);
        code.onTick.push("// Stronger trend = tighter SL, weaker trend = wider SL");
        code.onTick.push("double slMultiplier = 2.0 - (adxValue / 100.0); // Range: 1.0 to 2.0");
        code.onTick.push("double slPips = InpADXSLBase * slMultiplier * 10;");
        break;

      default:
        // RSI, MACD etc. not typically used for SL - use default
        code.inputs.push('input double InpStopLoss = 50; // Stop Loss (pips)');
        code.onTick.push(`double slPips = InpStopLoss * 10; // ${indData.indicatorType} not suitable for SL calculation`);
        break;
    }
  } else {
    // Unknown indicator type
    code.inputs.push('input double InpStopLoss = 50; // Stop Loss (pips)');
    code.onTick.push("double slPips = InpStopLoss * 10; // Unknown indicator type");
  }
}

function generateTakeProfitCode(
  node: BuilderNode | undefined,
  code: GeneratedCode
): void {
  if (!node) {
    code.inputs.push('input double InpTakeProfit = 100; // Take Profit (pips)');
    code.onTick.push("double tpPips = InpTakeProfit * 10; // Convert to points");
    return;
  }

  const data = node.data as TakeProfitNodeData;

  switch (data.method) {
    case "FIXED_PIPS":
      code.inputs.push(`input double InpTakeProfit = ${data.fixedPips}; // Take Profit (pips)`);
      code.onTick.push("double tpPips = InpTakeProfit * 10; // Convert to points");
      break;

    case "RISK_REWARD":
      code.inputs.push(`input double InpRiskReward = ${data.riskRewardRatio}; // Risk:Reward Ratio`);
      code.onTick.push("double tpPips = slPips * InpRiskReward;");
      break;

    case "ATR_BASED":
      // Reuse ATR handle if already created
      code.inputs.push(`input double InpTPATRMultiplier = ${data.atrMultiplier}; // ATR Multiplier for TP`);
      code.onTick.push("double tpPips = (atrBuffer[0] / _Point) * InpTPATRMultiplier;");
      break;
  }
}

function generateEntryConditions(
  entryNodes: BuilderNode[],
  indicatorNodes: BuilderNode[],
  edges: BuilderEdge[],
  ctx: GeneratorContext,
  code: GeneratedCode
): void {
  if (entryNodes.length === 0) {
    // No entry conditions - just add a placeholder
    code.onTick.push("");
    code.onTick.push("//--- Entry Logic (no conditions defined)");
    code.onTick.push("bool buyCondition = false;");
    code.onTick.push("bool sellCondition = false;");
    return;
  }

  code.onTick.push("");
  code.onTick.push("//--- Entry Logic");

  for (const entryNode of entryNodes) {
    const data = entryNode.data as EntryConditionNodeData;
    const direction = data.direction;
    const logic = data.logic === "AND" ? " && " : " || ";

    // Find connected indicator nodes
    const connectedEdges = edges.filter((e) => e.target === entryNode.id);
    const connectedIndicators = connectedEdges
      .map((e) => indicatorNodes.find((n) => n.id === e.source))
      .filter((n): n is BuilderNode => n !== undefined);

    // Generate conditions based on connected indicators
    const buyConditions: string[] = [];
    const sellConditions: string[] = [];

    connectedIndicators.forEach((indNode, idx) => {
      const indIndex = indicatorNodes.indexOf(indNode);
      const varPrefix = `ind${indIndex}`;
      const indData = indNode.data;

      if ("indicatorType" in indData) {
        switch (indData.indicatorType) {
          case "moving-average":
            // Price crosses above MA = Buy, below = Sell
            buyConditions.push(`(iClose(_Symbol, PERIOD_CURRENT, 1) > ${varPrefix}Buffer[1])`);
            sellConditions.push(`(iClose(_Symbol, PERIOD_CURRENT, 1) < ${varPrefix}Buffer[1])`);
            break;

          case "rsi": {
            const rsi = indData as RSINodeData;
            // RSI crosses above oversold = Buy, crosses below overbought = Sell
            buyConditions.push(`(${varPrefix}Buffer[1] < InpRSI${indIndex}Oversold && ${varPrefix}Buffer[0] > InpRSI${indIndex}Oversold)`);
            sellConditions.push(`(${varPrefix}Buffer[1] > InpRSI${indIndex}Overbought && ${varPrefix}Buffer[0] < InpRSI${indIndex}Overbought)`);
            break;
          }

          case "macd":
            // MACD crosses above signal = Buy, below = Sell
            buyConditions.push(`(${varPrefix}MainBuffer[1] < ${varPrefix}SignalBuffer[1] && ${varPrefix}MainBuffer[0] > ${varPrefix}SignalBuffer[0])`);
            sellConditions.push(`(${varPrefix}MainBuffer[1] > ${varPrefix}SignalBuffer[1] && ${varPrefix}MainBuffer[0] < ${varPrefix}SignalBuffer[0])`);
            break;

          case "bollinger-bands":
            // Price touches lower band = Buy, upper band = Sell
            buyConditions.push(`(iLow(_Symbol, PERIOD_CURRENT, 1) <= ${varPrefix}LowerBuffer[1])`);
            sellConditions.push(`(iHigh(_Symbol, PERIOD_CURRENT, 1) >= ${varPrefix}UpperBuffer[1])`);
            break;

          case "atr":
            // ATR is typically used for SL/TP, not entry signals
            // But can be used as volatility filter: ATR increasing = more volatility
            buyConditions.push(`(${varPrefix}Buffer[0] > ${varPrefix}Buffer[1])`);  // ATR increasing
            sellConditions.push(`(${varPrefix}Buffer[0] > ${varPrefix}Buffer[1])`); // ATR increasing
            break;

          case "adx": {
            // ADX: +DI crosses above -DI = Buy, -DI crosses above +DI = Sell
            // Also checks if ADX > trend level (market is trending)
            buyConditions.push(`(${varPrefix}MainBuffer[0] > InpADX${indIndex}TrendLevel && ${varPrefix}PlusDIBuffer[0] > ${varPrefix}MinusDIBuffer[0])`);
            sellConditions.push(`(${varPrefix}MainBuffer[0] > InpADX${indIndex}TrendLevel && ${varPrefix}MinusDIBuffer[0] > ${varPrefix}PlusDIBuffer[0])`);
            break;
          }
        }
      }
    });

    // Fallback if no indicators connected
    if (buyConditions.length === 0) {
      buyConditions.push("false");
    }
    if (sellConditions.length === 0) {
      sellConditions.push("false");
    }

    // Generate condition variables
    if (direction === "BUY" || direction === "BOTH") {
      code.onTick.push(`bool buyCondition = ${buyConditions.join(logic)};`);
    } else {
      code.onTick.push("bool buyCondition = false;");
    }

    if (direction === "SELL" || direction === "BOTH") {
      code.onTick.push(`bool sellCondition = ${sellConditions.join(logic)};`);
    } else {
      code.onTick.push("bool sellCondition = false;");
    }
  }

  // Generate entry execution
  code.onTick.push("");
  code.onTick.push("//--- Execute Entry");
  code.onTick.push(`if(positionsCount < ${ctx.maxOpenTrades})`);
  code.onTick.push("{");
  code.onTick.push("   if(buyCondition && CountPositionsByType(POSITION_TYPE_BUY) == 0)");
  code.onTick.push("   {");
  code.onTick.push("      OpenBuy(lotSize, slPips, tpPips);");
  code.onTick.push("   }");
  code.onTick.push("   if(sellCondition && CountPositionsByType(POSITION_TYPE_SELL) == 0)");
  code.onTick.push("   {");
  code.onTick.push("      OpenSell(lotSize, slPips, tpPips);");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generateExitConditions(
  exitNodes: BuilderNode[],
  indicatorNodes: BuilderNode[],
  edges: BuilderEdge[],
  code: GeneratedCode
): void {
  if (exitNodes.length === 0) {
    return;
  }

  code.onTick.push("");
  code.onTick.push("//--- Exit Logic");

  for (const exitNode of exitNodes) {
    const data = exitNode.data as ExitConditionNodeData;
    const exitType = data.exitType;
    const logic = data.logic === "AND" ? " && " : " || ";

    // Find connected indicator nodes
    const connectedEdges = edges.filter((e) => e.target === exitNode.id);
    const connectedIndicators = connectedEdges
      .map((e) => indicatorNodes.find((n) => n.id === e.source))
      .filter((n): n is BuilderNode => n !== undefined);

    const exitConditions: string[] = [];

    connectedIndicators.forEach((indNode) => {
      const indIndex = indicatorNodes.indexOf(indNode);
      const varPrefix = `ind${indIndex}`;
      const indData = indNode.data;

      if ("indicatorType" in indData) {
        switch (indData.indicatorType) {
          case "moving-average":
            // Price crosses MA in opposite direction
            exitConditions.push(
              `((PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && iClose(_Symbol, PERIOD_CURRENT, 1) < ${varPrefix}Buffer[1]) || ` +
              `(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && iClose(_Symbol, PERIOD_CURRENT, 1) > ${varPrefix}Buffer[1]))`
            );
            break;

          case "rsi": {
            const rsi = indData as RSINodeData;
            exitConditions.push(
              `((PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && ${varPrefix}Buffer[0] > InpRSI${indIndex}Overbought) || ` +
              `(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && ${varPrefix}Buffer[0] < InpRSI${indIndex}Oversold))`
            );
            break;
          }

          case "macd":
            // MACD crosses signal in opposite direction
            exitConditions.push(
              `((PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && ${varPrefix}MainBuffer[0] < ${varPrefix}SignalBuffer[0]) || ` +
              `(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && ${varPrefix}MainBuffer[0] > ${varPrefix}SignalBuffer[0]))`
            );
            break;

          case "bollinger-bands":
            // Price touches opposite band
            exitConditions.push(
              `((PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && iHigh(_Symbol, PERIOD_CURRENT, 1) >= ${varPrefix}UpperBuffer[1]) || ` +
              `(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && iLow(_Symbol, PERIOD_CURRENT, 1) <= ${varPrefix}LowerBuffer[1]))`
            );
            break;

          case "atr":
            // ATR decreasing = volatility decreasing, exit
            exitConditions.push(`(${varPrefix}Buffer[0] < ${varPrefix}Buffer[1])`);
            break;

          case "adx":
            // ADX below trend level or DI cross against position
            exitConditions.push(
              `((PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && ${varPrefix}MinusDIBuffer[0] > ${varPrefix}PlusDIBuffer[0]) || ` +
              `(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && ${varPrefix}PlusDIBuffer[0] > ${varPrefix}MinusDIBuffer[0]))`
            );
            break;
        }
      }
    });

    if (exitConditions.length > 0) {
      code.onTick.push(`bool exitCondition = ${exitConditions.join(logic)};`);
      code.onTick.push("if(exitCondition)");
      code.onTick.push("{");

      switch (exitType) {
        case "CLOSE_ALL":
          code.onTick.push("   CloseAllPositions();");
          break;
        case "CLOSE_BUY":
          code.onTick.push("   CloseBuyPositions();");
          break;
        case "CLOSE_SELL":
          code.onTick.push("   CloseSellPositions();");
          break;
      }

      code.onTick.push("}");
    }
  }
}
