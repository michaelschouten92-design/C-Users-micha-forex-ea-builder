// MQL4 Close Conditions Generator
// Buffer access patterns are identical to MQL5 since we populate the same arrays.
// The only difference: iClose/iHigh/iLow use Symbol() instead of _Symbol for consistency.

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

  const closeBuyConditions: string[] = [];
  const closeSellConditions: string[] = [];

  for (const indNode of connectedIndicatorNodes) {
    const indIndex = indicatorNodes.indexOf(indNode);
    const varPrefix = `ind${indIndex}`;
    const indData = indNode.data;
    const s = "signalMode" in indData && indData.signalMode === "candle_close" ? 1 : 0;

    if ("indicatorType" in indData) {
      switch (indData.indicatorType) {
        case "moving-average":
          closeBuyConditions.push(
            `(DoubleLT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleGT(iClose(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
          );
          break;

        case "rsi":
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Overbought))`
          );
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Oversold))`
          );
          break;

        case "macd":
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleLT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleGT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
          );
          break;

        case "bollinger-bands":
          closeBuyConditions.push(
            `(DoubleGE(iHigh(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}UpperBuffer[${1 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleLE(iLow(Symbol(), PERIOD_CURRENT, ${1 + s}), ${varPrefix}LowerBuffer[${1 + s}]))`
          );
          break;

        case "adx":
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel))`
          );
          closeSellConditions.push(
            `(DoubleLT(${varPrefix}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel))`
          );
          break;

        case "atr":
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleLT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
          );
          break;

        case "stochastic":
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}MainBuffer[${0 + s}], InpStoch${indIndex}Overbought))`
          );
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}MainBuffer[${0 + s}], InpStoch${indIndex}Oversold))`
          );
          break;

        case "cci":
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}Buffer[${0 + s}], InpCCI${indIndex}Overbought))`
          );
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}Buffer[${0 + s}], InpCCI${indIndex}Oversold))`
          );
          break;

        case "ichimoku":
          // Close buy on bearish crossover (Tenkan crosses below Kijun)
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}TenkanBuffer[${1 + s}], ${varPrefix}KijunBuffer[${1 + s}]) && DoubleLT(${varPrefix}TenkanBuffer[${0 + s}], ${varPrefix}KijunBuffer[${0 + s}]))`
          );
          // Close sell on bullish crossover (Tenkan crosses above Kijun)
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}TenkanBuffer[${1 + s}], ${varPrefix}KijunBuffer[${1 + s}]) && DoubleGT(${varPrefix}TenkanBuffer[${0 + s}], ${varPrefix}KijunBuffer[${0 + s}]))`
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
          closeBuyConditions.push(`(${varPrefix}SellSignal)`);
          closeSellConditions.push(`(${varPrefix}BuySignal)`);
          break;

        case "range-breakout": {
          const rb = paData as RangeBreakoutNodeData;
          const dir = rb.breakoutDirection ?? "BOTH";
          if (dir === "SELL_ON_LOW" || dir === "BOTH") {
            closeBuyConditions.push(`(${varPrefix}BreakoutDown)`);
          }
          if (dir === "BUY_ON_HIGH" || dir === "BOTH") {
            closeSellConditions.push(`(${varPrefix}BreakoutUp)`);
          }
          break;
        }

        case "support-resistance":
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

  code.onTick.push(
    "// Exit signals use reverse indicator conditions (e.g., buy exit triggers on bearish signal)"
  );

  if (data.closeDirection === "BUY" || data.closeDirection === "BOTH") {
    code.onTick.push(`bool closeBuyCondition = ${closeBuyExpr};`);
    code.onTick.push(
      'if(closeBuyCondition) { Print("Exit signal: closing buy positions"); CloseBuyPositions(); }'
    );
  }

  if (data.closeDirection === "SELL" || data.closeDirection === "BOTH") {
    code.onTick.push(`bool closeSellCondition = ${closeSellExpr};`);
    code.onTick.push(
      'if(closeSellCondition) { Print("Exit signal: closing sell positions"); CloseSellPositions(); }'
    );
  }
}
