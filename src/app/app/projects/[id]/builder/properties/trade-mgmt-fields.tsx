"use client";

import { SelectField, NumberField } from "../components/form-fields";
import type {
  BreakevenStopNodeData,
  TrailingStopNodeData,
  PartialCloseNodeData,
  LockProfitNodeData,
  MultiLevelTPNodeData,
  BreakevenTrigger,
  TrailingStopMethod,
  LockProfitMethod,
  MoveSLAfterTP,
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
        tooltip="When to move your stop loss to breakeven. Fixed Pips is the simplest option."
      />
      {data.trigger === "PIPS" && (
        <div>
          <NumberField
            label="Trigger at Profit (pips)"
            value={data.triggerPips}
            min={1}
            max={500}
            onChange={(v) => onChange({ triggerPips: v })}
            tooltip="Move SL to breakeven after the trade is this many pips in profit"
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
            tooltip="Move SL to breakeven after profit reaches this percentage of your account"
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
              tooltip="Number of candles used to calculate average price movement. 14 is the standard setting."
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
              tooltip="Trigger breakeven after profit equals this multiple of the average price movement (ATR)"
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
          tooltip="After breakeven triggers, place the SL this many pips above your entry price. Use 0 for exact breakeven."
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
        ]}
        onChange={(v) => onChange({ method: v as TrailingStopMethod })}
        tooltip="How the trailing distance is calculated. Fixed Pips is the simplest option."
      />
      {data.method === "FIXED_PIPS" && (
        <div>
          <NumberField
            label="Trail Distance (pips)"
            value={data.trailPips}
            min={1}
            max={500}
            onChange={(v) => onChange({ trailPips: v })}
            tooltip="The stop loss stays this many pips behind the highest profit point"
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
              tooltip="Number of candles used to calculate average price movement. 14 is the standard setting."
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
              tooltip="Trail distance as a multiple of the average price movement (ATR)"
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
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ trailPercent: v })}
            tooltip="Trail distance as a percentage of the current price"
          />
          <OptimizableFieldCheckbox fieldName="trailPercent" data={data} onChange={onChange} />
        </div>
      )}
      <div>
        <NumberField
          label="Start After Profit (pips)"
          value={data.startAfterPips}
          min={0}
          max={500}
          onChange={(v) => onChange({ startAfterPips: v })}
          tooltip="Only start trailing after the trade reaches this many pips in profit. Use 0 to start immediately."
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
          tooltip="How much of your position to close when the profit target is reached (e.g. 50% = close half)"
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
            tooltip="Close the partial position after the trade reaches this many pips in profit"
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
            tooltip="Close the partial position after profit reaches this percentage of your account"
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
        tooltip="How to calculate the locked profit level. Percentage locks a % of your current profit, Fixed Pips locks a fixed distance."
      />
      {data.method === "PERCENTAGE" && (
        <div>
          <NumberField
            label="Lock Profit %"
            value={data.lockPercent}
            min={1}
            max={99}
            onChange={(v) => onChange({ lockPercent: v })}
            tooltip="Move the SL to lock in this percentage of your current unrealized profit"
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
            tooltip="Move the SL to lock in this many pips of profit"
          />
          <OptimizableFieldCheckbox fieldName="lockPips" data={data} onChange={onChange} />
        </div>
      )}
      <div>
        <NumberField
          label="Min Profit Threshold (pips)"
          value={data.checkIntervalPips}
          min={1}
          max={100}
          onChange={(v) => onChange({ checkIntervalPips: v })}
          tooltip="Only start locking profit after the trade reaches at least this many pips in profit"
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

export function MultiLevelTPFields({
  data,
  onChange,
}: {
  data: MultiLevelTPNodeData;
  onChange: (updates: Partial<MultiLevelTPNodeData>) => void;
}) {
  const totalPercent = data.tp1Percent + data.tp2Percent + data.tp3Percent;

  return (
    <>
      <p className="text-xs font-medium text-[#CBD5E1] -mb-2">TP Level 1</p>
      <div>
        <NumberField
          label="TP1 Distance (pips)"
          value={data.tp1Pips}
          min={1}
          max={10000}
          onChange={(v) => onChange({ tp1Pips: v })}
          tooltip="Distance in pips from entry to first take profit level"
        />
        <OptimizableFieldCheckbox fieldName="tp1Pips" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="TP1 Close %"
          value={data.tp1Percent}
          min={1}
          max={98}
          onChange={(v) => onChange({ tp1Percent: v })}
          tooltip="Percentage of the position to close at TP1"
        />
        <OptimizableFieldCheckbox fieldName="tp1Percent" data={data} onChange={onChange} />
      </div>

      <p className="text-xs font-medium text-[#CBD5E1] -mb-2">TP Level 2</p>
      <div>
        <NumberField
          label="TP2 Distance (pips)"
          value={data.tp2Pips}
          min={1}
          max={10000}
          onChange={(v) => onChange({ tp2Pips: v })}
          tooltip="Distance in pips from entry to second take profit level"
        />
        <OptimizableFieldCheckbox fieldName="tp2Pips" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="TP2 Close %"
          value={data.tp2Percent}
          min={1}
          max={98}
          onChange={(v) => onChange({ tp2Percent: v })}
          tooltip="Percentage of the position to close at TP2"
        />
        <OptimizableFieldCheckbox fieldName="tp2Percent" data={data} onChange={onChange} />
      </div>

      <p className="text-xs font-medium text-[#CBD5E1] -mb-2">TP Level 3</p>
      <div>
        <NumberField
          label="TP3 Distance (pips)"
          value={data.tp3Pips}
          min={1}
          max={10000}
          onChange={(v) => onChange({ tp3Pips: v })}
          tooltip="Distance in pips from entry to final take profit level — closes all remaining"
        />
        <OptimizableFieldCheckbox fieldName="tp3Pips" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="TP3 Close %"
          value={data.tp3Percent}
          min={1}
          max={100}
          onChange={(v) => onChange({ tp3Percent: v })}
          tooltip="Percentage of the position to close at TP3 (remainder)"
        />
        <OptimizableFieldCheckbox fieldName="tp3Percent" data={data} onChange={onChange} />
      </div>

      {totalPercent !== 100 && (
        <FieldWarning message={`Close percentages add up to ${totalPercent}% (should be 100%)`} />
      )}

      <SelectField
        label="After TP1 Hit"
        value={data.moveSLAfterTP1}
        options={[
          { value: "BREAKEVEN", label: "Move SL to Breakeven" },
          { value: "TRAIL", label: "Start Trailing Stop" },
          { value: "NONE", label: "No SL Change" },
        ]}
        onChange={(v) => onChange({ moveSLAfterTP1: v as MoveSLAfterTP })}
        tooltip="What to do with the stop loss after the first take profit level is hit"
      />

      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Closes portions of your position at three different profit levels. Secures partial profits
        while letting the remainder run to higher targets.
      </div>
    </>
  );
}
