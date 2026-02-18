"use client";

import { useId, useState, useEffect } from "react";

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex ml-1 group/tooltip">
      <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-[#64748B] text-[#64748B] text-[9px] font-bold cursor-help hover:border-[#22D3EE] hover:text-[#22D3EE] transition-colors duration-200">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] text-[10px] rounded-lg shadow-lg whitespace-normal w-48 text-center pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50">
        {text}
      </span>
    </span>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  tooltip?: string;
  helpText?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  tooltip,
  helpText,
}: SelectFieldProps<T>) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
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
      {helpText && <p className="mt-1 text-[10px] text-[#64748B] leading-snug">{helpText}</p>}
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
  helpText?: string;
}

export function NumberField({
  label,
  value,
  min = 0,
  max = Infinity,
  step = 1,
  onChange,
  tooltip,
  helpText,
}: NumberFieldProps) {
  const id = useId();
  const [localValue, setLocalValue] = useState(String(value));
  const [clampHint, setClampHint] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
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
          setClampHint(null);
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, num));
            onChange(clamped);
          }
        }}
        onBlur={() => {
          const num = parseFloat(localValue);
          if (isNaN(num) || localValue === "") {
            setLocalValue(String(min));
            onChange(min);
            setClampHint(`Invalid value — reset to ${min}`);
          } else {
            const clamped = Math.min(max, Math.max(min, num));
            setLocalValue(String(clamped));
            if (clamped !== num) {
              onChange(clamped);
              if (num < min) setClampHint(`Minimum is ${min}`);
              else if (num > max && max !== Infinity) setClampHint(`Maximum is ${max}`);
            } else {
              setClampHint(null);
            }
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-full px-3 py-2 text-sm bg-[#1E293B] border rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200 ${clampHint ? "border-[#F59E0B]/50" : "border-[rgba(79,70,229,0.3)]"}`}
      />
      {clampHint && <p className="mt-1 text-[10px] text-[#F59E0B] leading-snug">{clampHint}</p>}
      {helpText && !clampHint && (
        <p className="mt-1 text-[10px] text-[#64748B] leading-snug">{helpText}</p>
      )}
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
        {tooltip && <Tooltip text={tooltip} />}
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
