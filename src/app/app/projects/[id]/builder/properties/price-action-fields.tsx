"use client";

import { SelectField, NumberField, TimeField } from "../components/form-fields";
import type {
  CandlestickPatternNodeData,
  SupportResistanceNodeData,
  RangeBreakoutNodeData,
  OrderBlockNodeData,
  FairValueGapNodeData,
  MarketStructureNodeData,
  CandlestickPattern,
  RangeType,
  RangeSession,
  BreakoutDirection,
  EntryMode,
  Timeframe,
} from "@/types/builder";
import {
  TIMEFRAME_OPTIONS,
  SIGNAL_MODE_OPTIONS,
  CANDLESTICK_PATTERN_OPTIONS,
  RANGE_TYPE_OPTIONS,
  RANGE_SESSION_OPTIONS,
  BREAKOUT_DIRECTION_OPTIONS,
  ENTRY_MODE_OPTIONS,
} from "./constants";
import { OptimizableFieldCheckbox, FieldWarning, AdvancedToggleSection } from "./shared";

export function CandlestickPatternFields({
  data,
  onChange,
}: {
  data: CandlestickPatternNodeData;
  onChange: (updates: Partial<CandlestickPatternNodeData>) => void;
}) {
  const patterns = data.patterns ?? [];

  const togglePattern = (pattern: CandlestickPattern) => {
    const newPatterns = patterns.includes(pattern)
      ? patterns.filter((p) => p !== pattern)
      : [...patterns, pattern];
    onChange({ patterns: newPatterns });
  };

  return (
    <>
      <div>
        <SelectField
          label="Timeframe"
          value={data.timeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) => onChange({ timeframe: v as Timeframe })}
        />
        <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#CBD5E1] mb-2">Patterns to Detect</label>
        <div className="space-y-1 max-h-48 overflow-y-auto bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg p-2">
          {CANDLESTICK_PATTERN_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer hover:bg-[rgba(79,70,229,0.1)] p-1.5 rounded"
            >
              <input
                type="checkbox"
                checked={patterns.includes(option.value)}
                onChange={() => togglePattern(option.value)}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded border-[rgba(79,70,229,0.3)] bg-[#0F172A] text-[#22D3EE] focus:ring-[#22D3EE]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <NumberField
          label="Min Body Size (pips)"
          value={data.minBodySize}
          min={0}
          max={100}
          onChange={(v) => onChange({ minBodySize: v })}
        />
        <OptimizableFieldCheckbox fieldName="minBodySize" data={data} onChange={onChange} />
      </div>
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Detects selected candlestick patterns. Minimum body size filters out weak signals.
      </div>
    </>
  );
}

export function SupportResistanceFields({
  data,
  onChange,
}: {
  data: SupportResistanceNodeData;
  onChange: (updates: Partial<SupportResistanceNodeData>) => void;
}) {
  return (
    <>
      <div>
        <SelectField
          label="Timeframe"
          value={data.timeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) => onChange({ timeframe: v as Timeframe })}
        />
        <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Lookback Period"
          value={data.lookbackPeriod}
          min={10}
          max={500}
          onChange={(v) => onChange({ lookbackPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="lookbackPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Min Touches"
          value={data.touchCount}
          min={1}
          max={10}
          onChange={(v) => onChange({ touchCount: v })}
        />
        <OptimizableFieldCheckbox fieldName="touchCount" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Zone Size (pips)"
          value={data.zoneSize}
          min={1}
          max={100}
          onChange={(v) => onChange({ zoneSize: v })}
        />
        <OptimizableFieldCheckbox fieldName="zoneSize" data={data} onChange={onChange} />
      </div>
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Identifies key price levels based on historical touches. Higher touch count = stronger
        level.
      </div>
    </>
  );
}

export function RangeBreakoutFields({
  data,
  onChange,
}: {
  data: RangeBreakoutNodeData;
  onChange: (updates: Partial<RangeBreakoutNodeData>) => void;
}) {
  return (
    <>
      <div>
        <SelectField
          label="Timeframe"
          value={data.timeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) => onChange({ timeframe: v as Timeframe })}
        />
        <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      </div>

      {/* Range Definition */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Range Definition
        </span>
      </div>

      <SelectField
        label="Range Type"
        value={data.rangeType}
        options={RANGE_TYPE_OPTIONS}
        onChange={(v) => onChange({ rangeType: v as RangeType })}
      />

      {data.rangeType === "PREVIOUS_CANDLES" && (
        <div>
          <NumberField
            label="Lookback Candles"
            value={data.lookbackCandles}
            min={2}
            max={500}
            onChange={(v) => onChange({ lookbackCandles: v })}
          />
          <OptimizableFieldCheckbox fieldName="lookbackCandles" data={data} onChange={onChange} />
        </div>
      )}

      {data.rangeType === "SESSION" && (
        <SelectField
          label="Session"
          value={data.rangeSession}
          options={RANGE_SESSION_OPTIONS}
          onChange={(v) => onChange({ rangeSession: v as RangeSession })}
        />
      )}

      {(data.rangeType === "TIME_WINDOW" ||
        (data.rangeType === "SESSION" && data.rangeSession === "CUSTOM")) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TimeField
              label="Start"
              hour={data.sessionStartHour}
              minute={data.sessionStartMinute}
              onHourChange={(v) => onChange({ sessionStartHour: v })}
              onMinuteChange={(v) => onChange({ sessionStartMinute: v })}
            />
            <span className="text-[#7C8DB0] text-xs mt-4">to</span>
            <TimeField
              label="End"
              hour={data.sessionEndHour}
              minute={data.sessionEndMinute}
              onHourChange={(v) => onChange({ sessionEndHour: v })}
              onMinuteChange={(v) => onChange({ sessionEndMinute: v })}
            />
          </div>
          <p className="text-[10px] text-[#7C8DB0]">
            Times in {(data.useServerTime ?? true) ? "broker server time" : "GMT/UTC"}
          </p>
        </div>
      )}

      {/* Timezone toggle */}
      <div className="mt-2">
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={!(data.useServerTime ?? true)}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ useServerTime: !e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Use GMT time
        </label>
      </div>
      {!(data.useServerTime ?? true) && (
        <div className="text-[10px] text-[#FBBF24] mt-1">
          Range times will be compared against GMT (TimeGMT) instead of your broker&apos;s server
          clock.
        </div>
      )}

      {/* Breakout Settings */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Breakout Settings
        </span>
      </div>

      <SelectField
        label="Direction"
        value={data.breakoutDirection}
        options={BREAKOUT_DIRECTION_OPTIONS}
        onChange={(v) => onChange({ breakoutDirection: v as BreakoutDirection })}
      />

      <SelectField
        label="Entry Mode"
        value={data.entryMode}
        options={ENTRY_MODE_OPTIONS}
        onChange={(v) => onChange({ entryMode: v as EntryMode })}
      />

      <div>
        <NumberField
          label="Buffer (pips)"
          value={data.bufferPips}
          min={0}
          max={50}
          onChange={(v) => onChange({ bufferPips: v })}
        />
        <OptimizableFieldCheckbox fieldName="bufferPips" data={data} onChange={onChange} />
      </div>

      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg mt-3"
        role="note"
      >
        Triggers entry when price breaks above range high (buy) or below range low (sell). Connect
        to Place Buy/Sell blocks.
      </div>

      {/* Advanced Settings */}
      <AdvancedToggleSection>
        <div>
          <NumberField
            label="Min Range (pips)"
            value={data.minRangePips}
            min={0}
            max={500}
            onChange={(v) => onChange({ minRangePips: v })}
          />
          <OptimizableFieldCheckbox fieldName="minRangePips" data={data} onChange={onChange} />
        </div>

        <div>
          <NumberField
            label="Max Range (pips, 0=no limit)"
            value={data.maxRangePips}
            min={0}
            max={1000}
            onChange={(v) => onChange({ maxRangePips: v })}
          />
          <OptimizableFieldCheckbox fieldName="maxRangePips" data={data} onChange={onChange} />
        </div>

        {data.maxRangePips > 0 && data.minRangePips > data.maxRangePips && (
          <FieldWarning message="Min range should not exceed max range" />
        )}
      </AdvancedToggleSection>
    </>
  );
}

export function OrderBlockFields({
  data,
  onChange,
}: {
  data: OrderBlockNodeData;
  onChange: (updates: Partial<OrderBlockNodeData>) => void;
}) {
  return (
    <>
      <div>
        <SelectField
          label="Timeframe"
          value={data.timeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) => onChange({ timeframe: v as Timeframe })}
        />
        <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Lookback Period (bars)"
          value={data.lookbackPeriod}
          min={10}
          max={500}
          onChange={(v) => onChange({ lookbackPeriod: v })}
        />
        <OptimizableFieldCheckbox fieldName="lookbackPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Min Block Size (pips)"
          value={data.minBlockSize}
          min={1}
          max={200}
          onChange={(v) => onChange({ minBlockSize: v })}
        />
        <OptimizableFieldCheckbox fieldName="minBlockSize" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Max Block Age (bars)"
          value={data.maxBlockAge}
          min={10}
          max={1000}
          onChange={(v) => onChange({ maxBlockAge: v })}
        />
        <OptimizableFieldCheckbox fieldName="maxBlockAge" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={SIGNAL_MODE_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ signalMode: v as "every_tick" | "candle_close" })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Detects order blocks (ICT). Bullish OB = last bearish candle before a strong bullish
        impulse. Buy when price returns to the OB zone.
      </div>
    </>
  );
}

export function FairValueGapFields({
  data,
  onChange,
}: {
  data: FairValueGapNodeData;
  onChange: (updates: Partial<FairValueGapNodeData>) => void;
}) {
  return (
    <>
      <div>
        <SelectField
          label="Timeframe"
          value={data.timeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) => onChange({ timeframe: v as Timeframe })}
        />
        <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Min Gap Size (pips)"
          value={data.minGapSize}
          min={1}
          max={200}
          onChange={(v) => onChange({ minGapSize: v })}
        />
        <OptimizableFieldCheckbox fieldName="minGapSize" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Max Gap Age (bars)"
          value={data.maxGapAge}
          min={5}
          max={500}
          onChange={(v) => onChange({ maxGapAge: v })}
        />
        <OptimizableFieldCheckbox fieldName="maxGapAge" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Fill Percentage (%)"
          value={data.fillPercentage}
          min={0}
          max={100}
          onChange={(v) => onChange({ fillPercentage: v })}
        />
        <OptimizableFieldCheckbox fieldName="fillPercentage" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={SIGNAL_MODE_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ signalMode: v as "every_tick" | "candle_close" })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Detects Fair Value Gaps (ICT). A 3-candle pattern where a gap forms between candle[2] high
        and candle[0] low. Buy when price fills into a bullish FVG zone.
      </div>
    </>
  );
}

export function MarketStructureFields({
  data,
  onChange,
}: {
  data: MarketStructureNodeData;
  onChange: (updates: Partial<MarketStructureNodeData>) => void;
}) {
  return (
    <>
      <div>
        <SelectField
          label="Timeframe"
          value={data.timeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) => onChange({ timeframe: v as Timeframe })}
        />
        <OptimizableFieldCheckbox fieldName="timeframe" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Swing Strength (bars)"
          value={data.swingStrength}
          min={2}
          max={50}
          onChange={(v) => onChange({ swingStrength: v })}
        />
        <OptimizableFieldCheckbox fieldName="swingStrength" data={data} onChange={onChange} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.detectBOS}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ detectBOS: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Detect Break of Structure (BOS)
        </label>
      </div>
      <div>
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.detectChoCh}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ detectChoCh: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Detect Change of Character (ChoCh)
        </label>
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={SIGNAL_MODE_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={(v) => onChange({ signalMode: v as "every_tick" | "candle_close" })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Tracks market structure (SMC). Uptrend = HH + HL, Downtrend = LL + LH. Buy on HL in uptrend,
        sell on LH in downtrend. BOS = price breaks last swing point.
      </div>
    </>
  );
}
