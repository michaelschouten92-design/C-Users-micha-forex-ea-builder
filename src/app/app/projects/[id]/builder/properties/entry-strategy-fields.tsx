"use client";

import { SelectField, NumberField } from "../components/form-fields";
import type {
  Timeframe,
  EMACrossoverEntryData,
  TrendPullbackEntryData,
  DivergenceEntryData,
  FibonacciEntryData,
  PivotPointEntryData,
} from "@/types/builder";
import { TIMEFRAME_OPTIONS, APPLIED_PRICE_OPTIONS } from "./constants";
import {
  OptimizableFieldCheckbox,
  FieldError,
  ToggleField,
  DirectionSelector,
  AdvancedToggleSection,
  EntryStrategyRiskSection,
  MTFConfirmationSection,
} from "./shared";

export function EMACrossoverEntryFields({
  data,
  onChange,
}: {
  data: EMACrossoverEntryData;
  onChange: (updates: Partial<EMACrossoverEntryData>) => void;
}) {
  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />
      <SelectField
        label="Timeframe"
        value={data.timeframe ?? "H1"}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS.filter(
          (o) => !["MEDIAN", "TYPICAL", "WEIGHTED"].includes(o.value)
        )}
        onChange={(v) => onChange({ appliedPrice: v as EMACrossoverEntryData["appliedPrice"] })}
        tooltip="Which price to use for calculations. Close (default) is the most common."
      />

      {/* Basic fields */}
      <NumberField
        label="Fast EMA"
        value={data.fastEma}
        min={1}
        max={500}
        onChange={(v) => onChange({ fastEma: v })}
        tooltip="The shorter moving average that reacts quickly to price changes"
      />
      <OptimizableFieldCheckbox fieldName="fastEma" data={data} onChange={onChange} />
      <NumberField
        label="Slow EMA"
        value={data.slowEma}
        min={1}
        max={1000}
        onChange={(v) => onChange({ slowEma: v })}
        tooltip="The longer moving average that shows the overall trend direction"
      />
      <OptimizableFieldCheckbox fieldName="slowEma" data={data} onChange={onChange} />
      {data.fastEma >= data.slowEma && (
        <FieldError message="Fast EMA must be smaller than Slow EMA" />
      )}
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <MTFConfirmationSection data={data} onChange={onChange} />
        <ToggleField
          label="RSI confirmation"
          hint="Only take trades when RSI confirms the direction (filters out weak signals)"
          checked={data.rsiConfirmation}
          onChange={(v) => onChange({ rsiConfirmation: v })}
        >
          <NumberField
            label="RSI Period"
            value={data.rsiPeriod}
            min={1}
            max={500}
            onChange={(v) => onChange({ rsiPeriod: v })}
            tooltip="Number of candles used to calculate RSI. 14 is standard."
          />
          <OptimizableFieldCheckbox fieldName="rsiPeriod" data={data} onChange={onChange} />
          <NumberField
            label="Long max RSI"
            value={data.rsiLongMax}
            min={0}
            max={100}
            onChange={(v) => onChange({ rsiLongMax: v })}
            tooltip="Only buy when RSI is below this level (avoids buying when already overbought)"
          />
          <OptimizableFieldCheckbox fieldName="rsiLongMax" data={data} onChange={onChange} />
          <NumberField
            label="Short min RSI"
            value={data.rsiShortMin}
            min={0}
            max={100}
            onChange={(v) => onChange({ rsiShortMin: v })}
            tooltip="Only sell when RSI is above this level (avoids selling when already oversold)"
          />
          <OptimizableFieldCheckbox fieldName="rsiShortMin" data={data} onChange={onChange} />
        </ToggleField>
        <div>
          <NumberField
            label="Min EMA separation (pips, 0=off)"
            value={data.minEmaSeparation ?? 0}
            min={0}
            max={500}
            onChange={(v) => onChange({ minEmaSeparation: v })}
            tooltip="Requires the fast and slow EMA to be at least this far apart before trading (filters choppy markets)"
          />
          <OptimizableFieldCheckbox fieldName="minEmaSeparation" data={data} onChange={onChange} />
        </div>
      </AdvancedToggleSection>
    </>
  );
}

