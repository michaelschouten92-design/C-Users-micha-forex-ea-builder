"use client";

import { SelectField, NumberField, TimeField } from "../components/form-fields";
import type {
  Timeframe,
  EMACrossoverEntryData,
  RangeBreakoutEntryData,
  RSIReversalEntryData,
  TrendPullbackEntryData,
  MACDCrossoverEntryData,
  DivergenceEntryData,
} from "@/types/builder";
import {
  TIMEFRAME_OPTIONS,
  RANGE_SL_OPTIONS,
  RANGE_METHOD_OPTIONS,
  BREAKOUT_ENTRY_OPTIONS,
  APPLIED_PRICE_OPTIONS,
} from "./constants";
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
          <OptimizableFieldCheckbox fieldName="rangeTimeframe" data={data} onChange={onChange} />
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
          <OptimizableFieldCheckbox fieldName="customStartHour" data={data} onChange={onChange} />
          <TimeField
            label="Range end"
            hour={data.customEndHour ?? 8}
            minute={data.customEndMinute ?? 0}
            onHourChange={(h) => onChange({ customEndHour: h })}
            onMinuteChange={(m) => onChange({ customEndMinute: m })}
          />
          <OptimizableFieldCheckbox fieldName="customEndHour" data={data} onChange={onChange} />
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
        <>
          <SelectField
            label="Entry Timeframe"
            value={data.breakoutTimeframe ?? "H1"}
            options={TIMEFRAME_OPTIONS}
            onChange={(v) =>
              onChange({ breakoutTimeframe: v as RangeBreakoutEntryData["breakoutTimeframe"] })
            }
          />
          <OptimizableFieldCheckbox fieldName="breakoutTimeframe" data={data} onChange={onChange} />
        </>
      )}

      <div>
        <NumberField
          label="Buffer (pips)"
          value={data.bufferPips ?? 2}
          min={0}
          max={50}
          onChange={(v) => onChange({ bufferPips: v })}
          tooltip="Extra pips above/below the range to avoid false breakouts"
        />
        <OptimizableFieldCheckbox fieldName="bufferPips" data={data} onChange={onChange} />
      </div>

      {/* Risk section (includes SL method selector with Range Opposite option) */}
      <EntryStrategyRiskSection data={data} onChange={onChange} slOptions={RANGE_SL_OPTIONS} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <div>
          <NumberField
            label="Min Range (pips)"
            value={data.minRangePips ?? 0}
            min={0}
            max={500}
            onChange={(v) => onChange({ minRangePips: v })}
            tooltip="Skip breakouts from ranges smaller than this (too narrow = unreliable)"
          />
          <OptimizableFieldCheckbox fieldName="minRangePips" data={data} onChange={onChange} />
        </div>
        <div>
          <NumberField
            label="Max Range (pips, 0=no limit)"
            value={data.maxRangePips ?? 0}
            min={0}
            max={1000}
            onChange={(v) => onChange({ maxRangePips: v })}
            tooltip="Skip breakouts from ranges wider than this (too wide = too much risk)"
          />
          <OptimizableFieldCheckbox fieldName="maxRangePips" data={data} onChange={onChange} />
        </div>
        {(data.maxRangePips ?? 0) > 0 && (data.minRangePips ?? 0) > (data.maxRangePips ?? 0) && (
          <FieldError message="Min range must not exceed max range" />
        )}
        <ToggleField
          label="Cancel opposite pending after trigger"
          hint="When a buy breakout triggers, cancel the pending sell order (and vice versa)"
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
          label="Volume confirmation"
          hint="Only trade breakouts with above-average volume (stronger moves)"
          checked={data.volumeConfirmation ?? false}
          onChange={(v) => onChange({ volumeConfirmation: v })}
        >
          <NumberField
            label="Volume lookback period"
            value={data.volumeConfirmationPeriod ?? 20}
            min={5}
            max={200}
            onChange={(v) => onChange({ volumeConfirmationPeriod: v })}
            tooltip="Number of candles to calculate average volume"
          />
        </ToggleField>
        <MTFConfirmationSection data={data} onChange={onChange} />
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
        onChange={(v) => onChange({ appliedPrice: v as RSIReversalEntryData["appliedPrice"] })}
        tooltip="Which price to use for RSI calculation. Close (default) is the most common."
      />

      {/* Basic fields */}
      <NumberField
        label="RSI Period"
        value={data.rsiPeriod}
        min={1}
        max={500}
        onChange={(v) => onChange({ rsiPeriod: v })}
        tooltip="Number of candles used to calculate RSI. 14 is the standard setting."
      />
      <OptimizableFieldCheckbox fieldName="rsiPeriod" data={data} onChange={onChange} />
      <NumberField
        label="Oversold Level"
        value={data.oversoldLevel}
        min={0}
        max={50}
        onChange={(v) => onChange({ oversoldLevel: v })}
        tooltip="Below this level the market is considered oversold (cheap) — triggers a buy signal"
      />
      <OptimizableFieldCheckbox fieldName="oversoldLevel" data={data} onChange={onChange} />
      <NumberField
        label="Overbought Level"
        value={data.overboughtLevel}
        min={50}
        max={100}
        onChange={(v) => onChange({ overboughtLevel: v })}
        tooltip="Above this level the market is considered overbought (expensive) — triggers a sell signal"
      />
      <OptimizableFieldCheckbox fieldName="overboughtLevel" data={data} onChange={onChange} />
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldError message="Overbought must be higher than oversold" />
      )}
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
        <MTFConfirmationSection data={data} onChange={onChange} />
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
        onChange={(v) => onChange({ appliedPrice: v as MACDCrossoverEntryData["appliedPrice"] })}
        tooltip="Which price to use for MACD calculation. Close (default) is the most common."
      />

      {/* Basic fields */}
      <NumberField
        label="MACD Fast"
        value={data.macdFast}
        min={1}
        max={500}
        onChange={(v) => onChange({ macdFast: v })}
        tooltip="Short-term EMA period for MACD calculation. 12 is standard."
      />
      <OptimizableFieldCheckbox fieldName="macdFast" data={data} onChange={onChange} />
      <NumberField
        label="MACD Slow"
        value={data.macdSlow}
        min={1}
        max={500}
        onChange={(v) => onChange({ macdSlow: v })}
        tooltip="Long-term EMA period for MACD calculation. 26 is standard."
      />
      <OptimizableFieldCheckbox fieldName="macdSlow" data={data} onChange={onChange} />
      <NumberField
        label="MACD Signal"
        value={data.macdSignal}
        min={1}
        max={500}
        onChange={(v) => onChange({ macdSignal: v })}
        tooltip="Smoothing period for the signal line. 9 is standard."
      />
      <OptimizableFieldCheckbox fieldName="macdSignal" data={data} onChange={onChange} />
      <SelectField
        label="Signal Type"
        value={data.macdSignalType ?? "SIGNAL_CROSS"}
        options={[
          { value: "SIGNAL_CROSS", label: "Signal Line Cross" },
          { value: "ZERO_CROSS", label: "Zero Line Cross" },
          { value: "HISTOGRAM_SIGN", label: "Histogram Sign Change" },
        ]}
        onChange={(v) =>
          onChange({ macdSignalType: v as MACDCrossoverEntryData["macdSignalType"] })
        }
        tooltip="Signal Line Cross is the most common. Zero Line Cross is more conservative. Histogram catches momentum shifts early."
      />
      {data.macdFast >= data.macdSlow && (
        <FieldError message="MACD fast must be smaller than slow" />
      )}
      <EntryStrategyRiskSection data={data} onChange={onChange} />

      {/* Advanced */}
      <AdvancedToggleSection>
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
