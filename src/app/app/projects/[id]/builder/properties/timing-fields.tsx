"use client";

import { SelectField, NumberField, TimeField } from "../components/form-fields";
import type {
  TradingSessionNodeData,
  TradingSession,
  AlwaysNodeData,
  MaxSpreadNodeData,
  VolatilityFilterNodeData,
  FridayCloseFilterNodeData,
  NewsFilterNodeData,
  CustomTimesNodeData,
  TradingDays,
  TimeSlot,
  Timeframe,
} from "@/types/builder";
import { SESSION_TIMES } from "@/types/builder";
import { TRADING_SESSION_OPTIONS, DAY_LABELS, TIMEFRAME_OPTIONS } from "./constants";

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
  return (
    <div
      className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
      role="note"
    >
      Trading is enabled at all times. No time restrictions apply.
    </div>
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
    <NumberField
      label="Max Spread (pips)"
      value={data.maxSpreadPips}
      min={1}
      max={100}
      step={1}
      onChange={(v) => onChange({ maxSpreadPips: v })}
    />
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
      <NumberField
        label="ATR Period"
        value={data.atrPeriod}
        min={1}
        max={1000}
        step={1}
        onChange={(v) => onChange({ atrPeriod: v })}
      />
      <SelectField
        label="ATR Timeframe"
        value={data.atrTimeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ atrTimeframe: v as Timeframe })}
      />
      <div>
        <NumberField
          label="Min ATR (pips)"
          value={data.minAtrPips}
          min={0}
          max={10000}
          step={1}
          onChange={(v) => onChange({ minAtrPips: v })}
        />
        <p className="text-[10px] text-[#64748B] mt-0.5">0 = no minimum</p>
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
        <p className="text-[10px] text-[#64748B] mt-0.5">0 = no maximum</p>
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
      <TimeField
        label="Close Time"
        hour={hour}
        minute={minute}
        onHourChange={(h) => onChange({ closeHour: h })}
        onMinuteChange={(m) => onChange({ closeMinute: m })}
      />
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
      <NumberField
        label="Minutes Before News"
        value={data.minutesBefore}
        min={0}
        max={240}
        step={5}
        onChange={(v) => onChange({ minutesBefore: v })}
      />
      <NumberField
        label="Minutes After News"
        value={data.minutesAfter}
        min={0}
        max={240}
        step={5}
        onChange={(v) => onChange({ minutesAfter: v })}
      />
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
        Blocks new entries {data.minutesBefore}min before and {data.minutesAfter}min after{" "}
        {impacts.length > 0 ? impacts.join(", ") : "no"} impact news events.
        {data.closePositions ? " Also closes open positions during news windows." : ""} CSV is
        auto-updated every time the EA runs on a live chart.
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

export function CustomTimesFields({
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