export function TrendPullbackEntryFields({
  data,
  onChange,
}: {
  data: TrendPullbackEntryData;
  onChange: (updates: Partial<TrendPullbackEntryData>) => void;
}) {
  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />
      <SelectField
        label="Timeframe"
        value={data.timeframe ?? "H1"}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      <SelectField
        label="Applied Price"
        value={data.appliedPrice ?? "CLOSE"}
        options={APPLIED_PRICE_OPTIONS}
        onChange={(v) => onChange({ appliedPrice: v as TrendPullbackEntryData["appliedPrice"] })}
        tooltip="Which price to use for calculations. Close (default) is the most common."
      />

      {/* Basic fields */}
      <NumberField
        label="Trend EMA"
        value={data.trendEma}
        min={1}
        max={1000}
        onChange={(v) => onChange({ trendEma: v })}
        tooltip="EMA period that defines the trend direction. 200 is the most common."
      />
      <OptimizableFieldCheckbox fieldName="trendEma" data={data} onChange={onChange} />
      <NumberField
        label="Pullback RSI Period"
        value={data.pullbackRsiPeriod}
        min={1}
        max={500}
        onChange={(v) => onChange({ pullbackRsiPeriod: v })}
        tooltip="RSI period used to detect when a pullback is deep enough to enter"
      />
      <OptimizableFieldCheckbox fieldName="pullbackRsiPeriod" data={data} onChange={onChange} />
      <NumberField
        label="RSI Pullback Level"
        value={data.rsiPullbackLevel}
        min={10}
        max={50}
        onChange={(v) => onChange({ rsiPullbackLevel: v })}
        tooltip="RSI must drop below this level to confirm a pullback. Lower = deeper pullback required."
      />
      <OptimizableFieldCheckbox fieldName="rsiPullbackLevel" data={data} onChange={onChange} />
      <NumberField
        label="Pullback Max Distance (%)"
        value={data.pullbackMaxDistance ?? 2.0}
        min={0.1}
        max={20}
        onChange={(v) => onChange({ pullbackMaxDistance: v })}
        tooltip="Maximum distance from the trend EMA (as % of price) to still count as a pullback"
      />
      <OptimizableFieldCheckbox fieldName="pullbackMaxDistance" data={data} onChange={onChange} />
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <ToggleField
          label="Require price buffer from EMA"
          hint="Only enter when price has pulled back far enough from the EMA"
          checked={data.requireEmaBuffer}
          onChange={(v) => onChange({ requireEmaBuffer: v })}
        />
        <MTFConfirmationSection data={data} onChange={onChange} />
      </AdvancedToggleSection>
    </>
  );
}

