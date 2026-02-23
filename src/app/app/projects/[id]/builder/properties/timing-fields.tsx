"use client";

import { SelectField, NumberField, TimeField } from "../components/form-fields";
import type {
  TradingSessionNodeData,
  TradingSession,
  AlwaysNodeData,
  CustomTimesNodeData,
  TimeSlot,
  MaxSpreadNodeData,
  VolatilityFilterNodeData,
  VolumeFilterNodeData,
  VolumeFilterMode,
  FridayCloseFilterNodeData,
  NewsFilterNodeData,
  TradingDays,
  Timeframe,
} from "@/types/builder";
import { SESSION_TIMES } from "@/types/builder";
import { TRADING_SESSION_OPTIONS, DAY_LABELS, TIMEFRAME_OPTIONS } from "./constants";
import { OptimizableFieldCheckbox } from "./shared";

export function TradingSessionFields({
  data,
  onChange,
}: {
  data: TradingSessionNodeData;
  onChange: (updates: Partial<TradingSessionNodeData>) => void;
}) {
  const sessionInfo = SESSION_TIMES[data.session];
  const isCustom = data.session === "CUSTOM";

  return (
    <>
      <SelectField
        label="Session"
        value={data.session}
        options={TRADING_SESSION_OPTIONS}
        onChange={(v) => onChange({ session: v as TradingSession })}
      />
      {isCustom ? (
        <div className="space-y-2">
          <TimeField
            label="Start Time"
            hour={data.customStartHour ?? 8}
            minute={data.customStartMinute ?? 0}
            onHourChange={(h) => onChange({ customStartHour: h })}
            onMinuteChange={(m) => onChange({ customStartMinute: m })}
          />
          <TimeField
            label="End Time"
            hour={data.customEndHour ?? 17}
            minute={data.customEndMinute ?? 0}
            onHourChange={(h) => onChange({ customEndHour: h })}
            onMinuteChange={(m) => onChange({ customEndMinute: m })}
          />
        </div>
      ) : (
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
      )}
      <TradingDaysCheckboxes
        days={
          data.tradingDays ?? {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          }
        }
        onChange={(days) => onChange({ tradingDays: days })}
      />
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
          Session times will be compared against GMT (TimeGMT) instead of your broker&apos;s server
          clock.
        </div>
      )}
    </>
  );
}

export function AlwaysFields({
  data,
  onChange,
}: {
  data: AlwaysNodeData;
  onChange: (updates: Partial<AlwaysNodeData>) => void;
}) {
  void onChange; // nothing to configure
  void data;
  return (
    <div
      className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
      role="note"
    >
      This node enables trading at all times with no time filter. The EA will evaluate entry
      conditions on every tick regardless of the time of day or day of the week.
    </div>
  );
}

