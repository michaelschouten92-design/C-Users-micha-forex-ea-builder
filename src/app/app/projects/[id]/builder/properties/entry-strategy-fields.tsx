"use client";

import { SelectField, NumberField, TimeField } from "../components/form-fields";
import type {
  EMACrossoverEntryData,
  RangeBreakoutEntryData,
  RSIReversalEntryData,
  TrendPullbackEntryData,
  MACDCrossoverEntryData,
} from "@/types/builder";
import {
  TIMEFRAME_OPTIONS,
  RANGE_SL_OPTIONS,
  RANGE_METHOD_OPTIONS,
  BREAKOUT_ENTRY_OPTIONS,
} from "./constants";
import {
  OptimizableFieldCheckbox,
  FieldWarning,
  ToggleField,
  DirectionSelector,
  AdvancedToggleSection,
  EntryStrategyRiskSection,
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

      {/* Basic fields */}
      <NumberField
        label="Fast EMA"
        value={data.fastEma}
        min={1}
        max={500}
        onChange={(v) => onChange({ fastEma: v })}
      />
      <OptimizableFieldCheckbox fieldName="fastEma" data={data} onChange={onChange} />
      <NumberField
        label="Slow EMA"
        value={data.slowEma}
        min={1}
        max={1000}
        onChange={(v) => onChange({ slowEma: v })}
      />
      <OptimizableFieldCheckbox fieldName="slowEma" data={data} onChange={onChange} />
      {data.fastEma >= data.slowEma && (
        <FieldWarning message="Fast EMA should be smaller than Slow EMA" />
      )}
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <ToggleField
          label="HTF trend filter"
          checked={data.htfTrendFilter}
          onChange={(v) => onChange({ htfTrendFilter: v })}
        >
          <SelectField
            label="HTF Timeframe"
            value={data.htfTimeframe}
            options={TIMEFRAME_OPTIONS}
            onChange={(v) => onChange({ htfTimeframe: v as EMACrossoverEntryData["htfTimeframe"] })}
          />
          <NumberField
            label="HTF EMA"
            value={data.htfEma}
            min={1}
            max={500}
            onChange={(v) => onChange({ htfEma: v })}
          />
          <OptimizableFieldCheckbox fieldName="htfEma" data={data} onChange={onChange} />
        </ToggleField>
        <ToggleField
          label="RSI confirmation"
          checked={data.rsiConfirmation}
          onChange={(v) => onChange({ rsiConfirmation: v })}
        >
          <NumberField
            label="RSI Period"
            value={data.rsiPeriod}
            min={1}
            max={500}
            onChange={(v) => onChange({ rsiPeriod: v })}
          />
          <OptimizableFieldCheckbox fieldName="rsiPeriod" data={data} onChange={onChange} />
          <NumberField
            label="Long max RSI"
            value={data.rsiLongMax}
            min={0}
            max={100}
            onChange={(v) => onChange({ rsiLongMax: v })}
          />
          <OptimizableFieldCheckbox fieldName="rsiLongMax" data={data} onChange={onChange} />
          <NumberField
            label="Short min RSI"
            value={data.rsiShortMin}
            min={0}
            max={100}
            onChange={(v) => onChange({ rsiShortMin: v })}
          />
          <OptimizableFieldCheckbox fieldName="rsiShortMin" data={data} onChange={onChange} />
        </ToggleField>
      </AdvancedToggleSection>
    </>
  );
}

