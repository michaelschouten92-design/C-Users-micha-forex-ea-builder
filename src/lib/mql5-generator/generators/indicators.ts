import type {
  BuilderNode,
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ATRNodeData,
  ADXNodeData,
  StochasticNodeData,
  CCINodeData,
  IchimokuNodeData,
  CustomIndicatorNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";
import { MA_METHOD_MAP, APPLIED_PRICE_MAP, getTimeframeEnum } from "../types";
import { createInput } from "./shared";

// Helper to add handle validation after creation.
// Note: MQL5 calls OnDeinit even when OnInit returns INIT_FAILED,
// so previously created handles are safely released via the onDeinit cleanup entries.
function addHandleValidation(varPrefix: string, label: string, code: GeneratedCode): void {
  code.onInit.push(
    `if(${varPrefix}Handle == INVALID_HANDLE) { Print("Failed to create ${label} indicator handle"); return(INIT_FAILED); }`
  );
}

// Helper to add CopyBuffer with error checking
function addCopyBuffer(
  handle: string,
  bufferIndex: number,
  count: number,
  target: string,
  code: GeneratedCode
): void {
  code.onTick.push(
    `if(CopyBuffer(${handle}, ${bufferIndex}, 0, ${count}, ${target}) < ${count}) return;`
  );
}

export function generateIndicatorCode(node: BuilderNode, index: number, code: GeneratedCode): void {
  const data = node.data;
  const varPrefix = `ind${index}`;

  // Determine indicator type from node.type or data.indicatorType
  const indicatorType = ("indicatorType" in data ? data.indicatorType : null) || node.type;

  if (indicatorType) {
    switch (indicatorType) {
      case "moving-average": {
        const ma = data as MovingAverageNodeData;
        const method = MA_METHOD_MAP[ma.method as keyof typeof MA_METHOD_MAP] ?? "MODE_SMA";
        const price =
          APPLIED_PRICE_MAP[ma.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";
        const copyBars = ma.signalMode === "candle_close" ? 4 : 3;
        const group = `Moving Average ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpMA${index}Period`,
            "int",
            ma.period,
            `MA ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "shift",
            `InpMA${index}Shift`,
            "int",
            ma.shift,
            `MA ${index + 1} Shift`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "method",
            `InpMA${index}Method`,
            "ENUM_MA_METHOD",
            method,
            `MA ${index + 1} Method`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "appliedPrice",
            `InpMA${index}Price`,
            "ENUM_APPLIED_PRICE",
            price,
            `MA ${index + 1} Applied Price`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpMA${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(ma.timeframe),
            `MA ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMA(_Symbol, (ENUM_TIMEFRAMES)InpMA${index}Timeframe, InpMA${index}Period, InpMA${index}Shift, InpMA${index}Method, InpMA${index}Price);`
        );
        addHandleValidation(varPrefix, `MA ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, Number(ma.period) || 14);
        break;
      }

      case "rsi": {
        const rsi = data as RSINodeData;
        const price =
          APPLIED_PRICE_MAP[rsi.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";
        const copyBarsOverride = "_copyBarsOverride" in data ? Number(data._copyBarsOverride) : 0;
        const copyBars =
          copyBarsOverride > 0 ? copyBarsOverride : rsi.signalMode === "candle_close" ? 4 : 3;
        const group = `RSI ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpRSI${index}Period`,
            "int",
            rsi.period,
            `RSI ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "appliedPrice",
            `InpRSI${index}Price`,
            "ENUM_APPLIED_PRICE",
            price,
            `RSI ${index + 1} Applied Price`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpRSI${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(rsi.timeframe),
            `RSI ${index + 1} Timeframe`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "overboughtLevel",
            `InpRSI${index}Overbought`,
            "double",
            rsi.overboughtLevel,
            `RSI ${index + 1} Overbought`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "oversoldLevel",
            `InpRSI${index}Oversold`,
            "double",
            rsi.oversoldLevel,
            `RSI ${index + 1} Oversold`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iRSI(_Symbol, (ENUM_TIMEFRAMES)InpRSI${index}Timeframe, InpRSI${index}Period, InpRSI${index}Price);`
        );
        addHandleValidation(varPrefix, `RSI ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, Number(rsi.period) || 14);
        break;
      }

      case "macd": {
        const macd = data as MACDNodeData;
        const price =
          APPLIED_PRICE_MAP[macd.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";
        const copyBarsOverride = "_copyBarsOverride" in data ? Number(data._copyBarsOverride) : 0;
        const copyBars =
          copyBarsOverride > 0 ? copyBarsOverride : macd.signalMode === "candle_close" ? 4 : 3;
        const group = `MACD ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "fastPeriod",
            `InpMACD${index}Fast`,
            "int",
            macd.fastPeriod,
            `MACD ${index + 1} Fast Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "slowPeriod",
            `InpMACD${index}Slow`,
            "int",
            macd.slowPeriod,
            `MACD ${index + 1} Slow Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "signalPeriod",
            `InpMACD${index}Signal`,
            "int",
            macd.signalPeriod,
            `MACD ${index + 1} Signal Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "appliedPrice",
            `InpMACD${index}Price`,
            "ENUM_APPLIED_PRICE",
            price,
            `MACD ${index + 1} Applied Price`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpMACD${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(macd.timeframe),
            `MACD ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}HistogramBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMACD(_Symbol, (ENUM_TIMEFRAMES)InpMACD${index}Timeframe, InpMACD${index}Fast, InpMACD${index}Slow, InpMACD${index}Signal, InpMACD${index}Price);`
        );
        addHandleValidation(varPrefix, `MACD ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SignalBuffer, true);`);
        code.onInit.push(`ArrayResize(${varPrefix}HistogramBuffer, ${copyBars});`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}HistogramBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}MainBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}SignalBuffer`, code);
        // Compute histogram (main - signal) after buffers are filled
        code.onTick.push(
          `for(int _h${index}=0; _h${index}<${copyBars}; _h${index}++) ${varPrefix}HistogramBuffer[_h${index}] = ${varPrefix}MainBuffer[_h${index}] - ${varPrefix}SignalBuffer[_h${index}];`
        );
        code.maxIndicatorPeriod = Math.max(
          code.maxIndicatorPeriod,
          (Number(macd.slowPeriod) || 26) + (Number(macd.signalPeriod) || 9)
        );
        break;
      }

      case "bollinger-bands": {
        const bb = data as BollingerBandsNodeData;
        const price =
          APPLIED_PRICE_MAP[bb.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";
        const copyBars = bb.signalMode === "candle_close" ? 4 : 3;
        const group = `Bollinger Bands ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpBB${index}Period`,
            "int",
            bb.period,
            `BB ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "deviation",
            `InpBB${index}Deviation`,
            "double",
            bb.deviation,
            `BB ${index + 1} Deviation`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "shift",
            `InpBB${index}Shift`,
            "int",
            bb.shift,
            `BB ${index + 1} Shift`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "appliedPrice",
            `InpBB${index}Price`,
            "ENUM_APPLIED_PRICE",
            price,
            `BB ${index + 1} Applied Price`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpBB${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(bb.timeframe),
            `BB ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}UpperBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}MiddleBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}LowerBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iBands(_Symbol, (ENUM_TIMEFRAMES)InpBB${index}Timeframe, InpBB${index}Period, InpBB${index}Shift, InpBB${index}Deviation, InpBB${index}Price);`
        );
        addHandleValidation(varPrefix, `BB ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}UpperBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MiddleBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}LowerBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}MiddleBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}UpperBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 2, copyBars, `${varPrefix}LowerBuffer`, code);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, Number(bb.period) || 20);
        break;
      }

      case "atr": {
        const atr = data as ATRNodeData;
        const copyBars = atr.signalMode === "candle_close" ? 4 : 3;
        const group = `ATR ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpATR${index}Period`,
            "int",
            atr.period,
            `ATR ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpATR${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(atr.timeframe),
            `ATR ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iATR(_Symbol, (ENUM_TIMEFRAMES)InpATR${index}Timeframe, InpATR${index}Period);`
        );
        addHandleValidation(varPrefix, `ATR ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, Number(atr.period) || 14);
        break;
      }

      case "adx": {
        const adx = data as ADXNodeData;
        const copyBars = adx.signalMode === "candle_close" ? 4 : 3;
        const group = `ADX ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpADX${index}Period`,
            "int",
            adx.period,
            `ADX ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "trendLevel",
            `InpADX${index}TrendLevel`,
            "double",
            adx.trendLevel,
            `ADX ${index + 1} Trend Level`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpADX${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(adx.timeframe),
            `ADX ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`); // ADX main line
        code.globalVariables.push(`double ${varPrefix}PlusDIBuffer[];`); // +DI line
        code.globalVariables.push(`double ${varPrefix}MinusDIBuffer[];`); // -DI line
        code.onInit.push(
          `${varPrefix}Handle = iADX(_Symbol, (ENUM_TIMEFRAMES)InpADX${index}Timeframe, InpADX${index}Period);`
        );
        addHandleValidation(varPrefix, `ADX ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}PlusDIBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MinusDIBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}MainBuffer`, code); // ADX
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}PlusDIBuffer`, code); // +DI
        addCopyBuffer(`${varPrefix}Handle`, 2, copyBars, `${varPrefix}MinusDIBuffer`, code); // -DI
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, (Number(adx.period) || 14) * 2);
        break;
      }

      case "stochastic": {
        const stoch = data as StochasticNodeData;
        const method = MA_METHOD_MAP[stoch.maMethod as keyof typeof MA_METHOD_MAP] ?? "MODE_SMA";
        const priceField = stoch.priceField === "CLOSECLOSE" ? "STO_CLOSECLOSE" : "STO_LOWHIGH";
        const copyBars = stoch.signalMode === "candle_close" ? 4 : 3;
        const group = `Stochastic ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "kPeriod",
            `InpStoch${index}KPeriod`,
            "int",
            stoch.kPeriod,
            `Stochastic ${index + 1} K Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "dPeriod",
            `InpStoch${index}DPeriod`,
            "int",
            stoch.dPeriod,
            `Stochastic ${index + 1} D Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "slowing",
            `InpStoch${index}Slowing`,
            "int",
            stoch.slowing,
            `Stochastic ${index + 1} Slowing`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "maMethod",
            `InpStoch${index}MAMethod`,
            "ENUM_MA_METHOD",
            method,
            `Stochastic ${index + 1} MA Method`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "priceField",
            `InpStoch${index}PriceField`,
            "ENUM_STO_PRICE",
            priceField,
            `Stochastic ${index + 1} Price Field`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "overboughtLevel",
            `InpStoch${index}Overbought`,
            "double",
            stoch.overboughtLevel,
            `Stochastic ${index + 1} Overbought`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "oversoldLevel",
            `InpStoch${index}Oversold`,
            "double",
            stoch.oversoldLevel,
            `Stochastic ${index + 1} Oversold`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpStoch${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(stoch.timeframe),
            `Stochastic ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`); // %K line
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`); // %D line
        code.onInit.push(
          `${varPrefix}Handle = iStochastic(_Symbol, (ENUM_TIMEFRAMES)InpStoch${index}Timeframe, InpStoch${index}KPeriod, InpStoch${index}DPeriod, InpStoch${index}Slowing, InpStoch${index}MAMethod, InpStoch${index}PriceField);`
        );
        addHandleValidation(varPrefix, `Stochastic ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SignalBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}MainBuffer`, code); // %K
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}SignalBuffer`, code); // %D
        code.maxIndicatorPeriod = Math.max(
          code.maxIndicatorPeriod,
          (Number(stoch.kPeriod) || 5) + (Number(stoch.dPeriod) || 3) + (Number(stoch.slowing) || 3)
        );
        break;
      }

      case "cci": {
        const cci = data as CCINodeData;
        const price =
          APPLIED_PRICE_MAP[cci.appliedPrice as keyof typeof APPLIED_PRICE_MAP] ?? "PRICE_CLOSE";
        const copyBars = cci.signalMode === "candle_close" ? 4 : 3;
        const group = `CCI ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpCCI${index}Period`,
            "int",
            cci.period,
            `CCI ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "appliedPrice",
            `InpCCI${index}Price`,
            "ENUM_APPLIED_PRICE",
            price,
            `CCI ${index + 1} Applied Price`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "overboughtLevel",
            `InpCCI${index}Overbought`,
            "double",
            cci.overboughtLevel,
            `CCI ${index + 1} Overbought`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "oversoldLevel",
            `InpCCI${index}Oversold`,
            "double",
            cci.oversoldLevel,
            `CCI ${index + 1} Oversold`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpCCI${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(cci.timeframe),
            `CCI ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iCCI(_Symbol, (ENUM_TIMEFRAMES)InpCCI${index}Timeframe, InpCCI${index}Period, InpCCI${index}Price);`
        );
        addHandleValidation(varPrefix, `CCI ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, Number(cci.period) || 14);
        break;
      }

      case "ichimoku": {
        const ichi = data as IchimokuNodeData;
        const copyBars = ichi.signalMode === "candle_close" ? 4 : 3;
        const group = `Ichimoku ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "tenkanPeriod",
            `InpIchi${index}Tenkan`,
            "int",
            ichi.tenkanPeriod,
            `Ichimoku ${index + 1} Tenkan Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "kijunPeriod",
            `InpIchi${index}Kijun`,
            "int",
            ichi.kijunPeriod,
            `Ichimoku ${index + 1} Kijun Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "senkouBPeriod",
            `InpIchi${index}SenkouB`,
            "int",
            ichi.senkouBPeriod,
            `Ichimoku ${index + 1} Senkou B Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpIchi${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(ichi.timeframe),
            `Ichimoku ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}TenkanBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}KijunBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SpanABuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SpanBBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iIchimoku(_Symbol, (ENUM_TIMEFRAMES)InpIchi${index}Timeframe, InpIchi${index}Tenkan, InpIchi${index}Kijun, InpIchi${index}SenkouB);`
        );
        addHandleValidation(varPrefix, `Ichimoku ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}TenkanBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}KijunBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SpanABuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SpanBBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}TenkanBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}KijunBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 2, copyBars, `${varPrefix}SpanABuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 3, copyBars, `${varPrefix}SpanBBuffer`, code);
        code.maxIndicatorPeriod = Math.max(
          code.maxIndicatorPeriod,
          (Number(ichi.senkouBPeriod) || 52) * 2
        );
        break;
      }

      case "custom-indicator": {
        const ci = data as CustomIndicatorNodeData;
        const copyBars = ci.signalMode === "candle_close" ? 4 : 3;
        const group = `Custom Indicator ${index + 1}`;
        const safeName = (ci.indicatorName || "CustomIndicator").replace(/[^a-zA-Z0-9_]/g, "_");
        const bufferIdx = ci.bufferIndex ?? 0;

        // Build iCustom parameter list
        const paramValues = (ci.params ?? []).map((p) => {
          const num = Number(p.value);
          if (!isNaN(num) && p.value.trim() !== "") return String(num);
          return `"${p.value.replace(/"/g, '\\"')}"`;
        });
        const paramList = paramValues.length > 0 ? ", " + paramValues.join(", ") : "";

        code.inputs.push(
          createInput(
            node,
            "bufferIndex",
            `InpCustom${index}Buffer`,
            "int",
            bufferIdx,
            `${safeName} Buffer Index`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpCustom${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(ci.timeframe),
            `${safeName} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iCustom(_Symbol, (ENUM_TIMEFRAMES)InpCustom${index}Timeframe, "${safeName}"${paramList});`
        );
        addHandleValidation(varPrefix, safeName, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, bufferIdx, copyBars, `${varPrefix}Buffer`, code);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, 50);
        break;
      }

      case "condition": {
        // Condition nodes don't create indicator handles themselves.
        // They reference a connected indicator's buffer value and compare against a threshold.
        // The entry logic generator handles the condition comparison.
        break;
      }
    }
  }
}
