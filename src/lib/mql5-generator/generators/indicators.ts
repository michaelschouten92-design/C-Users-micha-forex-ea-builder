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
  OBVNodeData,
  VWAPNodeData,
  BBSqueezeNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";
import { MA_METHOD_MAP, APPLIED_PRICE_MAP, getTimeframeEnum } from "../types";
import { createInput, sanitizeMQL5String, sanitizeName } from "./shared";

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
        // Validate MA period: minimum 1
        code.onInit.push(
          `if(InpMA${index}Period < 1) Print("WARNING: MA ${index + 1} period (", InpMA${index}Period, ") is < 1. Clamping to 1.");`
        );
        code.onInit.push(
          `${varPrefix}Handle = iMA(_Symbol, (ENUM_TIMEFRAMES)InpMA${index}Timeframe, MathMax(1, InpMA${index}Period), InpMA${index}Shift, InpMA${index}Method, InpMA${index}Price);`
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
        // Validate RSI period: minimum 2 (MQL5 requires at least 2 for RSI calculation)
        code.onInit.push(
          `if(InpRSI${index}Period < 2) { Print("WARNING: RSI ${index + 1} period (", InpRSI${index}Period, ") is < 2. Clamping to 2."); }`
        );
        code.onInit.push(
          `${varPrefix}Handle = iRSI(_Symbol, (ENUM_TIMEFRAMES)InpRSI${index}Timeframe, MathMax(2, InpRSI${index}Period), InpRSI${index}Price);`
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
        // Validate MACD: fast period must be less than slow period, all periods >= 1
        code.onInit.push(
          `if(InpMACD${index}Fast < 1 || InpMACD${index}Slow < 1 || InpMACD${index}Signal < 1) Print("WARNING: MACD ${index + 1} has period(s) < 1. Clamping to minimum 1.");`
        );
        code.onInit.push(
          `if(InpMACD${index}Fast >= InpMACD${index}Slow) Print("WARNING: MACD ${index + 1} fast period (", InpMACD${index}Fast, ") >= slow period (", InpMACD${index}Slow, "). This produces unreliable signals.");`
        );
        code.onInit.push(
          `${varPrefix}Handle = iMACD(_Symbol, (ENUM_TIMEFRAMES)InpMACD${index}Timeframe, MathMax(1, InpMACD${index}Fast), MathMax(1, InpMACD${index}Slow), MathMax(1, InpMACD${index}Signal), InpMACD${index}Price);`
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
        // Compute histogram (main - signal) for bars 0 and 1 only
        code.onTick.push(
          `${varPrefix}HistogramBuffer[0] = ${varPrefix}MainBuffer[0] - ${varPrefix}SignalBuffer[0];`
        );
        code.onTick.push(
          `${varPrefix}HistogramBuffer[1] = ${varPrefix}MainBuffer[1] - ${varPrefix}SignalBuffer[1];`
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
        // Validate ATR period: minimum 1, warn if > 500 (excessive lookback)
        code.onInit.push(
          `if(InpATR${index}Period < 1) Print("WARNING: ATR ${index + 1} period (", InpATR${index}Period, ") is < 1. Clamping to 1.");`
        );
        code.onInit.push(
          `if(InpATR${index}Period > 500) Print("WARNING: ATR ${index + 1} period (", InpATR${index}Period, ") is very large (> 500). This may cause slow calculation and unreliable signals.");`
        );
        code.onInit.push(
          `${varPrefix}Handle = iATR(_Symbol, (ENUM_TIMEFRAMES)InpATR${index}Timeframe, MathMax(1, InpATR${index}Period));`
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
        // Validate ADX period: minimum 2
        code.onInit.push(
          `if(InpADX${index}Period < 2) Print("WARNING: ADX ${index + 1} period (", InpADX${index}Period, ") is < 2. Clamping to 2.");`
        );
        code.onInit.push(
          `${varPrefix}Handle = iADX(_Symbol, (ENUM_TIMEFRAMES)InpADX${index}Timeframe, MathMax(2, InpADX${index}Period));`
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
        // Validate CCI period: minimum 2
        code.onInit.push(
          `if(InpCCI${index}Period < 2) Print("WARNING: CCI ${index + 1} period (", InpCCI${index}Period, ") is < 2. Clamping to 2.");`
        );
        code.onInit.push(
          `${varPrefix}Handle = iCCI(_Symbol, (ENUM_TIMEFRAMES)InpCCI${index}Timeframe, MathMax(2, InpCCI${index}Period), InpCCI${index}Price);`
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
        const ichiMode = ichi.ichimokuMode ?? "TENKAN_KIJUN_CROSS";
        // FULL mode needs bars shifted by 26 for Chikou Span confirmation
        const baseCopyBars = ichi.signalMode === "candle_close" ? 4 : 3;
        const copyBars = ichiMode === "FULL" ? Math.max(baseCopyBars, 28) : baseCopyBars;
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
        const safeName = sanitizeMQL5String(ci.indicatorName || "CustomIndicator");
        // MT5 supports up to 8 buffers per indicator (indices 0-7). Clamp to valid range.
        const bufferIdx = Math.min(Math.max(0, ci.bufferIndex ?? 0), 7);

        // Create input variables for each custom indicator parameter so they
        // become individually optimizable in the MT5 strategy tester
        const paramInputNames: string[] = [];
        for (let pi = 0; pi < (ci.params ?? []).length; pi++) {
          const p = ci.params[pi];
          const paramType = p.type ?? undefined;
          const safeParamName = sanitizeName(p.name || `Param${pi}`);
          const inputName = `InpCustom${index}P${pi}`;
          const comment = `${safeName} ${safeParamName}`;

          if (paramType === "int") {
            const intVal = parseInt(p.value, 10);
            code.inputs.push(
              createInput(
                node,
                `params.${pi}`,
                inputName,
                "int",
                isNaN(intVal) ? 0 : intVal,
                comment,
                group
              )
            );
            paramInputNames.push(inputName);
          } else if (paramType === "double") {
            const dblVal = parseFloat(p.value);
            code.inputs.push(
              createInput(
                node,
                `params.${pi}`,
                inputName,
                "double",
                isNaN(dblVal) ? 0.0 : dblVal,
                comment,
                group
              )
            );
            paramInputNames.push(inputName);
          } else if (paramType === "bool") {
            const lower = p.value.toLowerCase();
            const boolVal = lower === "true" || lower === "1";
            code.inputs.push(
              createInput(node, `params.${pi}`, inputName, "bool", boolVal, comment, group)
            );
            paramInputNames.push(inputName);
          } else if (paramType === "string") {
            code.inputs.push(
              createInput(node, `params.${pi}`, inputName, "string", p.value, comment, group)
            );
            paramInputNames.push(inputName);
          } else if (paramType === "color") {
            // Color has no dedicated OptimizableInput type; use string
            const colorVal = p.value.trim() || "clrNONE";
            code.inputs.push(
              createInput(node, `params.${pi}`, inputName, "string", colorVal, comment, group)
            );
            paramInputNames.push(inputName);
          } else {
            // No type hint: auto-detect numeric vs string
            const num = Number(p.value);
            if (!isNaN(num) && p.value.trim() !== "") {
              code.inputs.push(
                createInput(node, `params.${pi}`, inputName, "double", num, comment, group)
              );
            } else {
              code.inputs.push(
                createInput(node, `params.${pi}`, inputName, "string", p.value, comment, group)
              );
            }
            paramInputNames.push(inputName);
          }
        }
        const paramList = paramInputNames.length > 0 ? ", " + paramInputNames.join(", ") : "";

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
        // Validate buffer index at runtime (MT5 supports buffers 0-7)
        code.onInit.push(
          `if(InpCustom${index}Buffer < 0 || InpCustom${index}Buffer > 7) Print("WARNING: ${safeName} buffer index (", InpCustom${index}Buffer, ") is out of range 0-7. Clamping.");`
        );
        code.onInit.push(
          `${varPrefix}Handle = iCustom(_Symbol, (ENUM_TIMEFRAMES)InpCustom${index}Timeframe, "${safeName}"${paramList});`
        );
        addHandleValidation(varPrefix, safeName, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        // Use runtime-clamped buffer index so the user's input is respected but bounded
        code.onTick.push(
          `if(CopyBuffer(${varPrefix}Handle, MathMin(MathMax(0, InpCustom${index}Buffer), 7), 0, ${copyBars}, ${varPrefix}Buffer) < ${copyBars}) return;`
        );
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, 50);
        break;
      }

      case "obv": {
        const obv = data as OBVNodeData;
        const copyBars = obv.signalMode === "candle_close" ? 4 : 3;
        const signalPeriod = obv.signalPeriod ?? 20;
        const group = `OBV ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "signalPeriod",
            `InpOBV${index}SignalPeriod`,
            "int",
            signalPeriod,
            `OBV ${index + 1} Signal SMA Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpOBV${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(obv.timeframe),
            `OBV ${index + 1} Timeframe`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iOBV(_Symbol, (ENUM_TIMEFRAMES)InpOBV${index}Timeframe, VOLUME_TICK);`
        );
        addHandleValidation(varPrefix, `OBV ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        // We need enough bars for SMA calculation on OBV
        const obvCopyBars = copyBars + signalPeriod;
        addCopyBuffer(`${varPrefix}Handle`, 0, obvCopyBars, `${varPrefix}Buffer`, code);
        // Calculate SMA signal line from OBV values
        code.onTick.push(`// OBV Signal line (SMA of OBV)`);
        code.onTick.push(`ArrayResize(${varPrefix}SignalBuffer, ${copyBars});`);
        code.onTick.push(`ArraySetAsSeries(${varPrefix}SignalBuffer, true);`);
        code.onTick.push(`for(int _ob${index}=0; _ob${index}<${copyBars}; _ob${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(`   double sum = 0;`);
        code.onTick.push(
          `   for(int _obs${index}=0; _obs${index}<InpOBV${index}SignalPeriod; _obs${index}++)`
        );
        code.onTick.push(`      sum += ${varPrefix}Buffer[_ob${index} + _obs${index}];`);
        code.onTick.push(
          `   ${varPrefix}SignalBuffer[_ob${index}] = sum / InpOBV${index}SignalPeriod;`
        );
        code.onTick.push(`}`);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, signalPeriod + 10);
        break;
      }

      case "vwap": {
        const vwap = data as VWAPNodeData;
        const resetPeriod = vwap.resetPeriod ?? "daily";
        const group = `VWAP ${index + 1}`;

        // Map resetPeriod string to integer for optimizable input (0=daily, 1=weekly, 2=monthly)
        let resetPeriodInt = 0;
        if (resetPeriod === "weekly") resetPeriodInt = 1;
        else if (resetPeriod === "monthly") resetPeriodInt = 2;

        code.inputs.push(
          createInput(
            node,
            "resetPeriod",
            `InpVWAP${index}ResetPeriod`,
            "int",
            resetPeriodInt,
            `VWAP ${index + 1} Reset Period (0=Daily, 1=Weekly, 2=Monthly)`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpVWAP${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(vwap.timeframe),
            `VWAP ${index + 1} Timeframe`,
            group
          )
        );
        // Global variables for VWAP calculation
        code.globalVariables.push(`double ${varPrefix}Value = 0;`);
        code.globalVariables.push(`double ${varPrefix}SumVP = 0;`);
        code.globalVariables.push(`double ${varPrefix}SumVol = 0;`);
        code.globalVariables.push(`datetime ${varPrefix}ResetTime = 0;`);

        // Calculate VWAP manually in OnTick with runtime-selectable reset period
        code.onTick.push(`// VWAP calculation (reset period: 0=daily, 1=weekly, 2=monthly)`);
        code.onTick.push(`{`);
        code.onTick.push(`   ENUM_TIMEFRAMES vwapTf = (ENUM_TIMEFRAMES)InpVWAP${index}Timeframe;`);
        code.onTick.push(
          `   ENUM_TIMEFRAMES resetTf = (InpVWAP${index}ResetPeriod == 2) ? PERIOD_MN1 : (InpVWAP${index}ResetPeriod == 1) ? PERIOD_W1 : PERIOD_D1;`
        );
        code.onTick.push(`   datetime barTime = iTime(_Symbol, resetTf, 0);`);
        code.onTick.push(`   if(barTime != ${varPrefix}ResetTime)`);
        code.onTick.push(`   {`);
        code.onTick.push(`      ${varPrefix}SumVP = 0;`);
        code.onTick.push(`      ${varPrefix}SumVol = 0;`);
        code.onTick.push(`      ${varPrefix}ResetTime = barTime;`);
        code.onTick.push(`   }`);
        code.onTick.push(
          `   double tp = (iHigh(_Symbol, vwapTf, 0) + iLow(_Symbol, vwapTf, 0) + iClose(_Symbol, vwapTf, 0)) / 3.0;`
        );
        code.onTick.push(`   double vol = (double)iVolume(_Symbol, vwapTf, 0);`);
        code.onTick.push(`   ${varPrefix}SumVP += tp * vol;`);
        code.onTick.push(`   ${varPrefix}SumVol += vol;`);
        code.onTick.push(
          `   ${varPrefix}Value = (${varPrefix}SumVol > 0) ? ${varPrefix}SumVP / ${varPrefix}SumVol : tp;`
        );
        code.onTick.push(`}`);
        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, 50);
        break;
      }

      case "bb-squeeze": {
        const bbs = data as BBSqueezeNodeData;
        const copyBars = bbs.signalMode === "candle_close" ? 4 : 3;
        const group = `BB Squeeze ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "bbPeriod",
            `InpBBS${index}BBPeriod`,
            "int",
            bbs.bbPeriod,
            `BB Squeeze ${index + 1} BB Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "bbDeviation",
            `InpBBS${index}BBDev`,
            "double",
            bbs.bbDeviation,
            `BB Squeeze ${index + 1} BB Deviation`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "kcPeriod",
            `InpBBS${index}KCPeriod`,
            "int",
            bbs.kcPeriod,
            `BB Squeeze ${index + 1} KC Period`,
            group
          )
        );
        // Clamp kcMultiplier: minimum 1.0 to ensure KC is wider than BB (otherwise squeeze is meaningless)
        const clampedKCMult = Math.max(1.0, bbs.kcMultiplier ?? 1.5);
        code.inputs.push(
          createInput(
            node,
            "kcMultiplier",
            `InpBBS${index}KCMult`,
            "double",
            clampedKCMult,
            `BB Squeeze ${index + 1} KC Multiplier (min 1.0)`,
            group
          )
        );
        // Add runtime clamping in generated code
        code.onInit.push(
          `if(InpBBS${index}KCMult < 1.0) { Print("WARNING: BB Squeeze KC Multiplier clamped to 1.0 (was ", InpBBS${index}KCMult, "). Values < 1.0 produce nonsensical signals."); }`
        );
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpBBS${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(bbs.timeframe),
            `BB Squeeze ${index + 1} Timeframe`,
            group
          )
        );

        // BB handle
        code.globalVariables.push(`int ${varPrefix}BBHandle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}BBUpper[];`);
        code.globalVariables.push(`double ${varPrefix}BBMiddle[];`);
        code.globalVariables.push(`double ${varPrefix}BBLower[];`);
        // ATR handle for Keltner Channel
        code.globalVariables.push(`int ${varPrefix}ATRHandle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}ATRBuffer[];`);
        // KC EMA handle for Keltner Channel basis
        code.globalVariables.push(`int ${varPrefix}KCEMAHandle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}KCEMABuffer[];`);
        // Squeeze state
        code.globalVariables.push(`bool ${varPrefix}InSqueeze = false;`);
        code.globalVariables.push(`bool ${varPrefix}WasSqueeze = false;`);

        code.onInit.push(
          `${varPrefix}BBHandle = iBands(_Symbol, (ENUM_TIMEFRAMES)InpBBS${index}Timeframe, InpBBS${index}BBPeriod, 0, InpBBS${index}BBDev, PRICE_CLOSE);`
        );
        addHandleValidation(varPrefix + "BB", `BB Squeeze ${index + 1} BB`, code);
        code.onInit.push(
          `${varPrefix}ATRHandle = iATR(_Symbol, (ENUM_TIMEFRAMES)InpBBS${index}Timeframe, InpBBS${index}KCPeriod);`
        );
        addHandleValidation(varPrefix + "ATR", `BB Squeeze ${index + 1} ATR`, code);
        code.onInit.push(
          `${varPrefix}KCEMAHandle = iMA(_Symbol, (ENUM_TIMEFRAMES)InpBBS${index}Timeframe, InpBBS${index}KCPeriod, 0, MODE_EMA, PRICE_CLOSE);`
        );
        addHandleValidation(varPrefix + "KCEMA", `BB Squeeze ${index + 1} KC EMA`, code);

        code.onDeinit.push(
          `if(${varPrefix}BBHandle != INVALID_HANDLE) IndicatorRelease(${varPrefix}BBHandle);`
        );
        code.onDeinit.push(
          `if(${varPrefix}ATRHandle != INVALID_HANDLE) IndicatorRelease(${varPrefix}ATRHandle);`
        );
        code.onDeinit.push(
          `if(${varPrefix}KCEMAHandle != INVALID_HANDLE) IndicatorRelease(${varPrefix}KCEMAHandle);`
        );

        code.onInit.push(`ArraySetAsSeries(${varPrefix}BBUpper, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}BBMiddle, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}BBLower, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}ATRBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}KCEMABuffer, true);`);

        addCopyBuffer(`${varPrefix}BBHandle`, 0, copyBars, `${varPrefix}BBMiddle`, code);
        addCopyBuffer(`${varPrefix}BBHandle`, 1, copyBars, `${varPrefix}BBUpper`, code);
        addCopyBuffer(`${varPrefix}BBHandle`, 2, copyBars, `${varPrefix}BBLower`, code);
        addCopyBuffer(`${varPrefix}ATRHandle`, 0, copyBars, `${varPrefix}ATRBuffer`, code);
        addCopyBuffer(`${varPrefix}KCEMAHandle`, 0, copyBars, `${varPrefix}KCEMABuffer`, code);

        // Calculate squeeze state: BB inside KC
        code.onTick.push(`//--- BB Squeeze ${index + 1}: detect squeeze and breakout`);
        code.onTick.push(`${varPrefix}WasSqueeze = ${varPrefix}InSqueeze;`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   double kcUpper1 = ${varPrefix}KCEMABuffer[1] + InpBBS${index}KCMult * ${varPrefix}ATRBuffer[1];`
        );
        code.onTick.push(
          `   double kcLower1 = ${varPrefix}KCEMABuffer[1] - InpBBS${index}KCMult * ${varPrefix}ATRBuffer[1];`
        );
        code.onTick.push(
          `   bool prevSqueeze = ${varPrefix}BBUpper[1] < kcUpper1 && ${varPrefix}BBLower[1] > kcLower1;`
        );
        code.onTick.push(
          `   double kcUpper0 = ${varPrefix}KCEMABuffer[0] + InpBBS${index}KCMult * ${varPrefix}ATRBuffer[0];`
        );
        code.onTick.push(
          `   double kcLower0 = ${varPrefix}KCEMABuffer[0] - InpBBS${index}KCMult * ${varPrefix}ATRBuffer[0];`
        );
        code.onTick.push(
          `   ${varPrefix}InSqueeze = ${varPrefix}BBUpper[0] < kcUpper0 && ${varPrefix}BBLower[0] > kcLower0;`
        );
        code.onTick.push(`   ${varPrefix}WasSqueeze = prevSqueeze;`);
        code.onTick.push(`}`);

        code.maxIndicatorPeriod = Math.max(
          code.maxIndicatorPeriod,
          Math.max(Number(bbs.bbPeriod) || 20, Number(bbs.kcPeriod) || 20)
        );
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