export function RangeBreakoutEntryFields({
  data,
  onChange,
}: {
  data: RangeBreakoutEntryData;
  onChange: (updates: Partial<RangeBreakoutEntryData>) => void;
}) {
  const rangeMethod = data.rangeMethod ?? "CUSTOM_TIME";
  const breakoutEntry = data.breakoutEntry ?? "CANDLE_CLOSE";
  const useServerTime = data.useServerTime ?? true;
  const timeLabel = useServerTime ? "Server time" : "GMT";

  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />

      {/* Range calculation method */}
      <SelectField
        label="Calculating Range"
        value={rangeMethod}
        options={RANGE_METHOD_OPTIONS}
        onChange={(v) => onChange({ rangeMethod: v as "CANDLES" | "CUSTOM_TIME" })}
      />

      {rangeMethod === "CANDLES" ? (
        <>
          <NumberField
            label="Range period (candles)"
            value={data.rangePeriod}
            min={2}
            max={500}
            onChange={(v) => onChange({ rangePeriod: v })}
          />
          <OptimizableFieldCheckbox fieldName="rangePeriod" data={data} onChange={onChange} />
          <SelectField
            label="Timeframe"
            value={data.rangeTimeframe ?? "H1"}
            options={TIMEFRAME_OPTIONS}
            onChange={(v) =>
              onChange({ rangeTimeframe: v as RangeBreakoutEntryData["rangeTimeframe"] })
            }
          />
        </>
      ) : (
        <>
          <div className="text-xs text-[#94A3B8] mb-1">
            Range window ({timeLabel}) — the high/low of this period defines the range
          </div>
          <TimeField
            label="Range start"
            hour={data.customStartHour ?? 0}
            minute={data.customStartMinute ?? 0}
            onHourChange={(h) => onChange({ customStartHour: h })}
            onMinuteChange={(m) => onChange({ customStartMinute: m })}
          />
          <TimeField
            label="Range end"
            hour={data.customEndHour ?? 8}
            minute={data.customEndMinute ?? 0}
            onHourChange={(h) => onChange({ customEndHour: h })}
            onMinuteChange={(m) => onChange({ customEndMinute: m })}
          />
        </>
      )}

      {/* Time reference */}
      <div className="mt-1">
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={!useServerTime}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ useServerTime: !e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Use GMT instead of server time
        </label>
      </div>

      {/* Breakout entry mode */}
      <SelectField
        label="Breakout Entry"
        value={breakoutEntry}
        options={BREAKOUT_ENTRY_OPTIONS}
        onChange={(v) => onChange({ breakoutEntry: v as "CANDLE_CLOSE" | "CURRENT_PRICE" })}
      />
      {breakoutEntry === "CANDLE_CLOSE" && (
        <SelectField
          label="Entry Timeframe"
          value={data.breakoutTimeframe ?? "H1"}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) =>
            onChange({ breakoutTimeframe: v as RangeBreakoutEntryData["breakoutTimeframe"] })
          }
        />
      )}

      {/* Risk section (includes SL method selector with Range Opposite option) */}
      <EntryStrategyRiskSection data={data} onChange={onChange} slOptions={RANGE_SL_OPTIONS} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <ToggleField
          label="Cancel opposite pending after trigger"
          checked={data.cancelOpposite}
          onChange={(v) => onChange({ cancelOpposite: v })}
        />
        <ToggleField
          label="Close all positions at a specific time"
          checked={data.closeAtTime ?? false}
          onChange={(v) => onChange({ closeAtTime: v })}
        >
          <TimeField
            label={`Close time (${timeLabel})`}
            hour={data.closeAtHour ?? 17}
            minute={data.closeAtMinute ?? 0}
            onHourChange={(h) => onChange({ closeAtHour: h })}
            onMinuteChange={(m) => onChange({ closeAtMinute: m })}
          />
        </ToggleField>
        <ToggleField
          label="HTF trend filter"
          checked={data.htfTrendFilter}
          onChange={(v) => onChange({ htfTrendFilter: v })}
        >
          <SelectField
            label="HTF Timeframe"
            value={data.htfTimeframe}
            options={TIMEFRAME_OPTIONS}
            onChange={(v) =>
              onChange({ htfTimeframe: v as RangeBreakoutEntryData["htfTimeframe"] })
            }
          />
          <NumberField
            label="HTF EMA"
            value={data.htfEma}
            min={1}
            max={500}
            onChange={(v) => onChange({ htfEma: v })}
          />
          <OptimizableFieldCheckbox fieldName="htfEma" data={data} onChange={onChange} />
        </ToggleField>
      </AdvancedToggleSection>
    </>
  );
}

