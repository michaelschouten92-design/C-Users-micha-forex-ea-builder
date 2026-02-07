"use client";

import { useId, useState, useEffect } from "react";

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value as T);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: NumberFieldProps) {
  const id = useId();
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={localValue}
        min={min}
        max={max}
        step={step}
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
}

interface TimeFieldProps {
  label: string;
  hour: number;
  minute: number;
  onHourChange: (value: number) => void;
  onMinuteChange: (value: number) => void;
}

export function TimeField({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: TimeFieldProps) {
  const hourId = useId();
  const minuteId = useId();

  return (
    <div className="flex-1">
      <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={hourId}
          type="number"
          value={hour}
          min={0}
          max={23}
          onChange={(e) => {
            e.stopPropagation();
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 0 && val <= 23) {
              onHourChange(val);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-14 px-2 py-1.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={`${label} hour`}
        />
        <span className="text-[#64748B]">:</span>
        <input
          id={minuteId}
          type="number"
          value={minute.toString().padStart(2, "0")}
          min={0}
          max={59}
          onChange={(e) => {
            e.stopPropagation();
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 0 && val <= 59) {
              onMinuteChange(val);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-14 px-2 py-1.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={`${label} minute`}
        />
      </div>
    </div>
  );
}
