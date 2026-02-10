"use client";

import { memo, useId } from "react";
import type { Node } from "@xyflow/react";
import { SelectField, NumberField, TimeField } from "./components/form-fields";
import type {
  BuilderNodeData,
  TradingSessionNodeData,
  TradingSession,
  AlwaysNodeData,
  CustomTimesNodeData,
  TradingDays,
  TimeSlot,
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ATRNodeData,
  ADXNodeData,
  StochasticNodeData,
  CandlestickPatternNodeData,
  SupportResistanceNodeData,
  RangeBreakoutNodeData,
  CandlestickPattern,
  RangeType,
  RangeSession,
  BreakoutDirection,
  EntryMode,
  Timeframe,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  CloseConditionNodeData,
  CloseDirection,
  BreakevenStopNodeData,
  TrailingStopNodeData,
  PartialCloseNodeData,
  LockProfitNodeData,
  BreakevenTrigger,
  TrailingStopMethod,
  LockProfitMethod,
  CCINodeData,
  TimeExitNodeData,
  EMACrossoverEntryData,
  RSIReversalEntryData,
  RangeBreakoutEntryData,
  PositionSizingMethod,
} from "@/types/builder";
import { SESSION_TIMES } from "@/types/builder";

interface PropertiesPanelProps {
  selectedNode: Node<BuilderNodeData> | null;
  onNodeChange: (nodeId: string, data: Partial<BuilderNodeData>) => void;
  onNodeDelete: (nodeId: string) => void;
}

// Reusable component for optimizable field checkbox
function OptimizableFieldCheckbox<T extends BuilderNodeData>({
  fieldName,
  data,
  onChange,
}: {
  fieldName: string;
  data: T;
  onChange: (updates: Partial<T>) => void;
}) {
  const optimizableFields = data.optimizableFields ?? [];
  const isOptimizable = optimizableFields.includes(fieldName);

  const toggleOptimizable = () => {
    const newFields = isOptimizable
      ? optimizableFields.filter((f) => f !== fieldName)
      : [...optimizableFields, fieldName];
    onChange({ optimizableFields: newFields } as Partial<T>);
  };

  return (
    <label className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] cursor-pointer hover:text-[#CBD5E1] mt-1">
      <input
        type="checkbox"
        checked={isOptimizable}
        onChange={toggleOptimizable}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-3 h-3 rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
      />
      <span className="flex items-center gap-1">
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3v18h18" />
          <path d="M18 9l-5 5-4-4-3 3" />
        </svg>
        Optimize in tester
      </span>
    </label>
  );
}