export function RSIReversalEntryFields({
  data,
  onChange,
}: {
  data: RSIReversalEntryData;
  onChange: (updates: Partial<RSIReversalEntryData>) => void;
}) {
  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />

      {/* Basic fields */}
      <NumberField
        label="RSI Period"
        value={data.rsiPeriod}
        min={1}
        max={500}
        onChange={(v) => onChange({ rsiPeriod: v })}
      />
      <OptimizableFieldCheckbox fieldName="rsiPeriod" data={data} onChange={onChange} />
      <NumberField
        label="Oversold Level"
        value={data.oversoldLevel}
        min={0}
        max={50}
        onChange={(v) => onChange({ oversoldLevel: v })}
      />
      <OptimizableFieldCheckbox fieldName="oversoldLevel" data={data} onChange={onChange} />
      <NumberField
        label="Overbought Level"
        value={data.overboughtLevel}
        min={50}
        max={100}
        onChange={(v) => onChange({ overboughtLevel: v })}
      />
      <OptimizableFieldCheckbox fieldName="overboughtLevel" data={data} onChange={onChange} />
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldWarning message="Overbought must be higher than oversold" />
      )}
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <ToggleField
          label="Trend filter (EMA)"
          checked={data.trendFilter}
          onChange={(v) => onChange({ trendFilter: v })}
        >
          <NumberField
            label="Trend EMA"
            value={data.trendEma}
            min={1}
            max={500}
            onChange={(v) => onChange({ trendEma: v })}
          />
          <OptimizableFieldCheckbox fieldName="trendEma" data={data} onChange={onChange} />
        </ToggleField>
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

      {/* Basic fields */}
      <NumberField
        label="Trend EMA"
        value={data.trendEma}
        min={1}
        max={1000}
        onChange={(v) => onChange({ trendEma: v })}
      />
      <OptimizableFieldCheckbox fieldName="trendEma" data={data} onChange={onChange} />
      <NumberField
        label="Pullback RSI Period"
        value={data.pullbackRsiPeriod}
        min={1}
        max={500}
        onChange={(v) => onChange({ pullbackRsiPeriod: v })}
      />
      <OptimizableFieldCheckbox fieldName="pullbackRsiPeriod" data={data} onChange={onChange} />
      <NumberField
        label="RSI Pullback Level"
        value={data.rsiPullbackLevel}
        min={10}
        max={50}
        onChange={(v) => onChange({ rsiPullbackLevel: v })}
      />
      <OptimizableFieldCheckbox fieldName="rsiPullbackLevel" data={data} onChange={onChange} />
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <ToggleField
          label="Require price buffer from EMA"
          checked={data.requireEmaBuffer}
          onChange={(v) => onChange({ requireEmaBuffer: v })}
        />
      </AdvancedToggleSection>
    </>
  );
}

export function MACDCrossoverEntryFields({
  data,
  onChange,
}: {
  data: MACDCrossoverEntryData;
  onChange: (updates: Partial<MACDCrossoverEntryData>) => void;
}) {
  return (
    <>
      <DirectionSelector
        direction={data.direction ?? "BOTH"}
        onChange={(v) => onChange({ direction: v })}
      />

      {/* Basic fields */}
      <NumberField
        label="MACD Fast"
        value={data.macdFast}
        min={1}
        max={500}
        onChange={(v) => onChange({ macdFast: v })}
      />
      <OptimizableFieldCheckbox fieldName="macdFast" data={data} onChange={onChange} />
      <NumberField
        label="MACD Slow"
        value={data.macdSlow}
        min={1}
        max={500}
        onChange={(v) => onChange({ macdSlow: v })}
      />
      <OptimizableFieldCheckbox fieldName="macdSlow" data={data} onChange={onChange} />
      <NumberField
        label="MACD Signal"
        value={data.macdSignal}
        min={1}
        max={500}
        onChange={(v) => onChange({ macdSignal: v })}
      />
      <OptimizableFieldCheckbox fieldName="macdSignal" data={data} onChange={onChange} />
      {data.macdFast >= data.macdSlow && (
        <FieldWarning message="MACD fast should be smaller than slow" />
      )}
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <ToggleField
          label="HTF trend filter"
          checked={data.htfTrendFilter}
          onChange={(v) => onChange({ htfTrendFilter: v })}
        >
          <SelectField
            label="HTF Timeframe"
            value={data.htfTimeframe}
            options={TIMEFRAME_OPTIONS}
            onChange={(v) =>
              onChange({ htfTimeframe: v as MACDCrossoverEntryData["htfTimeframe"] })
            }
          />
          <NumberField
            label="HTF EMA"
            value={data.htfEma}
            min={1}
            max={500}
            onChange={(v) => onChange({ htfEma: v })}
          />
          <OptimizableFieldCheckbox fieldName="htfEma" data={data} onChange={onChange} />
        </ToggleField>
      </AdvancedToggleSection>
    </>
  );
}
