"use client";

import { SelectField, NumberField } from "../components/form-fields";
import type {
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ATRNodeData,
  ADXNodeData,
  StochasticNodeData,
  CCINodeData,
  IchimokuNodeData,
  IchimokuMode,
  CustomIndicatorNodeData,
  CustomIndicatorParam,
  CustomIndicatorParamType,
  OBVNodeData,
  VWAPNodeData,
  BBSqueezeNodeData,
  ConditionNodeData,
  ConditionOperator,
  Timeframe,
} from "@/types/builder";
import {
  SIGNAL_MODE_OPTIONS,
  TIMEFRAME_OPTIONS,
  APPLIED_PRICE_OPTIONS,
  MA_METHOD_OPTIONS,
  STO_PRICE_FIELD_OPTIONS,
} from "./constants";
import { OptimizableFieldCheckbox, FieldError } from "./shared";

export function MovingAverageFields({
  data,
  onChange,
}: {
  data: MovingAverageNodeData;
  onChange: (updates: Partial<MovingAverageNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <SelectField
        label="Method"
        value={data.method}
        options={[
          { value: "SMA", label: "Simple (SMA)" },
          { value: "EMA", label: "Exponential (EMA)" },
          { value: "SMMA", label: "Smoothed (SMMA)" },
          { value: "LWMA", label: "Linear Weighted (LWMA)" },
        ]}
        onChange={(v) => onChange({ method: v as MovingAverageNodeData["method"] })}
      />
      <div>
        <NumberField
          label="Period"
          value={data.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v })}
          tooltip="Number of candles used for the calculation. Common values: 20, 50, 100, 200."
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as MovingAverageNodeData["signalMode"] })}
      />
      <p className="text-[10px] text-[#7C8DB0] -mt-0.5">
        Candle close waits for bar confirmation — more reliable but slower
      </p>
      <div>
        <NumberField
          label="Shift"
          value={data.shift}
          min={0}
          max={100}
          onChange={(v) => onChange({ shift: v })}
        />
        <p className="text-[10px] text-[#7C8DB0] -mt-0.5">
          Shifts the MA line backwards on the chart by N bars
        </p>
        <OptimizableFieldCheckbox fieldName="shift" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS}
        onChange={(v) => onChange({ appliedPrice: v as MovingAverageNodeData["appliedPrice"] })}
        tooltip="Which price to use for calculations. Close (default) is the most common."
      />
    </>
  );
}

export function RSIFields({
  data,
  onChange,
}: {
  data: RSINodeData;
  onChange: (updates: Partial<RSINodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Period"
          value={data.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v })}
          tooltip="Number of candles for RSI calculation. 14 is the standard setting."
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as RSINodeData["signalMode"] })}
      />
      <div>
        <NumberField
          label="Overbought Level"
          value={data.overboughtLevel}
          min={50}
          max={100}
          onChange={(v) => onChange({ overboughtLevel: v })}
        />
        <OptimizableFieldCheckbox fieldName="overboughtLevel" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Oversold Level"
          value={data.oversoldLevel}
          min={0}
          max={50}
          onChange={(v) => onChange({ oversoldLevel: v })}
        />
        <OptimizableFieldCheckbox fieldName="oversoldLevel" data={data} onChange={onChange} />
      </div>
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldError message="Overbought level must be higher than oversold level" />
      )}
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS}
        onChange={(v) => onChange({ appliedPrice: v as RSINodeData["appliedPrice"] })}
      />
    </>
  );
}

export function MACDFields({
  data,
  onChange,
}: {
  data: MACDNodeData;
  onChange: (updates: Partial<MACDNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Fast Period"
          value={data.fastPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ fastPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="fastPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Slow Period"
          value={data.slowPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ slowPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="slowPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Signal Period"
          value={data.signalPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ signalPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="signalPeriod" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as MACDNodeData["signalMode"] })}
      />
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS}
        onChange={(v) => onChange({ appliedPrice: v as MACDNodeData["appliedPrice"] })}
      />
      {data.fastPeriod >= data.slowPeriod && (
        <FieldError message="Fast period must be smaller than slow period" />
      )}
    </>
  );
}

