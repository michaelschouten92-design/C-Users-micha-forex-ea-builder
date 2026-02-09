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
  WilliamsRNodeData,
  ParabolicSARNodeData,
  MomentumNodeData,
  EnvelopesNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";
import { MA_METHOD_MAP, getTimeframe } from "../types";
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
        const price = "PRICE_CLOSE";
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
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMA(_Symbol, ${getTimeframe(ma.timeframe)}, InpMA${index}Period, InpMA${index}Shift, ${method}, ${price});`
        );
        addHandleValidation(varPrefix, `MA ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        break;
      }

      case "rsi": {
        const rsi = data as RSINodeData;
        const price = "PRICE_CLOSE";
        const copyBars = rsi.signalMode === "candle_close" ? 4 : 3;
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
          `${varPrefix}Handle = iRSI(_Symbol, ${getTimeframe(rsi.timeframe)}, InpRSI${index}Period, ${price});`
        );
        addHandleValidation(varPrefix, `RSI ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        break;
      }

      case "macd": {
        const macd = data as MACDNodeData;
        const price = "PRICE_CLOSE";
        const copyBars = macd.signalMode === "candle_close" ? 4 : 3;
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
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMACD(_Symbol, ${getTimeframe(macd.timeframe)}, InpMACD${index}Fast, InpMACD${index}Slow, InpMACD${index}Signal, ${price});`
        );
        addHandleValidation(varPrefix, `MACD ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SignalBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}MainBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}SignalBuffer`, code);
        break;
      }

      case "bollinger-bands": {
        const bb = data as BollingerBandsNodeData;
        const price = "PRICE_CLOSE";
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
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}UpperBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}MiddleBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}LowerBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iBands(_Symbol, ${getTimeframe(bb.timeframe)}, InpBB${index}Period, InpBB${index}Shift, InpBB${index}Deviation, ${price});`
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
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iATR(_Symbol, ${getTimeframe(atr.timeframe)}, InpATR${index}Period);`
        );
        addHandleValidation(varPrefix, `ATR ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
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
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`); // ADX main line
        code.globalVariables.push(`double ${varPrefix}PlusDIBuffer[];`); // +DI line
        code.globalVariables.push(`double ${varPrefix}MinusDIBuffer[];`); // -DI line
        code.onInit.push(
          `${varPrefix}Handle = iADX(_Symbol, ${getTimeframe(adx.timeframe)}, InpADX${index}Period);`
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
        break;
      }

      case "stochastic": {
        const stoch = data as StochasticNodeData;
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
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}MainBuffer[];`); // %K line
        code.globalVariables.push(`double ${varPrefix}SignalBuffer[];`); // %D line
        code.onInit.push(
          `${varPrefix}Handle = iStochastic(_Symbol, ${getTimeframe(stoch.timeframe)}, InpStoch${index}KPeriod, InpStoch${index}DPeriod, InpStoch${index}Slowing, MODE_SMA, STO_LOWHIGH);`
        );
        addHandleValidation(varPrefix, `Stochastic ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}MainBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}SignalBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}MainBuffer`, code); // %K
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}SignalBuffer`, code); // %D
        break;
      }

      case "cci": {
        const cci = data as CCINodeData;
        const price = "PRICE_CLOSE";
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
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iCCI(_Symbol, ${getTimeframe(cci.timeframe)}, InpCCI${index}Period, ${price});`
        );
        addHandleValidation(varPrefix, `CCI ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        break;
      }

      case "williams-r": {
        const wpr = data as WilliamsRNodeData;
        const copyBars = wpr.signalMode === "candle_close" ? 4 : 3;
        const group = `Williams %R ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpWPR${index}Period`,
            "int",
            wpr.period,
            `Williams %R ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "overboughtLevel",
            `InpWPR${index}Overbought`,
            "double",
            wpr.overboughtLevel,
            `Williams %R ${index + 1} Overbought`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "oversoldLevel",
            `InpWPR${index}Oversold`,
            "double",
            wpr.oversoldLevel,
            `Williams %R ${index + 1} Oversold`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iWPR(_Symbol, ${getTimeframe(wpr.timeframe)}, InpWPR${index}Period);`
        );
        addHandleValidation(varPrefix, `Williams %R ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        break;
      }

      case "parabolic-sar": {
        const sar = data as ParabolicSARNodeData;
        const copyBars = sar.signalMode === "candle_close" ? 4 : 3;
        const group = `Parabolic SAR ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "step",
            `InpSAR${index}Step`,
            "double",
            sar.step,
            `Parabolic SAR ${index + 1} Step`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "maximum",
            `InpSAR${index}Maximum`,
            "double",
            sar.maximum,
            `Parabolic SAR ${index + 1} Maximum`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iSAR(_Symbol, ${getTimeframe(sar.timeframe)}, InpSAR${index}Step, InpSAR${index}Maximum);`
        );
        addHandleValidation(varPrefix, `Parabolic SAR ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        break;
      }

      case "momentum": {
        const mom = data as MomentumNodeData;
        const price = "PRICE_CLOSE";
        const copyBars = mom.signalMode === "candle_close" ? 4 : 3;
        const group = `Momentum ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpMom${index}Period`,
            "int",
            mom.period,
            `Momentum ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "level",
            `InpMom${index}Level`,
            "double",
            mom.level,
            `Momentum ${index + 1} Level`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}Buffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iMomentum(_Symbol, ${getTimeframe(mom.timeframe)}, InpMom${index}Period, ${price});`
        );
        addHandleValidation(varPrefix, `Momentum ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}Buffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}Buffer`, code);
        break;
      }

      case "envelopes": {
        const env = data as EnvelopesNodeData;
        const method = MA_METHOD_MAP[env.method as keyof typeof MA_METHOD_MAP] ?? "MODE_SMA";
        const price = "PRICE_CLOSE";
        const copyBars = env.signalMode === "candle_close" ? 4 : 3;
        const group = `Envelopes ${index + 1}`;

        code.inputs.push(
          createInput(
            node,
            "period",
            `InpEnv${index}Period`,
            "int",
            env.period,
            `Envelopes ${index + 1} Period`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "deviation",
            `InpEnv${index}Deviation`,
            "double",
            env.deviation,
            `Envelopes ${index + 1} Deviation`,
            group
          )
        );
        code.inputs.push(
          createInput(
            node,
            "shift",
            `InpEnv${index}Shift`,
            "int",
            env.shift,
            `Envelopes ${index + 1} Shift`,
            group
          )
        );
        code.globalVariables.push(`int ${varPrefix}Handle = INVALID_HANDLE;`);
        code.globalVariables.push(`double ${varPrefix}UpperBuffer[];`);
        code.globalVariables.push(`double ${varPrefix}LowerBuffer[];`);
        code.onInit.push(
          `${varPrefix}Handle = iEnvelopes(_Symbol, ${getTimeframe(env.timeframe)}, InpEnv${index}Period, InpEnv${index}Shift, ${method}, ${price}, InpEnv${index}Deviation);`
        );
        addHandleValidation(varPrefix, `Envelopes ${index + 1}`, code);
        code.onDeinit.push(
          `if(${varPrefix}Handle != INVALID_HANDLE) IndicatorRelease(${varPrefix}Handle);`
        );
        code.onInit.push(`ArraySetAsSeries(${varPrefix}UpperBuffer, true);`);
        code.onInit.push(`ArraySetAsSeries(${varPrefix}LowerBuffer, true);`);
        addCopyBuffer(`${varPrefix}Handle`, 0, copyBars, `${varPrefix}UpperBuffer`, code);
        addCopyBuffer(`${varPrefix}Handle`, 1, copyBars, `${varPrefix}LowerBuffer`, code);
        break;
      }
    }
  }
}
