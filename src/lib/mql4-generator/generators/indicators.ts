// MQL4 Indicator Code Generator
// Key difference from MQL5: direct indicator calls (iMA, iRSI, etc.) with bar index
// instead of handle-based CopyBuffer approach.

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
import { createInput } from "./shared";

export function generateIndicatorCode(node: BuilderNode, index: number, code: GeneratedCode): void {
  const data = node.data;
  const varPrefix = `ind${index}`;

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

        // MQL4: declare buffer arrays and fill them with direct iMA calls
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}Buffer, ${copyBars});`);

        // OnTick: fill buffer with direct iMA calls
        code.onTick.push(`//--- MA ${index + 1}: fill buffer via iMA()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(
          `   ${varPrefix}Buffer[_i${index}] = iMA(Symbol(), (int)InpMA${index}Timeframe, InpMA${index}Period, InpMA${index}Shift, InpMA${index}Method, InpMA${index}Price, _i${index});`
        );

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

        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}Buffer, ${copyBars});`);

        code.onTick.push(`//--- RSI ${index + 1}: fill buffer via iRSI()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(
          `   ${varPrefix}Buffer[_i${index}] = iRSI(Symbol(), (int)InpRSI${index}Timeframe, InpRSI${index}Period, InpRSI${index}Price, _i${index});`
        );

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

        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}HistogramBuffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}MainBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}SignalBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}HistogramBuffer, ${copyBars});`);

        // MQL4 iMACD: buffer 0 = main line, buffer 1 = signal line
        code.onTick.push(`//--- MACD ${index + 1}: fill buffers via iMACD()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   ${varPrefix}MainBuffer[_i${index}] = iMACD(Symbol(), (int)InpMACD${index}Timeframe, InpMACD${index}Fast, InpMACD${index}Slow, InpMACD${index}Signal, InpMACD${index}Price, MODE_MAIN, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}SignalBuffer[_i${index}] = iMACD(Symbol(), (int)InpMACD${index}Timeframe, InpMACD${index}Fast, InpMACD${index}Slow, InpMACD${index}Signal, InpMACD${index}Price, MODE_SIGNAL, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}HistogramBuffer[_i${index}] = ${varPrefix}MainBuffer[_i${index}] - ${varPrefix}SignalBuffer[_i${index}];`
        );
        code.onTick.push(`}`);

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

        code.globalVariables.push(`double ${varPrefix}UpperBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}MiddleBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}LowerBuffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}UpperBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}MiddleBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}LowerBuffer, ${copyBars});`);

        // MQL4 iBands: MODE_UPPER=1, MODE_MAIN=0, MODE_LOWER=2
        code.onTick.push(`//--- BB ${index + 1}: fill buffers via iBands()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   ${varPrefix}MiddleBuffer[_i${index}] = iBands(Symbol(), (int)InpBB${index}Timeframe, InpBB${index}Period, InpBB${index}Deviation, InpBB${index}Shift, InpBB${index}Price, MODE_MAIN, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}UpperBuffer[_i${index}] = iBands(Symbol(), (int)InpBB${index}Timeframe, InpBB${index}Period, InpBB${index}Deviation, InpBB${index}Shift, InpBB${index}Price, MODE_UPPER, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}LowerBuffer[_i${index}] = iBands(Symbol(), (int)InpBB${index}Timeframe, InpBB${index}Period, InpBB${index}Deviation, InpBB${index}Shift, InpBB${index}Price, MODE_LOWER, _i${index});`
        );
        code.onTick.push(`}`);

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

        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}Buffer, ${copyBars});`);

        code.onTick.push(`//--- ATR ${index + 1}: fill buffer via iATR()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(
          `   ${varPrefix}Buffer[_i${index}] = iATR(Symbol(), (int)InpATR${index}Timeframe, InpATR${index}Period, _i${index});`
        );

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

        // MQL4 iADX: MODE_MAIN=0, MODE_PLUSDI=1, MODE_MINUSDI=2
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}PlusDIBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}MinusDIBuffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}MainBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}PlusDIBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}MinusDIBuffer, ${copyBars});`);

        code.onTick.push(`//--- ADX ${index + 1}: fill buffers via iADX()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   ${varPrefix}MainBuffer[_i${index}] = iADX(Symbol(), (int)InpADX${index}Timeframe, InpADX${index}Period, PRICE_CLOSE, MODE_MAIN, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}PlusDIBuffer[_i${index}] = iADX(Symbol(), (int)InpADX${index}Timeframe, InpADX${index}Period, PRICE_CLOSE, MODE_PLUSDI, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}MinusDIBuffer[_i${index}] = iADX(Symbol(), (int)InpADX${index}Timeframe, InpADX${index}Period, PRICE_CLOSE, MODE_MINUSDI, _i${index});`
        );
        code.onTick.push(`}`);

        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, (Number(adx.period) || 14) * 2);
        break;
      }

      case "stochastic": {
        const stoch = data as StochasticNodeData;
        const method = MA_METHOD_MAP[stoch.maMethod as keyof typeof MA_METHOD_MAP] ?? "MODE_SMA";
        const priceField = stoch.priceField === "CLOSECLOSE" ? "1" : "0"; // MQL4: 0=Low/High, 1=Close/Close
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

        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}MainBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}SignalBuffer, ${copyBars});`);

        // MQL4 iStochastic: MODE_MAIN=0, MODE_SIGNAL=1
        code.onTick.push(`//--- Stochastic ${index + 1}: fill buffers via iStochastic()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   ${varPrefix}MainBuffer[_i${index}] = iStochastic(Symbol(), (int)InpStoch${index}Timeframe, InpStoch${index}KPeriod, InpStoch${index}DPeriod, InpStoch${index}Slowing, InpStoch${index}MAMethod, ${priceField}, MODE_MAIN, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}SignalBuffer[_i${index}] = iStochastic(Symbol(), (int)InpStoch${index}Timeframe, InpStoch${index}KPeriod, InpStoch${index}DPeriod, InpStoch${index}Slowing, InpStoch${index}MAMethod, ${priceField}, MODE_SIGNAL, _i${index});`
        );
        code.onTick.push(`}`);

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

        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}Buffer, ${copyBars});`);

        code.onTick.push(`//--- CCI ${index + 1}: fill buffer via iCCI()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(
          `   ${varPrefix}Buffer[_i${index}] = iCCI(Symbol(), (int)InpCCI${index}Timeframe, InpCCI${index}Period, InpCCI${index}Price, _i${index});`
        );

        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, Number(cci.period) || 14);
        break;
      }

      case "ichimoku": {
        const ichi = data as IchimokuNodeData;
        const ichiMode = ichi.ichimokuMode ?? "TENKAN_KIJUN_CROSS";
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

        // MQL4 iIchimoku: MODE_TENKANSEN=1, MODE_KIJUNSEN=2, MODE_SENKOUSPANA=3, MODE_SENKOUSPANB=4
        code.globalVariables.push(`double ${varPrefix}TenkanBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}KijunBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SpanABuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SpanBBuffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}TenkanBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}KijunBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}SpanABuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}SpanBBuffer, ${copyBars});`);

        code.onTick.push(`//--- Ichimoku ${index + 1}: fill buffers via iIchimoku()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   ${varPrefix}TenkanBuffer[_i${index}] = iIchimoku(Symbol(), (int)InpIchi${index}Timeframe, InpIchi${index}Tenkan, InpIchi${index}Kijun, InpIchi${index}SenkouB, MODE_TENKANSEN, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}KijunBuffer[_i${index}] = iIchimoku(Symbol(), (int)InpIchi${index}Timeframe, InpIchi${index}Tenkan, InpIchi${index}Kijun, InpIchi${index}SenkouB, MODE_KIJUNSEN, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}SpanABuffer[_i${index}] = iIchimoku(Symbol(), (int)InpIchi${index}Timeframe, InpIchi${index}Tenkan, InpIchi${index}Kijun, InpIchi${index}SenkouB, MODE_SENKOUSPANA, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}SpanBBuffer[_i${index}] = iIchimoku(Symbol(), (int)InpIchi${index}Timeframe, InpIchi${index}Tenkan, InpIchi${index}Kijun, InpIchi${index}SenkouB, MODE_SENKOUSPANB, _i${index});`
        );
        code.onTick.push(`}`);

        code.maxIndicatorPeriod = Math.max(
          code.maxIndicatorPeriod,
          (Number(ichi.senkouBPeriod) || 52) * 2
        );
        break;
      }

      case "obv": {
        const obv = data as OBVNodeData;
        const group = `OBV ${index + 1}`;
        const signalPeriod = obv.signalPeriod ?? 20;
        const copyBars = Math.max(signalPeriod + 2, obv.signalMode === "candle_close" ? 4 : 3);

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

        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}Buffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}SignalBuffer, ${copyBars});`);

        // MQL4: iOBV is available as iOBV(symbol, timeframe, applied_price, shift)
        code.onTick.push(`//--- OBV ${index + 1}: fill buffer via iOBV()`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(
          `   ${varPrefix}Buffer[_i${index}] = iOBV(Symbol(), (int)InpOBV${index}Timeframe, PRICE_CLOSE, _i${index});`
        );
        code.onTick.push(`// Calculate OBV signal line (SMA)`);
        code.onTick.push(`for(int _s${index}=0; _s${index}<2; _s${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(`   double sum = 0;`);
        code.onTick.push(`   for(int _j=0; _j<InpOBV${index}SignalPeriod; _j++)`);
        code.onTick.push(
          `      sum += iOBV(Symbol(), (int)InpOBV${index}Timeframe, PRICE_CLOSE, _s${index} + _j);`
        );
        code.onTick.push(
          `   ${varPrefix}SignalBuffer[_s${index}] = sum / InpOBV${index}SignalPeriod;`
        );
        code.onTick.push(`}`);

        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, signalPeriod + 2);
        break;
      }

      case "vwap": {
        const vwap = data as VWAPNodeData;
        const group = `VWAP ${index + 1}`;
        const copyBars = vwap.signalMode === "candle_close" ? 4 : 3;

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

        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}Buffer, ${copyBars});`);

        // MQL4: Calculate VWAP manually using price and volume arrays
        const resetPeriod = vwap.resetPeriod ?? "daily";
        let resetTf: string;
        if (resetPeriod === "weekly") resetTf = "PERIOD_W1";
        else if (resetPeriod === "monthly") resetTf = "PERIOD_MN1";
        else resetTf = "PERIOD_D1";

        code.onTick.push(`//--- VWAP ${index + 1}: manual calculation`);
        code.onTick.push(`{`);
        code.onTick.push(`   datetime vwapReset = iTime(Symbol(), ${resetTf}, 0);`);
        code.onTick.push(`   int tf = (int)InpVWAP${index}Timeframe;`);
        code.onTick.push(`   double sumPV = 0, sumV = 0;`);
        code.onTick.push(`   for(int b = 0; b < iBars(Symbol(), tf); b++)`);
        code.onTick.push(`   {`);
        code.onTick.push(`      if(iTime(Symbol(), tf, b) < vwapReset) break;`);
        code.onTick.push(
          `      double tp = (iHigh(Symbol(), tf, b) + iLow(Symbol(), tf, b) + iClose(Symbol(), tf, b)) / 3.0;`
        );
        code.onTick.push(`      double vol = (double)iVolume(Symbol(), tf, b);`);
        code.onTick.push(`      if(vol <= 0) vol = 1;`);
        code.onTick.push(`      sumPV += tp * vol;`);
        code.onTick.push(`      sumV += vol;`);
        code.onTick.push(`   }`);
        code.onTick.push(
          `   double vwapValue = (sumV > 0) ? sumPV / sumV : iClose(Symbol(), tf, 0);`
        );
        code.onTick.push(`   for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(`      ${varPrefix}Buffer[_i${index}] = vwapValue;`);
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
        code.inputs.push(
          createInput(
            node,
            "kcMultiplier",
            `InpBBS${index}KCMult`,
            "double",
            bbs.kcMultiplier,
            `BB Squeeze ${index + 1} KC Multiplier`,
            group
          )
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

        // Buffer arrays for BB, ATR, and KC EMA
        code.globalVariables.push(`double ${varPrefix}BBUpper[];`);
        code.globalVariables.push(`double ${varPrefix}BBMiddle[];`);
        code.globalVariables.push(`double ${varPrefix}BBLower[];`);
        code.globalVariables.push(`double ${varPrefix}ATRBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}KCEMABuffer[];`);
        code.globalVariables.push(`bool ${varPrefix}InSqueeze = false;`);
        code.globalVariables.push(`bool ${varPrefix}WasSqueeze = false;`);
        code.onInit.push(`ArrayResize(${varPrefix}BBUpper, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}BBMiddle, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}BBLower, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}ATRBuffer, ${copyBars});`);
        code.onInit.push(`ArrayResize(${varPrefix}KCEMABuffer, ${copyBars});`);

        // MQL4: fill buffers with direct iBands, iATR, iMA calls
        code.onTick.push(`//--- BB Squeeze ${index + 1}: fill buffers`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   ${varPrefix}BBMiddle[_i${index}] = iBands(Symbol(), (int)InpBBS${index}Timeframe, InpBBS${index}BBPeriod, InpBBS${index}BBDev, 0, PRICE_CLOSE, MODE_MAIN, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}BBUpper[_i${index}] = iBands(Symbol(), (int)InpBBS${index}Timeframe, InpBBS${index}BBPeriod, InpBBS${index}BBDev, 0, PRICE_CLOSE, MODE_UPPER, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}BBLower[_i${index}] = iBands(Symbol(), (int)InpBBS${index}Timeframe, InpBBS${index}BBPeriod, InpBBS${index}BBDev, 0, PRICE_CLOSE, MODE_LOWER, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}ATRBuffer[_i${index}] = iATR(Symbol(), (int)InpBBS${index}Timeframe, InpBBS${index}KCPeriod, _i${index});`
        );
        code.onTick.push(
          `   ${varPrefix}KCEMABuffer[_i${index}] = iMA(Symbol(), (int)InpBBS${index}Timeframe, InpBBS${index}KCPeriod, 0, MODE_EMA, PRICE_CLOSE, _i${index});`
        );
        code.onTick.push(`}`);

        // Squeeze detection
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

      case "custom-indicator": {
        const ci = data as CustomIndicatorNodeData;
        const copyBars = ci.signalMode === "candle_close" ? 4 : 3;
        const group = `Custom Indicator ${index + 1}`;
        const safeName = (ci.indicatorName || "CustomIndicator").replace(/[^a-zA-Z0-9_]/g, "_");
        const bufferIdx = ci.bufferIndex ?? 0;

        // Build iCustom parameter list with type-aware casting
        const paramValues = (ci.params ?? []).map((p) => {
          const paramType = p.type ?? undefined;
          if (paramType === "int") {
            const intVal = parseInt(p.value, 10);
            return isNaN(intVal) ? "0" : `(int)${intVal}`;
          }
          if (paramType === "double") {
            const dblVal = parseFloat(p.value);
            return isNaN(dblVal) ? "0.0" : `(double)${dblVal}`;
          }
          if (paramType === "bool") {
            const lower = p.value.toLowerCase();
            return lower === "true" || lower === "1" ? "true" : "false";
          }
          if (paramType === "string") {
            return `"${p.value.replace(/"/g, '\\"')}"`;
          }
          if (paramType === "color") {
            return p.value.trim() || "clrNONE";
          }
          // No type hint: auto-detect
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

        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(`ArrayResize(${varPrefix}Buffer, ${copyBars});`);

        // MQL4: iCustom(symbol, timeframe, name, ...params, buffer_index, shift)
        code.onTick.push(`//--- Custom Indicator ${index + 1}: ${safeName}`);
        code.onTick.push(`for(int _i${index}=0; _i${index}<${copyBars}; _i${index}++)`);
        code.onTick.push(
          `   ${varPrefix}Buffer[_i${index}] = iCustom(Symbol(), (int)InpCustom${index}Timeframe, "${safeName}"${paramList}, InpCustom${index}Buffer, _i${index});`
        );

        code.maxIndicatorPeriod = Math.max(code.maxIndicatorPeriod, 50);
        break;
      }

      case "condition": {
        // Condition nodes don't create indicator calls themselves.
        // They reference a connected indicator's buffer value and compare against a threshold.
        // The entry logic generator handles the condition comparison.
        break;
      }
    }
  }
}