export function DivergenceEntryFields({
  data,
  onChange,
}: {
  data: DivergenceEntryData;
  onChange: (updates: Partial<DivergenceEntryData>) => void;
}) {
  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />
      <SelectField
        label="Timeframe"
        value={data.timeframe ?? "H1"}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />

      {/* Indicator selection */}
      <SelectField
        label="Divergence Indicator"
        value={data.indicator ?? "RSI"}
        options={[
          { value: "RSI", label: "RSI" },
          { value: "MACD", label: "MACD" },
        ]}
        onChange={(v) => onChange({ indicator: v as "RSI" | "MACD" })}
        tooltip="Which indicator to compare with price for divergence detection"
      />

      {/* RSI settings */}
      {(data.indicator ?? "RSI") === "RSI" && (
        <>
          <NumberField
            label="RSI Period"
            value={data.rsiPeriod}
            min={1}
            max={500}
            onChange={(v) => onChange({ rsiPeriod: v })}
            tooltip="Number of candles for RSI calculation. 14 is standard."
          />
          <OptimizableFieldCheckbox fieldName="rsiPeriod" data={data} onChange={onChange} />
          <SelectField
            label="Applied Price"
            value={data.appliedPrice ?? "CLOSE"}
            options={APPLIED_PRICE_OPTIONS}
            onChange={(v) => onChange({ appliedPrice: v as DivergenceEntryData["appliedPrice"] })}
          />
        </>
      )}

      {/* MACD settings */}
      {(data.indicator ?? "RSI") === "MACD" && (
        <>
          <NumberField
            label="MACD Fast"
            value={data.macdFast}
            min={1}
            max={500}
            onChange={(v) => onChange({ macdFast: v })}
            tooltip="Short-term EMA period. 12 is standard."
          />
          <OptimizableFieldCheckbox fieldName="macdFast" data={data} onChange={onChange} />
          <NumberField
            label="MACD Slow"
            value={data.macdSlow}
            min={1}
            max={500}
            onChange={(v) => onChange({ macdSlow: v })}
            tooltip="Long-term EMA period. 26 is standard."
          />
          <OptimizableFieldCheckbox fieldName="macdSlow" data={data} onChange={onChange} />
          <NumberField
            label="MACD Signal"
            value={data.macdSignal}
            min={1}
            max={500}
            onChange={(v) => onChange({ macdSignal: v })}
            tooltip="Signal smoothing period. 9 is standard."
          />
          <OptimizableFieldCheckbox fieldName="macdSignal" data={data} onChange={onChange} />
          {data.macdFast >= data.macdSlow && (
            <FieldError message="MACD fast must be smaller than slow" />
          )}
        </>
      )}

      {/* Divergence detection settings */}
      <NumberField
        label="Lookback Bars"
        value={data.lookbackBars}
        min={5}
        max={200}
        onChange={(v) => onChange({ lookbackBars: v })}
        tooltip="How many bars to scan back for swing highs/lows. 20 is a good starting point."
      />
      <OptimizableFieldCheckbox fieldName="lookbackBars" data={data} onChange={onChange} />
      <NumberField
        label="Min Swing Distance"
        value={data.minSwingBars}
        min={2}
        max={50}
        onChange={(v) => onChange({ minSwingBars: v })}
        tooltip="Minimum bars between two swing points. Filters out noise from tiny swings."
      />
      <OptimizableFieldCheckbox fieldName="minSwingBars" data={data} onChange={onChange} />

      <EntryStrategyRiskSection data={data} onChange={onChange} />

      <AdvancedToggleSection>
        <MTFConfirmationSection data={data} onChange={onChange} />
      </AdvancedToggleSection>
    </>
  );
}

const FIB_LEVEL_OPTIONS = [
  { value: "0.236", label: "23.6%" },
  { value: "0.382", label: "38.2%" },
  { value: "0.5", label: "50.0%" },
  { value: "0.618", label: "61.8%" },
  { value: "0.786", label: "78.6%" },
] as const;

const FIB_ENTRY_MODE_OPTIONS = [
  { value: "BOUNCE", label: "Bounce off level" },
  { value: "BREAK", label: "Break through level" },
] as const;

