"use client";

import { createContext, useContext, useState } from "react";
import type { BuilderNodeData } from "@/types/builder";

const OptimizationVisibleContext = createContext(false);

export function OptimizableFieldCheckbox<T extends BuilderNodeData>({
  fieldName,
  data,
  onChange,
}: {
  fieldName: string;
  data: T;
  onChange: (updates: Partial<T>) => void;
}) {
  const visible = useContext(OptimizationVisibleContext);
  if (!visible) return null;

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
      <span
        className="flex items-center gap-1"
        title="Let MetaTrader 5 automatically test different values for this setting during backtesting"
      >
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

export { OptimizationVisibleContext };

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

export function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-1.5 text-[#EF4444] text-[11px]" role="alert">
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
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
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
  hint,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
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
      {hint && <p className="text-[10px] text-[#7C8DB0] mt-0.5 ml-5">{hint}</p>}
      {checked && children && <div className="mt-2 ml-5 space-y-2">{children}</div>}
    </div>
  );
}

export function AdvancedToggleSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
      >
        <svg
          className={`w-3 h-3 text-[#94A3B8] transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Advanced</span>
        <span className="text-[10px] text-[#64748B]">— Optional</span>
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}
