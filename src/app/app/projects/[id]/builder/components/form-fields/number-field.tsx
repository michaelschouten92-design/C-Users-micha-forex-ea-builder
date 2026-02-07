"use client";

import { useId, useState, useEffect, memo } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export const NumberField = memo(function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: NumberFieldProps) {
  const inputId = useId();
  const [localValue, setLocalValue] = useState(String(value));

  // Sync from parent when value changes externally
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-xs font-medium text-[#CBD5E1] mb-1"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        value={localValue}
        min={min}
        max={max}
        step={step}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onChange={(e) => {
          e.stopPropagation();
          const raw = e.target.value;
          setLocalValue(raw);
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            onChange(num);
          }
        }}
        onBlur={() => {
          const num = parseFloat(localValue);
          if (isNaN(num) || localValue === "") {
            setLocalValue(String(min));
            onChange(min);
          } else {
            const clamped = Math.min(max, Math.max(min, num));
            setLocalValue(String(clamped));
            if (clamped !== num) onChange(clamped);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
      />
    </div>
  );
});
