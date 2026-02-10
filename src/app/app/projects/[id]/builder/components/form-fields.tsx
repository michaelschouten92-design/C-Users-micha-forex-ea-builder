"use client";

import { useId, useState, useEffect } from "react";

function TooltipIcon({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center ml-1 cursor-help" title={text}>
      <svg
        className="w-3.5 h-3.5 text-[#64748B] hover:text-[#94A3B8] transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </span>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  tooltip?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  tooltip,
}: SelectFieldProps<T>) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
        {tooltip && <TooltipIcon text={tooltip} />}
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
  tooltip?: string;
}

export function NumberField({
  label,
  value,
  min = 0,
  max = Infinity,
  step = 1,
  onChange,
  tooltip,
}: NumberFieldProps) {
  const id = useId();
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const increment = () => {
    const num = parseFloat(localValue);
    const next = isNaN(num) ? min : Math.min(max, num + step);
    setLocalValue(String(next));
    onChange(next);
  };

  const decrement = () => {
    const num = parseFloat(localValue);
    const next = isNaN(num) ? min : Math.max(min, num - step);
    setLocalValue(String(next));
    onChange(next);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
        {tooltip && <TooltipIcon text={tooltip} />}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            decrement();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[#1E293B] border border-[rgba(79,70,229,0.3)] text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.5)] transition-all duration-200"
          aria-label={`Decrease ${label}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
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
          className="flex-1 min-w-0 px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            increment();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[#1E293B] border border-[rgba(79,70,229,0.3)] text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.5)] transition-all duration-200"
          aria-label={`Increase ${label}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface TimeFieldProps {
  label: string;
  hour: number;
  minute: number;
  onHourChange: (value: number) => void;
  onMinuteChange: (value: number) => void;
  tooltip?: string;
}

export function TimeField({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  tooltip,
}: TimeFieldProps) {
  const hourId = useId();
  const minuteId = useId();
  const [localHour, setLocalHour] = useState(String(hour));
  const [localMinute, setLocalMinute] = useState(String(minute).padStart(2, "0"));

  useEffect(() => {
    setLocalHour(String(hour));
  }, [hour]);

  useEffect(() => {
    setLocalMinute(String(minute).padStart(2, "0"));
  }, [minute]);

  return (
    <div className="min-w-0 flex-1">
      <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
        {tooltip && <TooltipIcon text={tooltip} />}
      </label>
      <div className="flex items-center gap-0.5">
        <input
          id={hourId}
          type="number"
          value={localHour}
          min={0}
          max={23}
          onChange={(e) => {
            e.stopPropagation();
            const raw = e.target.value;
            setLocalHour(raw);
            const val = parseInt(raw);
            if (!isNaN(val) && val >= 0 && val <= 23) {
              onHourChange(val);
            }
          }}
          onBlur={() => {
            const val = parseInt(localHour);
            if (isNaN(val) || val < 0 || val > 23) {
              setLocalHour(String(hour));
            } else {
              setLocalHour(String(val));
              if (val !== hour) onHourChange(val);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-11 px-1 py-1.5 text-xs bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={`${label} hour`}
        />
        <span className="text-[#64748B] text-xs">:</span>
        <input
          id={minuteId}
          type="number"
          value={localMinute}
          min={0}
          max={59}
          onChange={(e) => {
            e.stopPropagation();
            const raw = e.target.value;
            setLocalMinute(raw);
            const val = parseInt(raw);
            if (!isNaN(val) && val >= 0 && val <= 59) {
              onMinuteChange(val);
            }
          }}
          onBlur={() => {
            const val = parseInt(localMinute);
            if (isNaN(val) || val < 0 || val > 59) {
              setLocalMinute(String(minute).padStart(2, "0"));
            } else {
              setLocalMinute(String(val).padStart(2, "0"));
              if (val !== minute) onMinuteChange(val);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-11 px-1 py-1.5 text-xs bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={`${label} minute`}
        />
      </div>
    </div>
  );
}
