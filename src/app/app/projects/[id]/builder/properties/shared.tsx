"use client";

import { SelectField } from "../components/form-fields";
import type { BuilderNodeData, EntryDirection, EntrySlMethod } from "@/types/builder";
import { NumberField } from "../components/form-fields";
import { DIRECTION_OPTIONS, BASE_SL_OPTIONS } from "./constants";

export function OptimizableFieldCheckbox<T extends BuilderNodeData>({
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
        Optimize in MT5
      </span>
    </label>
  );
}

export function FieldWarning({ message }: { message: string }) {
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

export function ToggleField({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.checked);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#10B981] focus:ring-[#10B981]"
        />
        {label}
      </label>
      {checked && children && <div className="mt-2 ml-5 space-y-2">{children}</div>}
    </div>
  );
}

export function DirectionSelector({
  direction,
  onChange,
}: {
  direction: EntryDirection;
  onChange: (v: EntryDirection) => void;
}) {
  return (
    <SelectField
      label="Direction"
      value={direction}
      options={DIRECTION_OPTIONS}
      onChange={(v) => onChange(v as EntryDirection)}
    />
  );
}

export function AdvancedToggleSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
      <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Advanced</span>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export function EntryStrategyRiskSection<T extends BuilderNodeData>({
  data,
  onChange,
  slOptions,
}: {
  data: T & {
    riskPercent: number;
    slMethod?: EntrySlMethod;
    slFixedPips?: number;
    slPercent?: number;
    slAtrMultiplier: number;
    tpRMultiple: number;
  };
  onChange: (updates: Partial<T>) => void;
  slOptions?: { value: EntrySlMethod; label: string }[];
}) {
  const slMethod = data.slMethod ?? "ATR";
  const options = slOptions ?? BASE_SL_OPTIONS;

  return (
    <>
      <NumberField
        label="Risk %"
        value={data.riskPercent}
        min={0.1}
        max={10}
        step={0.1}
        onChange={(v) => onChange({ riskPercent: v } as Partial<T>)}
      />
      <OptimizableFieldCheckbox fieldName="riskPercent" data={data} onChange={onChange} />

      <SelectField
        label="Stop Loss Method"
        value={slMethod}
        options={options}
        onChange={(v) => onChange({ slMethod: v } as Partial<T>)}
      />
      {slMethod === "RANGE_OPPOSITE" && (
        <p className="text-[11px] text-[#94A3B8] -mt-1">
          SL at the opposite side of the range. Buy: SL = range low. Sell: SL = range high. Lot size
          calculated from risk %.
        </p>
      )}
      {slMethod === "ATR" && (
        <>
          <NumberField
            label="ATR Multiplier"
            value={data.slAtrMultiplier}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => onChange({ slAtrMultiplier: v } as Partial<T>)}
          />
          <OptimizableFieldCheckbox fieldName="slAtrMultiplier" data={data} onChange={onChange} />
        </>
      )}
      {slMethod === "PIPS" && (
        <>
          <NumberField
            label="Stop Loss (Pips)"
            value={data.slFixedPips ?? 50}
            min={1}
            max={10000}
            step={1}
            onChange={(v) => onChange({ slFixedPips: v } as Partial<T>)}
          />
          <OptimizableFieldCheckbox fieldName="slFixedPips" data={data} onChange={onChange} />
        </>
      )}
      {slMethod === "PERCENT" && (
        <>
          <NumberField
            label="Stop Loss (%)"
            value={data.slPercent ?? 1}
            min={0.01}
            max={50}
            step={0.1}
            onChange={(v) => onChange({ slPercent: v } as Partial<T>)}
          />
          <OptimizableFieldCheckbox fieldName="slPercent" data={data} onChange={onChange} />
        </>
      )}

      <NumberField
        label="Take Profit (R)"
        value={data.tpRMultiple}
        min={0.1}
        max={10}
        step={0.1}
        onChange={(v) => onChange({ tpRMultiple: v } as Partial<T>)}
      />
      <OptimizableFieldCheckbox fieldName="tpRMultiple" data={data} onChange={onChange} />
    </>
  );
}