// Inline cross-field validation warning
function FieldWarning({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-1.5 text-[#FBBF24] text-[11px]" role="alert">
      <svg
        className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

const SIGNAL_MODE_OPTIONS = [
  { value: "every_tick", label: "Every tick (current price)" },
  { value: "candle_close", label: "Wait for candle close" },
] as const;

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "M1", label: "1 Minute" },
  { value: "M5", label: "5 Minutes" },
  { value: "M15", label: "15 Minutes" },
  { value: "M30", label: "30 Minutes" },
  { value: "H1", label: "1 Hour" },
  { value: "H4", label: "4 Hours" },
  { value: "D1", label: "1 Day" },
  { value: "W1", label: "1 Week" },
  { value: "MN1", label: "1 Month" },
];

export const PropertiesPanel = memo(function PropertiesPanel({
  selectedNode,
  onNodeChange,
  onNodeDelete,
}: PropertiesPanelProps) {
  const panelId = useId();
  const labelInputId = useId();

  if (!selectedNode) {
    return (
      <aside
        aria-label="Properties Panel"
        className="w-full h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] p-4"
      >
        <div className="text-center text-[#64748B] py-8">
          <svg
            className="mx-auto h-8 w-8 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm">Select a block to edit its properties</p>
        </div>
      </aside>
    );
  }

  const data = selectedNode.data;

  const handleChange = (updates: Partial<BuilderNodeData>) => {
    onNodeChange(selectedNode.id, updates);
  };

  return (
    <aside
      aria-label="Properties Panel"
      aria-describedby={panelId}
      className="w-full h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] overflow-y-auto"
    >
      <div className="p-4 border-b border-[rgba(79,70,229,0.2)]">
        <div className="flex items-center justify-between">
          <h3 id={panelId} className="text-sm font-semibold text-white">
            {data.label}
          </h3>
          <button
            onClick={() => onNodeDelete(selectedNode.id)}
            className="text-[#EF4444] hover:text-[#F87171] p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200"
            aria-label={`Delete ${data.label} block`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-[#64748B] mt-1">ID: {selectedNode.id}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Label Field (all nodes) */}
        <div>
          <label htmlFor={labelInputId} className="block text-xs font-medium text-[#CBD5E1] mb-1">
            Label
          </label>
          <input
            id={labelInputId}
            type="text"
            value={data.label}
            onChange={(e) => {
              e.stopPropagation();
              handleChange({ label: e.target.value });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Node-specific fields */}
        <NodeFields data={data} onChange={handleChange} />
      </div>
    </aside>
  );
});

// Node-specific fields component
function NodeFields({
  data,
  onChange,
}: {
  data: BuilderNodeData;
  onChange: (updates: Partial<BuilderNodeData>) => void;
}) {
  // Entry Strategy nodes
  if ("entryType" in data) {
    switch (data.entryType) {
      case "ema-crossover":
        return <EMACrossoverEntryFields data={data as EMACrossoverEntryData} onChange={onChange} />;
      case "rsi-reversal":
        return <RSIReversalEntryFields data={data as RSIReversalEntryData} onChange={onChange} />;
      case "range-breakout":
        return (
          <RangeBreakoutEntryFields data={data as RangeBreakoutEntryData} onChange={onChange} />
        );
    }
  }

  // Timing nodes
  if ("timingType" in data) {
    switch (data.timingType) {
      case "trading-session":
        return <TradingSessionFields data={data as TradingSessionNodeData} onChange={onChange} />;
      case "always":
        return <AlwaysFields data={data as AlwaysNodeData} onChange={onChange} />;
      case "custom-times":
        return <CustomTimesFields data={data as CustomTimesNodeData} onChange={onChange} />;
    }
  }

  // Indicators
  if ("indicatorType" in data) {
    switch (data.indicatorType) {
      case "moving-average":
        return <MovingAverageFields data={data as MovingAverageNodeData} onChange={onChange} />;
      case "rsi":
        return <RSIFields data={data as RSINodeData} onChange={onChange} />;
      case "macd":
        return <MACDFields data={data as MACDNodeData} onChange={onChange} />;
      case "bollinger-bands":
        return <BollingerBandsFields data={data as BollingerBandsNodeData} onChange={onChange} />;
      case "atr":
        return <ATRFields data={data as ATRNodeData} onChange={onChange} />;
      case "adx":
        return <ADXFields data={data as ADXNodeData} onChange={onChange} />;
      case "stochastic":
        return <StochasticFields data={data as StochasticNodeData} onChange={onChange} />;
      case "cci":
        return <CCIFields data={data as CCINodeData} onChange={onChange} />;
    }
  }

  // Price Action
  if ("priceActionType" in data) {
    switch (data.priceActionType) {
      case "candlestick-pattern":
        return (
          <CandlestickPatternFields data={data as CandlestickPatternNodeData} onChange={onChange} />
        );
      case "support-resistance":
        return (
          <SupportResistanceFields data={data as SupportResistanceNodeData} onChange={onChange} />
        );
      case "range-breakout":
        return <RangeBreakoutFields data={data as RangeBreakoutNodeData} onChange={onChange} />;
    }
  }

  // Trading
  if ("tradingType" in data) {
    switch (data.tradingType) {
      case "place-buy":
        return <PlaceBuyFields data={data as PlaceBuyNodeData} onChange={onChange} />;
      case "place-sell":
        return <PlaceSellFields data={data as PlaceSellNodeData} onChange={onChange} />;
      case "stop-loss":
        return <StopLossFields data={data as StopLossNodeData} onChange={onChange} />;
      case "take-profit":
        return <TakeProfitFields data={data as TakeProfitNodeData} onChange={onChange} />;
      case "close-condition":
        return <CloseConditionFields data={data as CloseConditionNodeData} onChange={onChange} />;
      case "time-exit":
        return <TimeExitFields data={data as TimeExitNodeData} onChange={onChange} />;
    }
  }

  // Trade Management (Pro only)
  if ("managementType" in data) {
    switch (data.managementType) {
      case "breakeven-stop":
        return <BreakevenStopFields data={data as BreakevenStopNodeData} onChange={onChange} />;
      case "trailing-stop":
        return <TrailingStopFields data={data as TrailingStopNodeData} onChange={onChange} />;
      case "partial-close":
        return <PartialCloseFields data={data as PartialCloseNodeData} onChange={onChange} />;
      case "lock-profit":
        return <LockProfitFields data={data as LockProfitNodeData} onChange={onChange} />;
    }
  }

  return null;
}

// ============================================
// NODE-SPECIFIC FIELD COMPONENTS
// ============================================

const TRADING_SESSION_OPTIONS: { value: TradingSession; label: string }[] = [
  { value: "LONDON", label: "London Session (08:00-17:00 GMT)" },
  { value: "NEW_YORK", label: "New York Session (13:00-22:00 GMT)" },
  { value: "TOKYO", label: "Tokyo Session (00:00-09:00 GMT)" },
  { value: "SYDNEY", label: "Sydney Session (22:00-07:00 GMT)" },
  { value: "LONDON_NY_OVERLAP", label: "London/NY Overlap (13:00-17:00 GMT)" },
];

function TradingSessionFields({
  data,
  onChange,
}: {
  data: TradingSessionNodeData;
  onChange: (updates: Partial<TradingSessionNodeData>) => void;
}) {
  const sessionInfo = SESSION_TIMES[data.session];

  return (
    <>
      <SelectField
        label="Session"
        value={data.session}
        options={TRADING_SESSION_OPTIONS}
        onChange={(v) => onChange({ session: v as TradingSession })}
      />
      <div className="bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#94A3B8]">Time (GMT):</span>
          <span className="text-white font-medium">
            {sessionInfo.start} - {sessionInfo.end}
          </span>
        </div>
        <div className="text-xs text-[#94A3B8]">
          {data.session === "LONDON_NY_OVERLAP"
            ? "Highest volatility period"
            : `${sessionInfo.label} trading hours`}
        </div>
      </div>
      <div className="mt-3">
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.tradeMondayToFriday}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ tradeMondayToFriday: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Weekdays only (Mon-Fri)
        </label>
      </div>
    </>
  );
}

function AlwaysFields({
  data,
  onChange,
}: {
  data: AlwaysNodeData;
  onChange: (updates: Partial<AlwaysNodeData>) => void;
}) {
  return (
    <div
      className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
      role="note"
    >
      Trading is enabled at all times. No time restrictions apply.
    </div>
  );
}

const DAY_LABELS: { key: keyof TradingDays; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

function CustomTimesFields({
  data,
  onChange,
}: {
  data: CustomTimesNodeData;
  onChange: (updates: Partial<CustomTimesNodeData>) => void;
}) {
  const days = data.days ?? {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  };
  const timeSlots = data.timeSlots ?? [];

  const updateDay = (day: keyof TradingDays, value: boolean) => {
    onChange({
      days: {
        ...days,
        [day]: value,
      },
    });
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: number) => {
    const newSlots = [...timeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    onChange({ timeSlots: newSlots });
  };

  const addTimeSlot = () => {
    onChange({
      timeSlots: [...timeSlots, { startHour: 8, startMinute: 0, endHour: 17, endMinute: 0 }],
    });
  };

  const removeTimeSlot = (index: number) => {
    const newSlots = timeSlots.filter((_, i) => i !== index);
    onChange({ timeSlots: newSlots });
  };

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-[#CBD5E1] mb-2">Trading Days</label>
        <div className="space-y-1 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg p-2">
          {DAY_LABELS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer hover:bg-[rgba(79,70,229,0.1)] p-1.5 rounded"
            >
              <input
                type="checkbox"
                checked={days[key]}
                onChange={(e) => updateDay(key, e.target.checked)}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded border-[rgba(79,70,229,0.3)] bg-[#0F172A] text-[#22D3EE] focus:ring-[#22D3EE]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-[#CBD5E1]">
            Time Slots ({(data.useServerTime ?? true) ? "Server Time" : "GMT"})
          </label>
          <button
            onClick={addTimeSlot}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-[#22D3EE] hover:text-[#67E8F9] transition-colors"
          >
            + Add slot
          </button>
        </div>
        <div className="space-y-2">
          {timeSlots.map((slot, index) => (
            <div
              key={index}
              className="bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg p-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#94A3B8]">Slot {index + 1}</span>
                {timeSlots.length > 1 && (
                  <button
                    onClick={() => removeTimeSlot(index)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="text-xs text-[#EF4444] hover:text-[#F87171] transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TimeField
                  label="Start"
                  hour={slot.startHour}
                  minute={slot.startMinute}
                  onHourChange={(v) => updateTimeSlot(index, "startHour", v)}
                  onMinuteChange={(v) => updateTimeSlot(index, "startMinute", v)}
                />
                <span className="text-[#64748B] text-xs mt-4">to</span>
                <TimeField
                  label="End"
                  hour={slot.endHour}
                  minute={slot.endMinute}
                  onHourChange={(v) => updateTimeSlot(index, "endHour", v)}
                  onMinuteChange={(v) => updateTimeSlot(index, "endMinute", v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.closeOnSessionEnd ?? false}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ closeOnSessionEnd: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Close trades on session end
        </label>
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
      {data.closeOnSessionEnd && (
        <div className="text-[10px] text-[#22D3EE] mt-1">
          All open positions will be closed when the trading session ends.
        </div>
      )}
      {!(data.useServerTime ?? true) && (
        <div className="text-[10px] text-[#FBBF24] mt-1">
          Time slots will be compared against GMT (TimeGMT) instead of your broker&apos;s server
          clock.
        </div>
      )}
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Define custom trading days and time windows.{" "}
        {(data.useServerTime ?? true) ? "Times use broker server time." : "All times are in GMT."}{" "}
        Your broker&apos;s MT5 server may use a different timezone — check the Market Watch clock
        for the offset.
      </div>
    </>
  );
}

function MovingAverageFields({
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
        tooltip="Every tick checks each price update. Candle close waits for bar confirmation"
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
    </>
  );
}

function RSIFields({
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
          tooltip="Number of bars used for calculation. Higher values = smoother, slower signals"
        />
        <OptimizableFieldCheckbox fieldName="period" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as RSINodeData["signalMode"] })}
        tooltip="Every tick checks each price update. Candle close waits for bar confirmation"
      />
      <div>
        <NumberField
          label="Overbought Level"
          value={data.overboughtLevel}
          min={50}
          max={100}
          onChange={(v) => onChange({ overboughtLevel: v })}
          tooltip="Indicator value above which the market is considered overbought"
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
          tooltip="Indicator value below which the market is considered oversold"
        />
        <OptimizableFieldCheckbox fieldName="oversoldLevel" data={data} onChange={onChange} />
      </div>
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldWarning message="Overbought level must be higher than oversold level" />
      )}
    </>
  );
}

function MACDFields({
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
      {data.fastPeriod >= data.slowPeriod && (
        <FieldWarning message="Fast period should be smaller than slow period" />
      )}
    </>
  );
}

function BollingerBandsFields({
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
    </>
  );
}

function ATRFields({
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

function ADXFields({
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

function StochasticFields({
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
        label="Signal Mode"
        value={data.signalMode ?? "every_tick"}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as StochasticNodeData["signalMode"] })}
      />
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

// ============================================
// PRICE ACTION FIELD COMPONENTS
// ============================================

const CANDLESTICK_PATTERN_OPTIONS: { value: CandlestickPattern; label: string }[] = [
  { value: "ENGULFING_BULLISH", label: "Bullish Engulfing" },
  { value: "ENGULFING_BEARISH", label: "Bearish Engulfing" },
  { value: "DOJI", label: "Doji" },
  { value: "HAMMER", label: "Hammer" },
  { value: "SHOOTING_STAR", label: "Shooting Star" },
  { value: "MORNING_STAR", label: "Morning Star" },
  { value: "EVENING_STAR", label: "Evening Star" },
  { value: "THREE_WHITE_SOLDIERS", label: "Three White Soldiers" },
  { value: "THREE_BLACK_CROWS", label: "Three Black Crows" },
];

function CandlestickPatternFields({
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

function SupportResistanceFields({
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

const RANGE_TYPE_OPTIONS: { value: RangeType; label: string }[] = [
  { value: "PREVIOUS_CANDLES", label: "Previous Candles" },
  { value: "SESSION", label: "Trading Session" },
  { value: "TIME_WINDOW", label: "Custom Time Window" },
];

const RANGE_SESSION_OPTIONS: { value: RangeSession; label: string }[] = [
  { value: "ASIAN", label: "Asian Session (00:00-08:00)" },
  { value: "LONDON", label: "London Session (08:00-16:00)" },
  { value: "NEW_YORK", label: "New York Session (13:00-21:00)" },
  { value: "CUSTOM", label: "Custom Hours" },
];

const BREAKOUT_DIRECTION_OPTIONS: { value: BreakoutDirection; label: string }[] = [
  { value: "BOTH", label: "Both (Buy High, Sell Low)" },
  { value: "BUY_ON_HIGH", label: "Buy Only (Break High)" },
  { value: "SELL_ON_LOW", label: "Sell Only (Break Low)" },
];

const ENTRY_MODE_OPTIONS: { value: EntryMode; label: string }[] = [
  { value: "ON_CLOSE", label: "On Candle Close" },
  { value: "IMMEDIATE", label: "Immediate (on touch)" },
  { value: "AFTER_RETEST", label: "After Retest" },
];

function RangeBreakoutFields({
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

function PlaceBuyFields({
  data,
  onChange,
}: {
  data: PlaceBuyNodeData;
  onChange: (updates: Partial<PlaceBuyNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22C55E] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
        </svg>
        Opens a BUY position when conditions are met
      </div>
      <SelectField
        label="Position Size Method"
        value={data.method}
        options={[
          { value: "FIXED_LOT", label: "Fixed Lot" },
          { value: "RISK_PERCENT", label: "Risk %" },
        ]}
        onChange={(v) => onChange({ method: v as PlaceBuyNodeData["method"] })}
      />
      {data.method === "FIXED_LOT" && (
        <div>
          <NumberField
            label="Lot Size"
            value={data.fixedLot}
            min={0.01}
            max={100}
            step={0.01}
            onChange={(v) => onChange({ fixedLot: v })}
          />
          <OptimizableFieldCheckbox fieldName="fixedLot" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "RISK_PERCENT" && (
        <div>
          <NumberField
            label="Risk %"
            value={data.riskPercent}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ riskPercent: v })}
            tooltip="Percentage of account balance risked per trade"
          />
          <OptimizableFieldCheckbox fieldName="riskPercent" data={data} onChange={onChange} />
        </div>
      )}
      <NumberField
        label="Min Lot"
        value={data.minLot}
        min={0.01}
        max={100}
        step={0.01}
        onChange={(v) => onChange({ minLot: v })}
      />
      <NumberField
        label="Max Lot"
        value={data.maxLot}
        min={0.01}
        max={1000}
        step={0.01}
        onChange={(v) => onChange({ maxLot: v })}
      />
      {data.minLot > data.maxLot && <FieldWarning message="Min lot should not exceed max lot" />}
      {data.method === "RISK_PERCENT" && data.riskPercent > 5 && (
        <FieldWarning message="Risk above 5% per trade is considered aggressive" />
      )}
    </>
  );
}

function PlaceSellFields({
  data,
  onChange,
}: {
  data: PlaceSellNodeData;
  onChange: (updates: Partial<PlaceSellNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
        </svg>
        Opens a SELL position when conditions are met
      </div>
      <SelectField
        label="Position Size Method"
        value={data.method}
        options={[
          { value: "FIXED_LOT", label: "Fixed Lot" },
          { value: "RISK_PERCENT", label: "Risk %" },
        ]}
        onChange={(v) => onChange({ method: v as PlaceSellNodeData["method"] })}
      />
      {data.method === "FIXED_LOT" && (
        <div>
          <NumberField
            label="Lot Size"
            value={data.fixedLot}
            min={0.01}
            max={100}
            step={0.01}
            onChange={(v) => onChange({ fixedLot: v })}
          />
          <OptimizableFieldCheckbox fieldName="fixedLot" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "RISK_PERCENT" && (
        <div>
          <NumberField
            label="Risk %"
            value={data.riskPercent}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ riskPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="riskPercent" data={data} onChange={onChange} />
        </div>
      )}
      <NumberField
        label="Min Lot"
        value={data.minLot}
        min={0.01}
        max={100}
        step={0.01}
        onChange={(v) => onChange({ minLot: v })}
      />
      <NumberField
        label="Max Lot"
        value={data.maxLot}
        min={0.01}
        max={1000}
        step={0.01}
        onChange={(v) => onChange({ maxLot: v })}
      />
      {data.minLot > data.maxLot && <FieldWarning message="Min lot should not exceed max lot" />}
      {data.method === "RISK_PERCENT" && data.riskPercent > 5 && (
        <FieldWarning message="Risk above 5% per trade is considered aggressive" />
      )}
    </>
  );
}

function StopLossFields({
  data,
  onChange,
}: {
  data: StopLossNodeData;
  onChange: (updates: Partial<StopLossNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Method"
        value={data.method}
        options={[
          { value: "FIXED_PIPS", label: "Fixed Pips" },
          { value: "ATR_BASED", label: "ATR-Based" },
          { value: "INDICATOR", label: "From Indicator" },
        ]}
        onChange={(v) => onChange({ method: v as StopLossNodeData["method"] })}
      />
      {data.method === "FIXED_PIPS" && (
        <div>
          <NumberField
            label="Pips"
            value={data.fixedPips}
            min={1}
            max={1000}
            onChange={(v) => onChange({ fixedPips: v })}
          />
          <OptimizableFieldCheckbox fieldName="fixedPips" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "ATR_BASED" && (
        <>
          <div>
            <NumberField
              label="ATR Period"
              value={data.atrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ atrPeriod: v })}
            />
            <OptimizableFieldCheckbox fieldName="atrPeriod" data={data} onChange={onChange} />
          </div>
          <div>
            <NumberField
              label="ATR Multiplier"
              value={data.atrMultiplier}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => onChange({ atrMultiplier: v })}
              tooltip="Multiplies the ATR value. Higher = wider stop loss"
            />
            <OptimizableFieldCheckbox fieldName="atrMultiplier" data={data} onChange={onChange} />
          </div>
        </>
      )}
      {data.method === "INDICATOR" && (
        <div
          className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
          role="note"
        >
          Connect an indicator block to use its value as SL level.
        </div>
      )}
    </>
  );
}

function TakeProfitFields({
  data,
  onChange,
}: {
  data: TakeProfitNodeData;
  onChange: (updates: Partial<TakeProfitNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Method"
        value={data.method}
        options={[
          { value: "FIXED_PIPS", label: "Fixed Pips" },
          { value: "RISK_REWARD", label: "Risk:Reward Ratio" },
          { value: "ATR_BASED", label: "ATR-Based" },
        ]}
        onChange={(v) => onChange({ method: v as TakeProfitNodeData["method"] })}
      />
      {data.method === "FIXED_PIPS" && (
        <div>
          <NumberField
            label="Pips"
            value={data.fixedPips}
            min={1}
            max={1000}
            onChange={(v) => onChange({ fixedPips: v })}
          />
          <OptimizableFieldCheckbox fieldName="fixedPips" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "RISK_REWARD" && (
        <div>
          <NumberField
            label="R:R Ratio"
            value={data.riskRewardRatio}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(v) => onChange({ riskRewardRatio: v })}
          />
          <OptimizableFieldCheckbox fieldName="riskRewardRatio" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "ATR_BASED" && (
        <>
          <div>
            <NumberField
              label="ATR Period"
              value={data.atrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ atrPeriod: v })}
            />
            <OptimizableFieldCheckbox fieldName="atrPeriod" data={data} onChange={onChange} />
          </div>
          <div>
            <NumberField
              label="ATR Multiplier"
              value={data.atrMultiplier}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(v) => onChange({ atrMultiplier: v })}
            />
            <OptimizableFieldCheckbox fieldName="atrMultiplier" data={data} onChange={onChange} />
          </div>
        </>
      )}
    </>
  );
}

function CloseConditionFields({
  data,
  onChange,
}: {
  data: CloseConditionNodeData;
  onChange: (updates: Partial<CloseConditionNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Closes positions when conditions are met
      </div>
      <SelectField
        label="Close Direction"
        value={data.closeDirection}
        options={[
          { value: "BOTH", label: "Close Both (Buy & Sell)" },
          { value: "BUY", label: "Close Buy Only" },
          { value: "SELL", label: "Close Sell Only" },
        ]}
        onChange={(v) => onChange({ closeDirection: v as CloseDirection })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Closes open positions when connected conditions are triggered. Connect indicator or price
        action blocks to define when to close.
      </div>
    </>
  );
}

// ============================================
// TRADE MANAGEMENT FIELD COMPONENTS (Pro only)
// ============================================

function BreakevenStopFields({
  data,
  onChange,
}: {
  data: BreakevenStopNodeData;
  onChange: (updates: Partial<BreakevenStopNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)] text-[#A855F7] p-2 rounded-lg text-xs mb-3">
        Pro Feature
      </div>
      <SelectField
        label="Trigger Type"
        value={data.trigger}
        options={[
          { value: "PIPS", label: "Fixed Pips" },
          { value: "PERCENTAGE", label: "Profit Percentage" },
          { value: "ATR", label: "ATR-Based" },
        ]}
        onChange={(v) => onChange({ trigger: v as BreakevenTrigger })}
      />
      {data.trigger === "PIPS" && (
        <div>
          <NumberField
            label="Trigger at Profit (pips)"
            value={data.triggerPips}
            min={1}
            max={500}
            onChange={(v) => onChange({ triggerPips: v })}
          />
          <OptimizableFieldCheckbox fieldName="triggerPips" data={data} onChange={onChange} />
        </div>
      )}
      {data.trigger === "PERCENTAGE" && (
        <div>
          <NumberField
            label="Trigger at Profit %"
            value={data.triggerPercent}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ triggerPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="triggerPercent" data={data} onChange={onChange} />
        </div>
      )}
      {data.trigger === "ATR" && (
        <>
          <div>
            <NumberField
              label="ATR Period"
              value={data.triggerAtrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ triggerAtrPeriod: v })}
            />
            <OptimizableFieldCheckbox
              fieldName="triggerAtrPeriod"
              data={data}
              onChange={onChange}
            />
          </div>
          <div>
            <NumberField
              label="ATR Multiplier"
              value={data.triggerAtrMultiplier}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => onChange({ triggerAtrMultiplier: v })}
            />
            <OptimizableFieldCheckbox
              fieldName="triggerAtrMultiplier"
              data={data}
              onChange={onChange}
            />
          </div>
        </>
      )}
      <div>
        <NumberField
          label="Pips above entry"
          value={data.lockPips}
          min={0}
          max={100}
          onChange={(v) => onChange({ lockPips: v })}
        />
        <OptimizableFieldCheckbox fieldName="lockPips" data={data} onChange={onChange} />
      </div>
      {data.trigger === "PIPS" && data.lockPips >= data.triggerPips && (
        <FieldWarning message="Lock pips should be less than trigger pips for breakeven to work" />
      )}
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Moves stop loss to entry price + lock pips when profit target is reached.
      </div>
    </>
  );
}

function TrailingStopFields({
  data,
  onChange,
}: {
  data: TrailingStopNodeData;
  onChange: (updates: Partial<TrailingStopNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)] text-[#A855F7] p-2 rounded-lg text-xs mb-3">
        Pro Feature
      </div>
      <SelectField
        label="Trail Method"
        value={data.method}
        options={[
          { value: "FIXED_PIPS", label: "Fixed Pips" },
          { value: "ATR_BASED", label: "ATR-Based" },
          { value: "PERCENTAGE", label: "Percentage" },
          { value: "INDICATOR", label: "From Indicator (SAR/MA)" },
        ]}
        onChange={(v) => onChange({ method: v as TrailingStopMethod })}
      />
      {data.method === "FIXED_PIPS" && (
        <div>
          <NumberField
            label="Trail Distance (pips)"
            value={data.trailPips}
            min={1}
            max={500}
            onChange={(v) => onChange({ trailPips: v })}
          />
          <OptimizableFieldCheckbox fieldName="trailPips" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "ATR_BASED" && (
        <>
          <div>
            <NumberField
              label="ATR Period"
              value={data.trailAtrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ trailAtrPeriod: v })}
            />
            <OptimizableFieldCheckbox fieldName="trailAtrPeriod" data={data} onChange={onChange} />
          </div>
          <div>
            <NumberField
              label="ATR Multiplier"
              value={data.trailAtrMultiplier}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => onChange({ trailAtrMultiplier: v })}
            />
            <OptimizableFieldCheckbox
              fieldName="trailAtrMultiplier"
              data={data}
              onChange={onChange}
            />
          </div>
        </>
      )}
      {data.method === "PERCENTAGE" && (
        <div>
          <NumberField
            label="Trail Percentage"
            value={data.trailPercent}
            min={1}
            max={100}
            onChange={(v) => onChange({ trailPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="trailPercent" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "INDICATOR" && (
        <div
          className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
          role="note"
        >
          Connect a Parabolic SAR or Moving Average indicator block. The indicator value will be
          used as the trailing stop level.
        </div>
      )}
      <div>
        <NumberField
          label="Start After Profit (pips)"
          value={data.startAfterPips}
          min={0}
          max={500}
          onChange={(v) => onChange({ startAfterPips: v })}
        />
        <OptimizableFieldCheckbox fieldName="startAfterPips" data={data} onChange={onChange} />
      </div>
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Trailing stop follows price movement to lock in profits as the trade moves in your favor.
      </div>
    </>
  );
}

function PartialCloseFields({
  data,
  onChange,
}: {
  data: PartialCloseNodeData;
  onChange: (updates: Partial<PartialCloseNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)] text-[#A855F7] p-2 rounded-lg text-xs mb-3">
        Pro Feature
      </div>
      <div>
        <NumberField
          label="Close Percentage"
          value={data.closePercent}
          min={1}
          max={99}
          onChange={(v) => onChange({ closePercent: v })}
        />
        <OptimizableFieldCheckbox fieldName="closePercent" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="At Profit (pips)"
          value={data.triggerPips}
          min={1}
          max={1000}
          onChange={(v) => onChange({ triggerPips: v })}
        />
        <OptimizableFieldCheckbox fieldName="triggerPips" data={data} onChange={onChange} />
      </div>
      <div className="mt-3">
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.moveSLToBreakeven}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ moveSLToBreakeven: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#A855F7] focus:ring-[#A855F7]"
          />
          Move SL to breakeven after partial close
        </label>
      </div>
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg mt-3"
        role="note"
      >
        Closes a portion of the position at the profit target to secure partial profits.
      </div>
      <div className="text-xs text-[#22D3EE] bg-[rgba(34,211,238,0.05)] border border-[rgba(34,211,238,0.15)] p-3 rounded-lg">
        Add multiple Partial Close blocks for staged exits at different profit levels.
      </div>
    </>
  );
}

function LockProfitFields({
  data,
  onChange,
}: {
  data: LockProfitNodeData;
  onChange: (updates: Partial<LockProfitNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.3)] text-[#A855F7] p-2 rounded-lg text-xs mb-3">
        Pro Feature
      </div>
      <SelectField
        label="Lock Method"
        value={data.method}
        options={[
          { value: "PERCENTAGE", label: "Percentage of Profit" },
          { value: "FIXED_PIPS", label: "Fixed Pips" },
        ]}
        onChange={(v) => onChange({ method: v as LockProfitMethod })}
      />
      {data.method === "PERCENTAGE" && (
        <div>
          <NumberField
            label="Lock Profit %"
            value={data.lockPercent}
            min={1}
            max={99}
            onChange={(v) => onChange({ lockPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="lockPercent" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "FIXED_PIPS" && (
        <div>
          <NumberField
            label="Lock at Pips"
            value={data.lockPips}
            min={1}
            max={500}
            onChange={(v) => onChange({ lockPips: v })}
          />
          <OptimizableFieldCheckbox fieldName="lockPips" data={data} onChange={onChange} />
        </div>
      )}
      <div>
        <NumberField
          label="Check Interval (pips)"
          value={data.checkIntervalPips}
          min={1}
          max={100}
          onChange={(v) => onChange({ checkIntervalPips: v })}
        />
        <OptimizableFieldCheckbox fieldName="checkIntervalPips" data={data} onChange={onChange} />
      </div>
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Automatically adjusts stop loss to lock in a portion of unrealized profit as the trade
        progresses.
      </div>
    </>
  );
}

// ============================================
// NEW INDICATOR FIELD COMPONENTS
// ============================================

function CCIFields({
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
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldWarning message="Overbought level must be higher than oversold level" />
      )}
    </>
  );
}

// ============================================
// TIME EXIT FIELD COMPONENT
// ============================================

function TimeExitFields({
  data,
  onChange,
}: {
  data: TimeExitNodeData;
  onChange: (updates: Partial<TimeExitNodeData>) => void;
}) {
  return (
    <>
      <NumberField
        label="Exit After Bars"
        value={data.exitAfterBars}
        min={1}
        max={1000}
        onChange={(v) => onChange({ exitAfterBars: v })}
      />
      <SelectField
        label="Timeframe"
        value={data.exitTimeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ exitTimeframe: v as Timeframe })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Automatically closes positions after the specified number of bars on the selected timeframe.
      </div>
    </>
  );
}

// ============================================
// ENTRY STRATEGY SHARED SECTIONS
// ============================================

const DIRECTION_OPTIONS = [
  { value: "BOTH", label: "Both (Buy & Sell)" },
  { value: "BUY_ONLY", label: "Buy Only" },
  { value: "SELL_ONLY", label: "Sell Only" },
] as const;

function EntryStrategyPositionSizingSection({
  data,
  onChange,
}: {
  data: EMACrossoverEntryData | RSIReversalEntryData | RangeBreakoutEntryData;
  onChange: (updates: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Position Sizing
        </span>
      </div>
      <SelectField
        label="Sizing Method"
        value={data.sizingMethod}
        options={[
          { value: "FIXED_LOT", label: "Fixed Lot" },
          { value: "RISK_PERCENT", label: "Risk %" },
        ]}
        onChange={(v) => onChange({ sizingMethod: v as PositionSizingMethod })}
      />
      {data.sizingMethod === "FIXED_LOT" && (
        <NumberField
          label="Lot Size"
          value={data.fixedLot}
          min={0.01}
          max={100}
          step={0.01}
          onChange={(v) => onChange({ fixedLot: v })}
        />
      )}
      {data.sizingMethod === "RISK_PERCENT" && (
        <NumberField
          label="Risk %"
          value={data.riskPercent}
          min={0.1}
          max={100}
          step={0.1}
          onChange={(v) => onChange({ riskPercent: v })}
        />
      )}
      <NumberField
        label="Min Lot"
        value={data.minLot}
        min={0.01}
        max={100}
        step={0.01}
        onChange={(v) => onChange({ minLot: v })}
      />
      <NumberField
        label="Max Lot"
        value={data.maxLot}
        min={0.01}
        max={1000}
        step={0.01}
        onChange={(v) => onChange({ maxLot: v })}
      />
      {data.minLot > data.maxLot && <FieldWarning message="Min lot should not exceed max lot" />}
    </>
  );
}

function EntryStrategySLTPSection({
  data,
  onChange,
}: {
  data: EMACrossoverEntryData | RSIReversalEntryData | RangeBreakoutEntryData;
  onChange: (updates: Record<string, unknown>) => void;
}) {
  return (
    <>
      {/* Stop Loss */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Stop Loss
        </span>
      </div>
      <SelectField
        label="SL Method"
        value={data.slMethod}
        options={[
          { value: "FIXED_PIPS", label: "Fixed Pips" },
          { value: "ATR_BASED", label: "ATR-Based" },
        ]}
        onChange={(v) => onChange({ slMethod: v })}
      />
      {data.slMethod === "FIXED_PIPS" && (
        <NumberField
          label="SL Pips"
          value={data.slFixedPips}
          min={1}
          max={1000}
          onChange={(v) => onChange({ slFixedPips: v })}
        />
      )}
      {data.slMethod === "ATR_BASED" && (
        <>
          <NumberField
            label="ATR Period"
            value={data.slAtrPeriod}
            min={1}
            max={500}
            onChange={(v) => onChange({ slAtrPeriod: v })}
          />
          <NumberField
            label="ATR Multiplier"
            value={data.slAtrMultiplier}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => onChange({ slAtrMultiplier: v })}
          />
        </>
      )}

      {/* Take Profit */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Take Profit
        </span>
      </div>
      <SelectField
        label="TP Method"
        value={data.tpMethod}
        options={[
          { value: "FIXED_PIPS", label: "Fixed Pips" },
          { value: "RISK_REWARD", label: "Risk:Reward Ratio" },
          { value: "ATR_BASED", label: "ATR-Based" },
        ]}
        onChange={(v) => onChange({ tpMethod: v })}
      />
      {data.tpMethod === "FIXED_PIPS" && (
        <NumberField
          label="TP Pips"
          value={data.tpFixedPips}
          min={1}
          max={1000}
          onChange={(v) => onChange({ tpFixedPips: v })}
        />
      )}
      {data.tpMethod === "RISK_REWARD" && (
        <NumberField
          label="R:R Ratio"
          value={data.tpRiskRewardRatio}
          min={0.1}
          max={20}
          step={0.1}
          onChange={(v) => onChange({ tpRiskRewardRatio: v })}
        />
      )}
      {data.tpMethod === "ATR_BASED" && (
        <>
          <NumberField
            label="ATR Period"
            value={data.tpAtrPeriod}
            min={1}
            max={500}
            onChange={(v) => onChange({ tpAtrPeriod: v })}
          />
          <NumberField
            label="ATR Multiplier"
            value={data.tpAtrMultiplier}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(v) => onChange({ tpAtrMultiplier: v })}
          />
        </>
      )}
    </>
  );
}

// ============================================
// ENTRY STRATEGY FIELD COMPONENTS
// ============================================

function EMACrossoverEntryFields({
  data,
  onChange,
}: {
  data: EMACrossoverEntryData;
  onChange: (updates: Partial<EMACrossoverEntryData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10B981] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        All-in-one EMA crossover entry with built-in SL/TP
      </div>

      {/* Strategy Settings */}
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <NumberField
        label="Fast Period"
        value={data.fastPeriod}
        min={1}
        max={500}
        onChange={(v) => onChange({ fastPeriod: v })}
      />
      <NumberField
        label="Slow Period"
        value={data.slowPeriod}
        min={1}
        max={500}
        onChange={(v) => onChange({ slowPeriod: v })}
      />
      {data.fastPeriod >= data.slowPeriod && (
        <FieldWarning message="Fast period should be smaller than slow period" />
      )}
      <SelectField
        label="Signal Mode"
        value={data.signalMode}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as EMACrossoverEntryData["signalMode"] })}
      />

      {/* Direction */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Direction
        </span>
      </div>
      <SelectField
        label="Trade Direction"
        value={data.direction}
        options={[...DIRECTION_OPTIONS]}
        onChange={(v) => onChange({ direction: v as EMACrossoverEntryData["direction"] })}
      />

      <EntryStrategyPositionSizingSection data={data} onChange={onChange} />
      <EntryStrategySLTPSection data={data} onChange={onChange} />
    </>
  );
}

function RSIReversalEntryFields({
  data,
  onChange,
}: {
  data: RSIReversalEntryData;
  onChange: (updates: Partial<RSIReversalEntryData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10B981] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        All-in-one RSI reversal entry with built-in SL/TP
      </div>

      {/* Strategy Settings */}
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <NumberField
        label="RSI Period"
        value={data.period}
        min={1}
        max={500}
        onChange={(v) => onChange({ period: v })}
      />
      <NumberField
        label="Overbought Level"
        value={data.overboughtLevel}
        min={50}
        max={100}
        onChange={(v) => onChange({ overboughtLevel: v })}
      />
      <NumberField
        label="Oversold Level"
        value={data.oversoldLevel}
        min={0}
        max={50}
        onChange={(v) => onChange({ oversoldLevel: v })}
      />
      {data.overboughtLevel <= data.oversoldLevel && (
        <FieldWarning message="Overbought level must be higher than oversold level" />
      )}
      <SelectField
        label="Signal Mode"
        value={data.signalMode}
        options={[...SIGNAL_MODE_OPTIONS]}
        onChange={(v) => onChange({ signalMode: v as RSIReversalEntryData["signalMode"] })}
      />

      {/* Direction */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Direction
        </span>
      </div>
      <SelectField
        label="Trade Direction"
        value={data.direction}
        options={[...DIRECTION_OPTIONS]}
        onChange={(v) => onChange({ direction: v as RSIReversalEntryData["direction"] })}
      />

      <EntryStrategyPositionSizingSection data={data} onChange={onChange} />
      <EntryStrategySLTPSection data={data} onChange={onChange} />
    </>
  );
}

function RangeBreakoutEntryFields({
  data,
  onChange,
}: {
  data: RangeBreakoutEntryData;
  onChange: (updates: Partial<RangeBreakoutEntryData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10B981] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        All-in-one range breakout entry with built-in SL/TP
      </div>

      {/* Strategy Settings */}
      <SelectField
        label="Timeframe"
        value={data.timeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ timeframe: v as Timeframe })}
      />
      <SelectField
        label="Range Type"
        value={data.rangeType}
        options={RANGE_TYPE_OPTIONS}
        onChange={(v) => onChange({ rangeType: v as RangeType })}
      />
      {data.rangeType === "PREVIOUS_CANDLES" && (
        <NumberField
          label="Lookback Candles"
          value={data.lookbackCandles}
          min={2}
          max={500}
          onChange={(v) => onChange({ lookbackCandles: v })}
        />
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
        </div>
      )}
      <SelectField
        label="Breakout Direction"
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
      <NumberField
        label="Buffer (pips)"
        value={data.bufferPips}
        min={0}
        max={50}
        onChange={(v) => onChange({ bufferPips: v })}
      />
      <NumberField
        label="Min Range (pips)"
        value={data.minRangePips}
        min={0}
        max={500}
        onChange={(v) => onChange({ minRangePips: v })}
      />
      <NumberField
        label="Max Range (pips, 0=no limit)"
        value={data.maxRangePips}
        min={0}
        max={1000}
        onChange={(v) => onChange({ maxRangePips: v })}
      />
      {data.maxRangePips > 0 && data.minRangePips > data.maxRangePips && (
        <FieldWarning message="Min range should not exceed max range" />
      )}

      {/* Direction */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
          Direction
        </span>
      </div>
      <SelectField
        label="Trade Direction"
        value={data.direction}
        options={[...DIRECTION_OPTIONS]}
        onChange={(v) => onChange({ direction: v as RangeBreakoutEntryData["direction"] })}
      />

      <EntryStrategyPositionSizingSection data={data} onChange={onChange} />
      <EntryStrategySLTPSection data={data} onChange={onChange} />
    </>
  );
}
