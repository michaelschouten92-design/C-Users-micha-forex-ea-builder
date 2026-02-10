"use client";

import { SelectField, NumberField, TimeField } from "../components/form-fields";
import type {
  CandlestickPatternNodeData,
  SupportResistanceNodeData,
  RangeBreakoutNodeData,
  CandlestickPattern,
  RangeType,
  RangeSession,
  BreakoutDirection,
  EntryMode,
  Timeframe,
} from "@/types/builder";
import {
  TIMEFRAME_OPTIONS,
  CANDLESTICK_PATTERN_OPTIONS,
  RANGE_TYPE_OPTIONS,
  RANGE_SESSION_OPTIONS,
  BREAKOUT_DIRECTION_OPTIONS,
  ENTRY_MODE_OPTIONS,
} from "./constants";
import { OptimizableFieldCheckbox, FieldWarning } from "./shared";

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
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
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
      <NumberField
        label="Min Body Size (pips)"
        value={data.minBodySize}
        min={0}
        max={100}
        onChange={(v) => onChange({ minBodySize: v })}
      />
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
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <NumberField
        label="Lookback Period"
        value={data.lookbackPeriod}
        min={10}
        max={500}
        onChange={(v) => onChange({ lookbackPeriod: v })}
      />
      <NumberField
        label="Min Touches"
        value={data.touchCount}
        min={1}
        max={10}
        onChange={(v) => onChange({ touchCount: v })}
      />
      <NumberField
        label="Zone Size (pips)"
        value={data.zoneSize}
        min={1}
        max={100}
        onChange={(v) => onChange({ zoneSize: v })}
      />
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
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />

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
            <span className="text-[#64748B] text-xs mt-4">to</span>
            <TimeField
              label="End"
              hour={data.sessionEndHour}
              minute={data.sessionEndMinute}
              onHourChange={(v) => onChange({ sessionEndHour: v })}
              onMinuteChange={(v) => onChange({ sessionEndMinute: v })}
            />
          </div>
          <p className="text-[10px] text-[#64748B]">
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

      {/* Filters */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Filters</span>
      </div>

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

      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg mt-3"
        role="note"
      >
        Triggers entry when price breaks above range high (buy) or below range low (sell). Connect
        to Place Buy/Sell blocks.
      </div>
    </>
  );
}
