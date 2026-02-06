import type {
  BuilderNode,
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ATRNodeData,
  ADXNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";
import { MA_METHOD_MAP, APPLIED_PRICE_MAP, getTimeframe } from "../types";
import { createInput } from "./shared";

// Helper to add handle validation after creation
function addHandleValidation(varPrefix: string, label: string, code: GeneratedCode): void {
  code.onInit.push(`if(${varPrefix}Handle == INVALID_HANDLE) { Print("Failed to create ${label} indicator handle"); return(INIT_FAILED); }`);
}

// Helper to add CopyBuffer with error checking
function addCopyBuffer(handle: string, bufferIndex: number, count: number, target: string, code: GeneratedCode): void {
  code.onTick.push(`if(CopyBuffer(${handle}, ${bufferIndex}, 0, ${count}, ${target}) < ${count}) return;`);
}

export function generateIndicatorCode(
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

        code.inputs.push(createInput(node, "period", `InpMA${index}Period`, "int", ma.period, `MA ${index + 1} Period`));
        code.inputs.push(createInput(node, "shift", `InpMA${index}Shift`, "int", ma.shift, `MA ${index + 1} Shift`));
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMA(_Symbol, ${getTimeframe(ma.timeframe)}, InpMA${index}Period, InpMA${index}Shift, ${method}, ${price});`
        );
        addHandleValidation(varPrefix, `MA ${index + 1}`, code);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, 3, `${varPrefix}Buffer`, code);
        break;
      }

      case "rsi": {
        const rsi = data as RSINodeData;
        const price = APPLIED_PRICE_MAP[rsi.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";

        code.inputs.push(createInput(node, "period", `InpRSI${index}Period`, "int", rsi.period, `RSI ${index + 1} Period`));
        code.inputs.push(createInput(node, "overboughtLevel", `InpRSI${index}Overbought`, "double", rsi.overboughtLevel, `RSI ${index + 1} Overbought`));
        code.inputs.push(createInput(node, "oversoldLevel", `InpRSI${index}Oversold`, "double", rsi.oversoldLevel, `RSI ${index + 1} Oversold`));
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iRSI(_Symbol, ${getTimeframe(rsi.timeframe)}, InpRSI${index}Period, ${price});`
        );
        addHandleValidation(varPrefix, `RSI ${index + 1}`, code);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, 3, `${varPrefix}Buffer`, code);
        break;
      }

      case "macd": {
        const macd = data as MACDNodeData;
        const price = APPLIED_PRICE_MAP[macd.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";

        code.inputs.push(createInput(node, "fastPeriod", `InpMACD${index}Fast`, "int", macd.fastPeriod, `MACD ${index + 1} Fast Period`));
        code.inputs.push(createInput(node, "slowPeriod", `InpMACD${index}Slow`, "int", macd.slowPeriod, `MACD ${index + 1} Slow Period`));
        code.inputs.push(createInput(node, "signalPeriod", `InpMACD${index}Signal`, "int", macd.signalPeriod, `MACD ${index + 1} Signal Period`));
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMACD(_Symbol, ${getTimeframe(macd.timeframe)}, InpMACD${index}Fast, InpMACD${index}Slow, InpMACD${index}Signal, ${price});`
        );
        addHandleValidation(varPrefix, `MACD ${index + 1}`, code);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SignalBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, 3, `${varPrefix}MainBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 1, 3, `${varPrefix}SignalBuffer`, code);
        break;
      }

      case "bollinger-bands": {
        const bb = data as BollingerBandsNodeData;
        const price = APPLIED_PRICE_MAP[bb.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";

        code.inputs.push(createInput(node, "period", `InpBB${index}Period`, "int", bb.period, `BB ${index + 1} Period`));
        code.inputs.push(createInput(node, "deviation", `InpBB${index}Deviation`, "double", bb.deviation, `BB ${index + 1} Deviation`));
        code.inputs.push(createInput(node, "shift", `InpBB${index}Shift`, "int", bb.shift, `BB ${index + 1} Shift`));
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}UpperBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}MiddleBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}LowerBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iBands(_Symbol, ${getTimeframe(bb.timeframe)}, InpBB${index}Period, InpBB${index}Shift, InpBB${index}Deviation, ${price});`
        );
        addHandleValidation(varPrefix, `BB ${index + 1}`, code);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}UpperBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MiddleBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}LowerBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, 3, `${varPrefix}MiddleBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 1, 3, `${varPrefix}UpperBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 2, 3, `${varPrefix}LowerBuffer`, code);
        break;
      }

      case "atr": {
        const atr = data as ATRNodeData;

        code.inputs.push(createInput(node, "period", `InpATR${index}Period`, "int", atr.period, `ATR ${index + 1} Period`));
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iATR(_Symbol, ${getTimeframe(atr.timeframe)}, InpATR${index}Period);`
        );
        addHandleValidation(varPrefix, `ATR ${index + 1}`, code);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, 3, `${varPrefix}Buffer`, code);
        break;
      }

      case "adx": {
        const adx = data as ADXNodeData;

        code.inputs.push(createInput(node, "period", `InpADX${index}Period`, "int", adx.period, `ADX ${index + 1} Period`));
        code.inputs.push(createInput(node, "trendLevel", `InpADX${index}TrendLevel`, "double", adx.trendLevel, `ADX ${index + 1} Trend Level`));
        code.globalVariables.push(`int ${varPrefix}Handle;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);   // ADX main line
        code.globalVariables.push(`double ${varPrefix}PlusDIBuffer[];`); // +DI line
        code.globalVariables.push(`double ${varPrefix}MinusDIBuffer[];`); // -DI line
        code.onInit.push(
          `${varPrefix}Handle = iADX(_Symbol, ${getTimeframe(adx.timeframe)}, InpADX${index}Period);`
        );
        addHandleValidation(varPrefix, `ADX ${index + 1}`, code);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}PlusDIBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MinusDIBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, 3, `${varPrefix}MainBuffer`, code);   // ADX
        addCopyBuffer(`${varPrefix}Handle`, 1, 3, `${varPrefix}PlusDIBuffer`, code); // +DI
        addCopyBuffer(`${varPrefix}Handle`, 2, 3, `${varPrefix}MinusDIBuffer`, code); // -DI
        break;
      }
    }
  }
}
