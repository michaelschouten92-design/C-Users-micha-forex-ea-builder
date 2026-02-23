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
    // Bar offset: candle_close shifts all bar indices by +1 (uses confirmed bars only)
    const s = "signalMode" in indData && indData.signalMode === "candle_close" ? 1 : 0;

    if ("indicatorType" in indData) {
      switch (indData.indicatorType) {
        case "moving-average":
          // Close buy when price crosses below MA, close sell when price crosses above MA
          closeBuyConditions.push(
            `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Buffer[${1 + s}]))`
          );
          break;

        case "rsi":
          // Close buy when RSI crosses above overbought (crossover avoids repeated closes while RSI stays in zone)
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}Buffer[${1 + s}], InpRSI${indIndex}Overbought) && DoubleGE(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Overbought))`
          );
          // Close sell when RSI crosses below oversold
          closeSellConditions.push(
            `(DoubleGT(${varPrefix}Buffer[${1 + s}], InpRSI${indIndex}Oversold) && DoubleLE(${varPrefix}Buffer[${0 + s}], InpRSI${indIndex}Oversold))`
          );
          break;

        case "macd":
          // Close buy on bearish crossover, close sell on bullish crossover
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleLT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}MainBuffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleGT(${varPrefix}MainBuffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
          );
          break;

        case "bollinger-bands":
          // Close buy when price hits upper band, close sell when price hits lower band
          closeBuyConditions.push(
            `(DoubleGE(iHigh(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}UpperBuffer[${1 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleLE(iLow(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}LowerBuffer[${1 + s}]))`
          );
          break;

        case "adx":
          // Close when trend weakens (ADX drops below level)
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel))`
          );
          closeSellConditions.push(
            `(DoubleLT(${varPrefix}MainBuffer[${0 + s}], InpADX${indIndex}TrendLevel))`
          );
          break;

        case "atr":
          // Close when volatility decreases (ATR falling)
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
          );
          closeSellConditions.push(
            `(DoubleLT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
          );
          break;

        case "stochastic":
          // Close buy when %K crosses above overbought (crossover avoids repeated closes)
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}MainBuffer[${1 + s}], InpStoch${indIndex}Overbought) && DoubleGE(${varPrefix}MainBuffer[${0 + s}], InpStoch${indIndex}Overbought))`
          );
          // Close sell when %K crosses below oversold
          closeSellConditions.push(
            `(DoubleGT(${varPrefix}MainBuffer[${1 + s}], InpStoch${indIndex}Oversold) && DoubleLE(${varPrefix}MainBuffer[${0 + s}], InpStoch${indIndex}Oversold))`
          );
          break;

        case "cci":
          // Close buy when CCI crosses above overbought (crossover avoids repeated closes)
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}Buffer[${1 + s}], InpCCI${indIndex}Overbought) && DoubleGE(${varPrefix}Buffer[${0 + s}], InpCCI${indIndex}Overbought))`
          );
          // Close sell when CCI crosses below oversold
          closeSellConditions.push(
            `(DoubleGT(${varPrefix}Buffer[${1 + s}], InpCCI${indIndex}Oversold) && DoubleLE(${varPrefix}Buffer[${0 + s}], InpCCI${indIndex}Oversold))`
          );
          break;

        case "ichimoku": {
          const ichiMode =
            ("ichimokuMode" in indData ? indData.ichimokuMode : "TENKAN_KIJUN_CROSS") ??
            "TENKAN_KIJUN_CROSS";

          // Tenkan/Kijun cross reversal conditions
          const tkCloseBuy = `(DoubleGE(${varPrefix}TenkanBuffer[${1 + s}], ${varPrefix}KijunBuffer[${1 + s}]) && DoubleLT(${varPrefix}TenkanBuffer[${0 + s}], ${varPrefix}KijunBuffer[${0 + s}]))`;
          const tkCloseSell = `(DoubleLE(${varPrefix}TenkanBuffer[${1 + s}], ${varPrefix}KijunBuffer[${1 + s}]) && DoubleGT(${varPrefix}TenkanBuffer[${0 + s}], ${varPrefix}KijunBuffer[${0 + s}]))`;

          // Price vs cloud conditions: exit buy when price below cloud, exit sell when price above cloud
          const cloudCloseBuy = `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanABuffer[${0 + s}]) && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanBBuffer[${0 + s}]))`;
          const cloudCloseSell = `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanABuffer[${0 + s}]) && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}SpanBBuffer[${0 + s}]))`;

          if (ichiMode === "TENKAN_KIJUN_CROSS") {
            // Close buy on bearish crossover (Tenkan crosses below Kijun)
            closeBuyConditions.push(tkCloseBuy);
            // Close sell on bullish crossover (Tenkan crosses above Kijun)
            closeSellConditions.push(tkCloseSell);
          } else if (ichiMode === "PRICE_CLOUD") {
            // Close buy when price drops below cloud
            closeBuyConditions.push(cloudCloseBuy);
            // Close sell when price rises above cloud
            closeSellConditions.push(cloudCloseSell);
          } else {
            // FULL: close on TK cross reversal OR price exits cloud
            closeBuyConditions.push(`(${tkCloseBuy} || ${cloudCloseBuy})`);
            closeSellConditions.push(`(${tkCloseSell} || ${cloudCloseSell})`);
          }
          break;
        }

        case "obv":
          // Close buy when OBV crosses below its signal MA (momentum fading)
          closeBuyConditions.push(
            `(DoubleGE(${varPrefix}Buffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleLT(${varPrefix}Buffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
          );
          // Close sell when OBV crosses above its signal MA (downward momentum fading)
          closeSellConditions.push(
            `(DoubleLE(${varPrefix}Buffer[${1 + s}], ${varPrefix}SignalBuffer[${1 + s}]) && DoubleGT(${varPrefix}Buffer[${0 + s}], ${varPrefix}SignalBuffer[${0 + s}]))`
          );
          break;

        case "vwap":
          // Close buy when price crosses below VWAP
          closeBuyConditions.push(
            `(DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Value))`
          );
          // Close sell when price crosses above VWAP
          closeSellConditions.push(
            `(DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${1 + s}), ${varPrefix}Value))`
          );
          break;

        case "bb-squeeze":
          // Close buy when squeeze fires with bearish momentum (price below BB middle)
          closeBuyConditions.push(
            `(${varPrefix}WasSqueeze && !${varPrefix}InSqueeze && DoubleLT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}BBMiddle[${0 + s}]))`
          );
          // Close sell when squeeze fires with bullish momentum (price above BB middle)
          closeSellConditions.push(
            `(${varPrefix}WasSqueeze && !${varPrefix}InSqueeze && DoubleGT(iClose(_Symbol, PERIOD_CURRENT, ${0 + s}), ${varPrefix}BBMiddle[${0 + s}]))`
          );
          break;

        case "custom-indicator":
          // Close buy when buffer value is falling (current < previous)
          closeBuyConditions.push(
            `(DoubleLT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
          );
          // Close sell when buffer value is rising (current > previous)
          closeSellConditions.push(
            `(DoubleGT(${varPrefix}Buffer[${0 + s}], ${varPrefix}Buffer[${1 + s}]))`
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

  code.onTick.push(
    "// Exit signals use reverse indicator conditions (e.g., buy exit triggers on bearish signal)"
  );
  code.onTick.push("// Skip close-condition evaluation when no positions are open");
  code.onTick.push("if(CountPositions() > 0)");
  code.onTick.push("{");

  if (data.closeDirection === "BUY" || data.closeDirection === "BOTH") {
    code.onTick.push(`   bool closeBuyCondition = ${closeBuyExpr};`);
    code.onTick.push(
      '   if(closeBuyCondition) { Print("Exit signal: closing buy positions"); CloseBuyPositions(); }'
    );
  }

  if (data.closeDirection === "SELL" || data.closeDirection === "BOTH") {
    code.onTick.push(`   bool closeSellCondition = ${closeSellExpr};`);
    code.onTick.push(
      '   if(closeSellCondition) { Print("Exit signal: closing sell positions"); CloseSellPositions(); }'
    );
  }

  code.onTick.push("}");
}
