"use client";

import { SelectField, NumberField } from "../components/form-fields";
import type {
  BreakevenStopNodeData,
  TrailingStopNodeData,
  PartialCloseNodeData,
  LockProfitNodeData,
  BreakevenTrigger,
  TrailingStopMethod,
  LockProfitMethod,
} from "@/types/builder";
import { OptimizableFieldCheckbox, FieldWarning } from "./shared";

export function BreakevenStopFields({
  data,
  onChange,
}: {
  data: BreakevenStopNodeData;
  onChange: (updates: Partial<BreakevenStopNodeData>) => void;
}) {
  return (
    <>
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

export function TrailingStopFields({
  data,
  onChange,
}: {
  data: TrailingStopNodeData;
  onChange: (updates: Partial<TrailingStopNodeData>) => void;
}) {
  return (
    <>
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

export function PartialCloseFields({
  data,
  onChange,
}: {
  data: PartialCloseNodeData;
  onChange: (updates: Partial<PartialCloseNodeData>) => void;
}) {
  return (
    <>
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
      <SelectField
        label="Trigger Type"
        value={data.triggerMethod ?? "PIPS"}
        options={[
          { value: "PIPS", label: "Profit in Pips" },
          { value: "PERCENT", label: "Profit in %" },
        ]}
        onChange={(v) => onChange({ triggerMethod: v as "PIPS" | "PERCENT" })}
      />
      {(data.triggerMethod ?? "PIPS") === "PIPS" ? (
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
      ) : (
        <div>
          <NumberField
            label="At Profit (%)"
            value={data.triggerPercent ?? 1}
            min={0.01}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ triggerPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="triggerPercent" data={data} onChange={onChange} />
        </div>
      )}
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

export function LockProfitFields({
  data,
  onChange,
}: {
  data: LockProfitNodeData;
  onChange: (updates: Partial<LockProfitNodeData>) => void;
}) {
  return (
    <>
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