export function BollingerBandsFields({
  data,
  onChange,
}: {
  data: BollingerBandsNodeData;
  onChange: (updates: Partial<BollingerBandsNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Period"
          value={data.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v })}
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Deviation"
          value={data.deviation}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ deviation: v })}
        />
        <OptimizableFieldCheckbox fieldName="deviation" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as BollingerBandsNodeData["signalMode"] })}
      />
      <div>
        <NumberField
          label="Shift"
          value={data.shift}
          min={0}
          max={100}
          onChange={(v) => onChange({ shift: v })}
        />
        <OptimizableFieldCheckbox fieldName="shift" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS}
        onChange={(v) => onChange({ appliedPrice: v as BollingerBandsNodeData["appliedPrice"] })}
      />
    </>
  );
}

export function ATRFields({
  data,
  onChange,
}: {
  data: ATRNodeData;
  onChange: (updates: Partial<ATRNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Period"
          value={data.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v })}
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as ATRNodeData["signalMode"] })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        ATR measures market volatility. Commonly used for dynamic SL/TP levels.
      </div>
    </>
  );
}

export function ADXFields({
  data,
  onChange,
}: {
  data: ADXNodeData;
  onChange: (updates: Partial<ADXNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Period"
          value={data.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v })}
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Trend Level"
          value={data.trendLevel}
          min={10}
          max={50}
          onChange={(v) => onChange({ trendLevel: v })}
        />
        <OptimizableFieldCheckbox fieldName="trendLevel" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as ADXNodeData["signalMode"] })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        ADX &gt; {data.trendLevel} indicates a trending market. +DI &gt; -DI suggests uptrend, -DI
        &gt; +DI suggests downtrend.
      </div>
    </>
  );
}

export function StochasticFields({
  data,
  onChange,
}: {
  data: StochasticNodeData;
  onChange: (updates: Partial<StochasticNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="K Period"
          value={data.kPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ kPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="kPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="D Period"
          value={data.dPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ dPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="dPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Slowing"
          value={data.slowing}
          min={1}
          max={500}
          onChange={(v) => onChange({ slowing: v })}
        />
        <OptimizableFieldCheckbox fieldName="slowing" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Overbought Level"
          value={data.overboughtLevel}
          min={50}
          max={100}
          onChange={(v) => onChange({ overboughtLevel: v })}
        />
        <OptimizableFieldCheckbox fieldName="overboughtLevel" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Oversold Level"
          value={data.oversoldLevel}
          min={0}
          max={50}
          onChange={(v) => onChange({ oversoldLevel: v })}
        />
        <OptimizableFieldCheckbox fieldName="oversoldLevel" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="MA Method"
        value={data.maMethod ?? "SMA"}
        options={MA_METHOD_OPTIONS}
        onChange={(v) => onChange({ maMethod: v as StochasticNodeData["maMethod"] })}
      />
      <SelectField
        label="Price Field"
        value={data.priceField ?? "LOWHIGH"}
        options={STO_PRICE_FIELD_OPTIONS}
        onChange={(v) => onChange({ priceField: v as StochasticNodeData["priceField"] })}
      />
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as StochasticNodeData["signalMode"] })}
      />
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldError message="Overbought level must be higher than oversold level" />
      )}
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Stochastic measures momentum. %K crossing above %D in oversold suggests buy, crossing below
        %D in overbought suggests sell.
      </div>
    </>
  );
}

export function CCIFields({
  data,
  onChange,
}: {
  data: CCINodeData;
  onChange: (updates: Partial<CCINodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Period"
          value={data.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v })}
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as CCINodeData["signalMode"] })}
      />
      <div>
        <NumberField
          label="Overbought Level"
          value={data.overboughtLevel}
          min={-500}
          max={500}
          onChange={(v) => onChange({ overboughtLevel: v })}
        />
        <OptimizableFieldCheckbox fieldName="overboughtLevel" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Oversold Level"
          value={data.oversoldLevel}
          min={-500}
          max={500}
          onChange={(v) => onChange({ oversoldLevel: v })}
        />
        <OptimizableFieldCheckbox fieldName="oversoldLevel" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS}
        onChange={(v) => onChange({ appliedPrice: v as CCINodeData["appliedPrice"] })}
      />
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldError message="Overbought level must be higher than oversold level" />
      )}
    </>
  );
}

const ICHIMOKU_MODE_OPTIONS: { value: IchimokuMode; label: string }[] = [
  { value: "TENKAN_KIJUN_CROSS", label: "Tenkan/Kijun Cross" },
  { value: "PRICE_CLOUD", label: "Price vs Cloud" },
  { value: "FULL", label: "Full (TK + Cloud + Chikou)" },
];