export function CustomTimesFields({
  data,
  onChange,
}: {
  data: CustomTimesNodeData;
  onChange: (updates: Partial<CustomTimesNodeData>) => void;
}) {
  const timeSlots = data.timeSlots ?? [];

  function handleSlotChange(index: number, field: keyof TimeSlot, value: number): void {
    const updated = timeSlots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
    onChange({ timeSlots: updated });
  }

  function handleAddSlot(): void {
    onChange({
      timeSlots: [...timeSlots, { startHour: 8, startMinute: 0, endHour: 17, endMinute: 0 }],
    });
  }

  function handleRemoveSlot(index: number): void {
    onChange({ timeSlots: timeSlots.filter((_, i) => i !== index) });
  }

  return (
    <>
      <div className="space-y-3">
        <span className="text-xs font-medium text-[#CBD5E1]">Time Slots</span>
        {timeSlots.map((slot, index) => (
          <div
            key={index}
            className="bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-[#7C8DB0]">Slot {index + 1}</span>
              {timeSlots.length > 1 && (
                <button
                  onClick={() => handleRemoveSlot(index)}
                  className="text-[#EF4444] hover:text-[#F87171] p-0.5 rounded transition-colors"
                  aria-label={`Remove time slot ${index + 1}`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-end gap-2">
              <TimeField
                label="Start"
                hour={slot.startHour}
                minute={slot.startMinute}
                onHourChange={(h) => handleSlotChange(index, "startHour", h)}
                onMinuteChange={(m) => handleSlotChange(index, "startMinute", m)}
              />
              <span className="text-[#7C8DB0] text-xs pb-2">to</span>
              <TimeField
                label="End"
                hour={slot.endHour}
                minute={slot.endMinute}
                onHourChange={(h) => handleSlotChange(index, "endHour", h)}
                onMinuteChange={(m) => handleSlotChange(index, "endMinute", m)}
              />
            </div>
          </div>
        ))}
        <button
          onClick={handleAddSlot}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#22D3EE] bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.2)] rounded-lg hover:bg-[rgba(34,211,238,0.15)] transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
          Add Time Slot
        </button>
      </div>
      <TradingDaysCheckboxes
        days={
          data.days ?? {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          }
        }
        onChange={(days) => onChange({ days })}
      />
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
          Close trades outside time slots
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
    </>
  );
}

export function MaxSpreadFields({
  data,
  onChange,
}: {
  data: MaxSpreadNodeData;
  onChange: (updates: Partial<MaxSpreadNodeData>) => void;
}) {
  return (
    <div>
      <NumberField
        label="Max Spread (pips)"
        value={data.maxSpreadPips}
        min={1}
        max={100}
        step={1}
        onChange={(v) => onChange({ maxSpreadPips: v })}
        tooltip="The EA will only open trades when the broker spread is below this value. Prevents entries during low-liquidity periods."
      />
      <OptimizableFieldCheckbox fieldName="maxSpreadPips" data={data} onChange={onChange} />
    </div>
  );
}

export function VolatilityFilterFields({
  data,
  onChange,
}: {
  data: VolatilityFilterNodeData;
  onChange: (updates: Partial<VolatilityFilterNodeData>) => void;
}) {
  return (
    <>
      <div>
        <NumberField
          label="ATR Period"
          value={data.atrPeriod}
          min={1}
          max={1000}
          step={1}
          onChange={(v) => onChange({ atrPeriod: v })}
          tooltip="Number of candles used to calculate Average True Range. 14 is the standard setting."
        />
        <OptimizableFieldCheckbox fieldName="atrPeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <SelectField
          label="ATR Timeframe"
          value={data.atrTimeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={(v) => onChange({ atrTimeframe: v as Timeframe })}
        />
        <OptimizableFieldCheckbox fieldName="atrTimeframe" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Min ATR (pips)"
          value={data.minAtrPips}
          min={0}
          max={10000}
          step={1}
          onChange={(v) => onChange({ minAtrPips: v })}
        />
        <p className="text-[10px] text-[#7C8DB0] mt-0.5">0 = no minimum</p>
        <OptimizableFieldCheckbox fieldName="minAtrPips" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Max ATR (pips)"
          value={data.maxAtrPips}
          min={0}
          max={10000}
          step={1}
          onChange={(v) => onChange({ maxAtrPips: v })}
        />
        <p className="text-[10px] text-[#7C8DB0] mt-0.5">0 = no maximum</p>
        <OptimizableFieldCheckbox fieldName="maxAtrPips" data={data} onChange={onChange} />
      </div>
    </>
  );
}

const VOLUME_FILTER_MODE_OPTIONS: { value: VolumeFilterMode; label: string }[] = [
  { value: "ABOVE_AVERAGE", label: "Above Average" },
  { value: "BELOW_AVERAGE", label: "Below Average" },
  { value: "SPIKE", label: "Volume Spike" },
];

export function VolumeFilterFields({
  data,
  onChange,
}: {
  data: VolumeFilterNodeData;
  onChange: (updates: Partial<VolumeFilterNodeData>) => void;
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
          label="Volume SMA Period"
          value={data.volumePeriod}
          min={1}
          max={500}
          step={1}
          onChange={(v) => onChange({ volumePeriod: v })}
          tooltip="Number of bars used to calculate average volume. 20 is the standard setting."
        />
        <OptimizableFieldCheckbox fieldName="volumePeriod" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Volume Multiplier"
          value={data.volumeMultiplier}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ volumeMultiplier: v })}
          tooltip="Current volume must exceed average * multiplier to pass the filter."
        />
        <OptimizableFieldCheckbox fieldName="volumeMultiplier" data={data} onChange={onChange} />
      </div>
      <SelectField
        label="Filter Mode"
        value={data.filterMode}
        options={VOLUME_FILTER_MODE_OPTIONS}
        onChange={(v) => onChange({ filterMode: v as VolumeFilterMode })}
        tooltip="Above Average: only trade when volume is high. Below Average: only trade during quiet periods. Spike: detect sudden volume surges."
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Filters entries based on volume relative to its moving average. High volume confirms
        breakouts and trend strength.
      </div>
    </>
  );
}

export function FridayCloseFields({
  data,
  onChange,
}: {
  data: FridayCloseFilterNodeData;
  onChange: (updates: Partial<FridayCloseFilterNodeData>) => void;
}) {
  const hour = data.closeHour ?? 17;
  const minute = data.closeMinute ?? 0;
  return (
    <>
      <div>
        <TimeField
          label="Close Time"
          hour={hour}
          minute={minute}
          onHourChange={(h) => onChange({ closeHour: h })}
          onMinuteChange={(m) => onChange({ closeMinute: m })}
        />
        <OptimizableFieldCheckbox fieldName="closeHour" data={data} onChange={onChange} />
        <OptimizableFieldCheckbox fieldName="closeMinute" data={data} onChange={onChange} />
      </div>
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
        Use GMT instead of server time
      </label>
      <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
        <input
          type="checkbox"
          checked={data.closePending ?? true}
          onChange={(e) => {
            e.stopPropagation();
            onChange({ closePending: e.target.checked });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
        />
        Also cancel pending orders
      </label>
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Closes all positions and blocks new entries on Friday after {String(hour).padStart(2, "0")}:
        {String(minute).padStart(2, "0")} ({(data.useServerTime ?? true) ? "Server Time" : "GMT"})
      </div>
    </>
  );
}

export function NewsFilterFields({
  data,
  onChange,
}: {
  data: NewsFilterNodeData;
  onChange: (updates: Partial<NewsFilterNodeData>) => void;
}) {
  const impacts: string[] = [];
  if (data.highImpact) impacts.push("High");
  if (data.mediumImpact) impacts.push("Medium");
  if (data.lowImpact) impacts.push("Low");

  return (
    <>
      <div>
        <NumberField
          label="Hours Before News"
          value={data.hoursBefore}
          min={0}
          max={24}
          step={0.25}
          onChange={(v) => onChange({ hoursBefore: Math.round(v * 100) / 100 })}
        />
        <OptimizableFieldCheckbox fieldName="hoursBefore" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Hours After News"
          value={data.hoursAfter}
          min={0}
          max={24}
          step={0.25}
          onChange={(v) => onChange({ hoursAfter: Math.round(v * 100) / 100 })}
        />
        <OptimizableFieldCheckbox fieldName="hoursAfter" data={data} onChange={onChange} />
      </div>
      <div className="mt-2 space-y-1.5">
        <span className="text-xs font-medium text-[#CBD5E1]">Impact Levels</span>
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.highImpact}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ highImpact: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          High Impact
        </label>
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.mediumImpact}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ mediumImpact: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Medium Impact
        </label>
        <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={data.lowImpact}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ lowImpact: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          Low Impact
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer mt-2">
        <input
          type="checkbox"
          checked={data.closePositions}
          onChange={(e) => {
            e.stopPropagation();
            onChange({ closePositions: e.target.checked });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
        />
        Close open positions during news
      </label>
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Blocks new entries {data.hoursBefore}h before and {data.hoursAfter}h after{" "}
        {impacts.length > 0 ? impacts.join(", ") : "no"} impact news events.
        {data.closePositions ? " Also closes open positions during news windows." : ""} Live trading
        uses the MQL5 Calendar API. Backtesting uses embedded static data.
      </div>
      <div
        className="text-xs text-[#FBBF24] bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)] p-3 rounded-lg"
        role="alert"
      >
        The embedded news calendar data is generated at the time of EA export. If you need
        up-to-date events for backtesting, re-export the EA to refresh the data.
      </div>
    </>
  );
}

function TradingDaysCheckboxes({
  days,
  onChange,
}: {
  days: TradingDays;
  onChange: (days: TradingDays) => void;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      <span className="text-xs font-medium text-[#CBD5E1]">Trading Days</span>
      {DAY_LABELS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
          <input
            type="checkbox"
            checked={days[key]}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ ...days, [key]: e.target.checked });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
          />
          {label}
        </label>
      ))}
    </div>
  );
}