export function FibonacciEntryFields({
  data,
  onChange,
}: {
  data: FibonacciEntryData;
  onChange: (updates: Partial<FibonacciEntryData>) => void;
}) {
  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />
      <SelectField
        label="Timeframe"
        value={data.timeframe ?? "H1"}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />

      <NumberField
        label="Lookback Period (bars)"
        value={data.lookbackPeriod ?? 100}
        min={10}
        max={500}
        onChange={(v) => onChange({ lookbackPeriod: v })}
        tooltip="Number of bars to find swing high and swing low for Fibonacci levels."
      />
      <OptimizableFieldCheckbox fieldName="lookbackPeriod" data={data} onChange={onChange} />

      <SelectField
        label="Fibonacci Level"
        value={String(data.fibLevel ?? 0.618)}
        options={FIB_LEVEL_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ fibLevel: parseFloat(v) })}
        tooltip="The Fibonacci retracement level to trade at. 61.8% is the golden ratio."
      />
      <OptimizableFieldCheckbox fieldName="fibLevel" data={data} onChange={onChange} />

      <SelectField
        label="Entry Mode"
        value={data.entryMode ?? "BOUNCE"}
        options={FIB_ENTRY_MODE_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ entryMode: v as FibonacciEntryData["entryMode"] })}
        tooltip="Bounce: enter when price bounces off the fib level. Break: enter when price breaks through."
      />

      <EntryStrategyRiskSection data={data} onChange={onChange} />

      <AdvancedToggleSection>
        <ToggleField
          label="Trend EMA confirmation"
          hint="Use an EMA to confirm the trend direction before entering"
          checked={data.trendConfirmation ?? true}
          onChange={(v) => onChange({ trendConfirmation: v })}
        >
          <NumberField
            label="Trend EMA Period"
            value={data.trendEMAPeriod ?? 200}
            min={1}
            max={1000}
            onChange={(v) => onChange({ trendEMAPeriod: v })}
            tooltip="EMA period for trend direction confirmation. 200 is the most common."
          />
          <OptimizableFieldCheckbox fieldName="trendEMAPeriod" data={data} onChange={onChange} />
        </ToggleField>
        <MTFConfirmationSection data={data} onChange={onChange} />
      </AdvancedToggleSection>
    </>
  );
}

const PIVOT_TYPE_OPTIONS = [
  { value: "CLASSIC", label: "Classic" },
  { value: "FIBONACCI", label: "Fibonacci" },
  { value: "CAMARILLA", label: "Camarilla" },
  { value: "WOODIE", label: "Woodie" },
] as const;

const PIVOT_TF_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

const PIVOT_ENTRY_MODE_OPTIONS = [
  { value: "BOUNCE", label: "Bounce off level" },
  { value: "BREAKOUT", label: "Breakout through level" },
] as const;

const PIVOT_LEVEL_OPTIONS = [
  { value: "PIVOT", label: "Pivot (PP)" },
  { value: "S1", label: "Support 1 (S1)" },
  { value: "S2", label: "Support 2 (S2)" },
  { value: "S3", label: "Support 3 (S3)" },
  { value: "R1", label: "Resistance 1 (R1)" },
  { value: "R2", label: "Resistance 2 (R2)" },
  { value: "R3", label: "Resistance 3 (R3)" },
] as const;

export function PivotPointEntryFields({
  data,
  onChange,
}: {
  data: PivotPointEntryData;
  onChange: (updates: Partial<PivotPointEntryData>) => void;
}) {
  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />
      <SelectField
        label="Timeframe"
        value={data.timeframe ?? "H1"}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />

      <SelectField
        label="Pivot Type"
        value={data.pivotType ?? "CLASSIC"}
        options={PIVOT_TYPE_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ pivotType: v as PivotPointEntryData["pivotType"] })}
        tooltip="Classic is the most common. Fibonacci and Camarilla use different S/R calculations."
      />

      <SelectField
        label="Pivot Timeframe"
        value={data.pivotTimeframe ?? "DAILY"}
        options={PIVOT_TF_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ pivotTimeframe: v as PivotPointEntryData["pivotTimeframe"] })}
        tooltip="The timeframe used to calculate the pivot point (previous day/week/month OHLC)."
      />

      <SelectField
        label="Entry Mode"
        value={data.entryMode ?? "BOUNCE"}
        options={PIVOT_ENTRY_MODE_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ entryMode: v as PivotPointEntryData["entryMode"] })}
        tooltip="Bounce: trade reversals at the level. Breakout: trade continuation through the level."
      />

      <SelectField
        label="Target Level"
        value={data.targetLevel ?? "PIVOT"}
        options={PIVOT_LEVEL_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ targetLevel: v as PivotPointEntryData["targetLevel"] })}
        tooltip="Which pivot level to use for entry signals."
      />

      <EntryStrategyRiskSection data={data} onChange={onChange} />

      <AdvancedToggleSection>
        <MTFConfirmationSection data={data} onChange={onChange} />
      </AdvancedToggleSection>
    </>
  );
}