export function IchimokuFields({
  data,
  onChange,
}: {
  data: IchimokuNodeData;
  onChange: (updates: Partial<IchimokuNodeData>) => void;
}) {
  const mode = data.ichimokuMode ?? "TENKAN_KIJUN_CROSS";
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <SelectField
        label="Signal Mode"
        value={mode}
        options={ICHIMOKU_MODE_OPTIONS}
        onChange={(v) => onChange({ ichimokuMode: v as IchimokuMode })}
        tooltip="TK Cross: Tenkan/Kijun crossover with cloud direction. Price/Cloud: Close above/below the cloud. Full: All three plus Chikou Span confirmation."
      />
      <div>
        <NumberField
          label="Tenkan Period"
          value={data.tenkanPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ tenkanPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="tenkanPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Kijun Period"
          value={data.kijunPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ kijunPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="kijunPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Senkou Span B Period"
          value={data.senkouBPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ senkouBPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="senkouBPeriod" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Bar Confirmation"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as IchimokuNodeData["signalMode"] })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        {mode === "TENKAN_KIJUN_CROSS" &&
          "Buy when Tenkan crosses above Kijun and cloud is bullish (SpanA > SpanB). Sell on the opposite."}
        {mode === "PRICE_CLOUD" &&
          "Buy when price closes above both Span A and Span B. Sell when price closes below both."}
        {mode === "FULL" &&
          "Combines TK cross + Price/Cloud + Chikou Span confirmation (close > close[26]). Strongest signal but fewest entries."}
      </div>
    </>
  );
}

const CONDITION_OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "GREATER_THAN", label: "Greater than (>)" },
  { value: "LESS_THAN", label: "Less than (<)" },
  { value: "GREATER_EQUAL", label: "Greater or equal (>=)" },
  { value: "LESS_EQUAL", label: "Less or equal (<=)" },
  { value: "EQUAL", label: "Equal (==)" },
  { value: "CROSSES_ABOVE", label: "Crosses above" },
  { value: "CROSSES_BELOW", label: "Crosses below" },
];

