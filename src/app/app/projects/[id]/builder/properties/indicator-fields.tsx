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
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as MovingAverageNodeData["signalMode"] })}
      />
      <p className="text-[10px] text-[#64748B] -mt-0.5">
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
        <p className="text-[10px] text-[#64748B] -mt-0.5">
          Shifts the MA line backwards on the chart by N bars
        </p>
        <OptimizableFieldCheckbox fieldName="shift" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS}
        onChange={(v) => onChange({ appliedPrice: v as MovingAverageNodeData["appliedPrice"] })}
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
