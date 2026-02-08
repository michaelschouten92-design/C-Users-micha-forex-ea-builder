import type {
  BuilderNode,
  BuilderEdge,
  CloseConditionNodeData,
  RangeBreakoutNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";

export function generateCloseConditionCode(
  closeNode: BuilderNode,
  indicatorNodes: BuilderNode[],
  priceActionNodes: BuilderNode[],
  edges: BuilderEdge[],
  code: GeneratedCode
): void {
  const data = closeNode.data as CloseConditionNodeData;

  // Find indicators/price action connected to this close condition node
  const connectedEdges = edges.filter(
    (e) => e.target === closeNode.id || e.source === closeNode.id
  );

  const connectedIndicatorNodes: BuilderNode[] = [];
  const connectedPriceActionNodes: BuilderNode[] = [];

  for (const edge of connectedEdges) {
    const otherId = edge.target === closeNode.id ? edge.source : edge.target;
    const indNode = indicatorNodes.find((n) => n.id === otherId);
    if (indNode) connectedIndicatorNodes.push(indNode);
    const paNode = priceActionNodes.find((n) => n.id === otherId);
    if (paNode) connectedPriceActionNodes.push(paNode);
  }

  if (connectedIndicatorNodes.length === 0 && connectedPriceActionNodes.length === 0) {
    code.onTick.push("");
    code.onTick.push("// Exit Signal: no indicator/price action connected");
    return;
  }

  code.onTick.push("");
  code.onTick.push("//--- Exit Signal Conditions");

  // Generate reverse conditions for closing
  const closeBuyConditions: string[] = [];
  const closeSellConditions: string[] = [];

  for (const indNode of connectedIndicatorNodes) {
    const indIndex = indicatorNodes.indexOf(indNode);
    const varPrefix = `ind${indIndex}`;
    const indData = indNode.data;

    if ("indicatorType" in indData) {
      switch (indData.indicatorType) {
        case "moving-average":
          // Close buy when price crosses below MA, close sell when price crosses above MA
          closeBuyConditions.push(
            `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}Buffer[1]))`
          );
          closeSellConditions.push(
            `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}Buffer[1]))`
          );
          break;

        case "rsi":
          // Close buy when RSI hits overbought, close sell when RSI hits oversold
          closeBuyConditions.push(`(DoubleGE(${varPrefix}Buffer[0], InpRSI${indIndex}Overbought))`);
          closeSellConditions.push(`(DoubleLE(${varPrefix}Buffer[0], InpRSI${indIndex}Oversold))`);
          break;

        case "macd":
          // Close buy on bearish crossover, close sell on bullish crossover
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}MainBuffer[1], ${varPrefix}SignalBuffer[1]) && DoubleLT(${varPrefix}MainBuffer[0], ${varPrefix}SignalBuffer[0]))`
          );
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}MainBuffer[1], ${varPrefix}SignalBuffer[1]) && DoubleGT(${varPrefix}MainBuffer[0], ${varPrefix}SignalBuffer[0]))`
          );
          break;

        case "bollinger-bands":
          // Close buy when price hits upper band, close sell when price hits lower band
          closeBuyConditions.push(
            `(DoubleGE(iHigh(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}UpperBuffer[1]))`
          );
          closeSellConditions.push(
            `(DoubleLE(iLow(_Symbol, PERIOD_CURRENT, 1), ${varPrefix}LowerBuffer[1]))`
          );
          break;

        case "adx":
          // Close when trend weakens (ADX drops below level)
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}MainBuffer[0], InpADX${indIndex}TrendLevel))`
          );
          closeSellConditions.push(
            `(DoubleLT(${varPrefix}MainBuffer[0], InpADX${indIndex}TrendLevel))`
          );
          break;

        case "stochastic":
          // Close buy when %K enters overbought zone
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}MainBuffer[0], InpStoch${indIndex}Overbought))`
          );
          // Close sell when %K enters oversold zone
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}MainBuffer[0], InpStoch${indIndex}Oversold))`
          );
          break;
      }
    }
  }

  for (const paNode of connectedPriceActionNodes) {
    const paIndex = priceActionNodes.indexOf(paNode);
    const varPrefix = `pa${paIndex}`;
    const paData = paNode.data;

    if ("priceActionType" in paData) {
      switch (paData.priceActionType) {
        case "candlestick-pattern":
          // Close buy on sell signal, close sell on buy signal
          closeBuyConditions.push(`(${varPrefix}SellSignal)`);
          closeSellConditions.push(`(${varPrefix}BuySignal)`);
          break;

        case "range-breakout": {
          const rb = paData as RangeBreakoutNodeData;
          if (rb.breakoutDirection === "SELL_ON_LOW" || rb.breakoutDirection === "BOTH") {
            closeBuyConditions.push(`(${varPrefix}BreakoutDown)`);
          }
          if (rb.breakoutDirection === "BUY_ON_HIGH" || rb.breakoutDirection === "BOTH") {
            closeSellConditions.push(`(${varPrefix}BreakoutUp)`);
          }
          break;
        }

        case "support-resistance":
          // Close buy near resistance, close sell near support
          closeBuyConditions.push(`(${varPrefix}NearResistance)`);
          closeSellConditions.push(`(${varPrefix}NearSupport)`);
          break;
      }
    }
  }

  if (closeBuyConditions.length === 0 && closeSellConditions.length === 0) {
    return;
  }

  const closeBuyExpr = closeBuyConditions.length > 0 ? closeBuyConditions.join(" || ") : "false";
  const closeSellExpr = closeSellConditions.length > 0 ? closeSellConditions.join(" || ") : "false";

  if (data.closeDirection === "BUY" || data.closeDirection === "BOTH") {
    code.onTick.push(`bool closeBuyCondition = ${closeBuyExpr};`);
    code.onTick.push("if(closeBuyCondition) CloseBuyPositions();");
  }

  if (data.closeDirection === "SELL" || data.closeDirection === "BOTH") {
    code.onTick.push(`bool closeSellCondition = ${closeSellExpr};`);
    code.onTick.push("if(closeSellCondition) CloseSellPositions();");
  }
}