export function ConditionFields({
  data,
  onChange,
}: {
  data: ConditionNodeData;
  onChange: (updates: Partial<ConditionNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Condition"
        value={data.conditionType}
        options={CONDITION_OPERATOR_OPTIONS}
        onChange={(v) => onChange({ conditionType: v as ConditionOperator })}
        tooltip="How to compare the connected indicator value against your threshold"
      />
      <NumberField
        label="Threshold"
        value={data.threshold}
        min={-999999}
        max={999999}
        step={0.1}
        onChange={(v) => onChange({ threshold: v })}
        tooltip="The value to compare against (e.g. RSI > 70, price > 1.2000)"
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Connect an indicator block above. The condition compares the indicator value against your
        threshold and routes to the True or False output.
      </div>
    </>
  );
}

export function CustomIndicatorFields({
  data,
  onChange,
}: {
  data: CustomIndicatorNodeData;
  onChange: (updates: Partial<CustomIndicatorNodeData>) => void;
}) {
  const params = data.params ?? [];

  function updateParam(index: number, field: keyof CustomIndicatorParam, value: string): void {
    const updated = [...params];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ params: updated });
  }

  function updateParamType(index: number, type: CustomIndicatorParamType | ""): void {
    const updated = [...params];
    if (type === "") {
      const { type: _removed, ...rest } = updated[index];
      updated[index] = rest as CustomIndicatorParam;
    } else {
      updated[index] = { ...updated[index], type };
    }
    onChange({ params: updated });
  }

  function addParam(): void {
    if (params.length >= 8) return;
    onChange({ params: [...params, { name: `param${params.length + 1}`, value: "0" }] });
  }

  function removeParam(index: number): void {
    onChange({ params: params.filter((_, i) => i !== index) });
  }

  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Indicator Name</label>
        <input
          type="text"
          value={data.indicatorName}
          maxLength={100}
          onChange={(e) => {
            e.stopPropagation();
            onChange({ indicatorName: e.target.value });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="e.g. MyCustomIndicator"
          className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
        />
        <p className="text-[10px] text-[#7C8DB0] mt-1">
          File name without extension. Must be in MQL5/Indicators/ folder.
        </p>
      </div>
      <NumberField
        label="Buffer Index"
        value={data.bufferIndex}
        min={0}
        max={31}
        step={1}
        onChange={(v) => onChange({ bufferIndex: v })}
        tooltip="Which indicator buffer to read (0 = first buffer)"
      />
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as CustomIndicatorNodeData["signalMode"] })}
      />

      {/* Parameters */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#CBD5E1]">Parameters ({params.length}/8)</span>
          {params.length < 8 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addParam();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[rgba(79,70,229,0.2)] text-[#A78BFA] hover:bg-[rgba(79,70,229,0.3)] transition-colors"
            >
              + Add Param
            </button>
          )}
        </div>
        {params.map((param, i) => (
          <div key={i} className="mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <input
                type="text"
                value={param.name}
                maxLength={30}
                onChange={(e) => {
                  e.stopPropagation();
                  updateParam(i, "name", e.target.value);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Name"
                className="flex-1 px-2 py-1 text-xs bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded text-white focus:ring-1 focus:ring-[#22D3EE] focus:outline-none"
              />
              <input
                type="text"
                value={param.value}
                maxLength={30}
                onChange={(e) => {
                  e.stopPropagation();
                  updateParam(i, "value", e.target.value);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Value"
                className="w-20 px-2 py-1 text-xs bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded text-white focus:ring-1 focus:ring-[#22D3EE] focus:outline-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeParam(i);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-[#EF4444] hover:text-[#F87171] p-0.5"
                aria-label={`Remove parameter ${param.name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <select
              value={param.type ?? ""}
              onChange={(e) => {
                e.stopPropagation();
                updateParamType(i, e.target.value as CustomIndicatorParamType | "");
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-[10px] bg-[#1E293B] border border-[rgba(79,70,229,0.2)] rounded text-[#94A3B8] focus:ring-1 focus:ring-[#22D3EE] focus:outline-none"
            >
              <option value="">Auto-detect type</option>
              <option value="int">int</option>
              <option value="double">double</option>
              <option value="string">string</option>
              <option value="bool">bool</option>
              <option value="color">color</option>
            </select>
          </div>
        ))}
      </div>

      {!data.indicatorName && (
        <FieldError message="Indicator name is required for code generation" />
      )}

      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Generates an iCustom() call in MQL5. Parameters are passed in order to the indicator. Values
        are parsed as numbers when possible, otherwise passed as strings.
      </div>
    </>
  );
}

export function OBVFields({
  data,
  onChange,
}: {
  data: OBVNodeData;
  onChange: (updates: Partial<OBVNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Signal SMA Period"
          value={data.signalPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ signalPeriod: v })}
          tooltip="SMA period applied to OBV for signal line. Buy when OBV > SMA(OBV), sell when OBV < SMA(OBV)."
        />
        <OptimizableFieldCheckbox fieldName="signalPeriod" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as OBVNodeData["signalMode"] })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        On-Balance Volume measures buying/selling pressure. Buy when OBV crosses above its SMA
        signal line, sell when it crosses below.
      </div>
    </>
  );
}

export function VWAPFields({
  data,
  onChange,
}: {
  data: VWAPNodeData;
  onChange: (updates: Partial<VWAPNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <SelectField
        label="Reset Period"
        value={data.resetPeriod}
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ]}
        onChange={(v) => onChange({ resetPeriod: v as VWAPNodeData["resetPeriod"] })}
        tooltip="When to reset the VWAP calculation. Daily is the most common for intraday trading."
      />
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as VWAPNodeData["signalMode"] })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Volume Weighted Average Price shows institutional fair value. Buy when price is above VWAP,
        sell when below. Resets at the start of each period.
      </div>
    </>
  );
}

export function BBSqueezeFields({
  data,
  onChange,
}: {
  data: BBSqueezeNodeData;
  onChange: (updates: Partial<BBSqueezeNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="BB Period"
          value={data.bbPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ bbPeriod: v })}
          tooltip="Period for Bollinger Bands. Default 20."
        />
        <OptimizableFieldCheckbox fieldName="bbPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="BB Deviation"
          value={data.bbDeviation}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ bbDeviation: v })}
          tooltip="Standard deviation multiplier for Bollinger Bands. Default 2.0."
        />
        <OptimizableFieldCheckbox fieldName="bbDeviation" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="KC Period"
          value={data.kcPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ kcPeriod: v })}
          tooltip="Period for Keltner Channel (EMA + ATR). Default 20."
        />
        <OptimizableFieldCheckbox fieldName="kcPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="KC Multiplier"
          value={data.kcMultiplier}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ kcMultiplier: v })}
          tooltip="ATR multiplier for Keltner Channel width. Default 1.5."
        />
        <OptimizableFieldCheckbox fieldName="kcMultiplier" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as BBSqueezeNodeData["signalMode"] })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Detects when Bollinger Bands contract inside Keltner Channels (squeeze). Buy when the
        squeeze releases and price is above the BB middle line. Sell on release below the middle
        line.
      </div>
    </>
  );
}
