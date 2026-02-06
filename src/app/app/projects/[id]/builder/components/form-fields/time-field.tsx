"use client";

import { useId, memo } from "react";

interface TimeFieldProps {
  label: string;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export const TimeField = memo(function TimeField({
  label,
  hour,
  minute,
  onChange,
}: TimeFieldProps) {
  const groupId = useId();
  const hourId = useId();
  const minuteId = useId();

  return (
    <div role="group" aria-labelledby={groupId}>
      <label id={groupId} className="block text-xs font-medium text-[#CBD5E1] mb-1">
        {label}
      </label>
      <div className="flex gap-1 items-center">
        <label htmlFor={hourId} className="sr-only">
          {label} hour
        </label>
        <input
          id={hourId}
          type="number"
          value={hour}
          min={0}
          max={23}
          aria-valuemin={0}
          aria-valuemax={23}
          aria-valuenow={hour}
          onChange={(e) => {
            e.stopPropagation();
            onChange(parseInt(e.target.value) || 0, minute);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-12 px-2 py-1.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
          placeholder="HH"
        />
        <span className="text-[#64748B]" aria-hidden="true">
          :
        </span>
        <label htmlFor={minuteId} className="sr-only">
          {label} minute
        </label>
        <input
          id={minuteId}
          type="number"
          value={minute}
          min={0}
          max={59}
          step={15}
          aria-valuemin={0}
          aria-valuemax={59}
          aria-valuenow={minute}
          onChange={(e) => {
            e.stopPropagation();
            onChange(hour, parseInt(e.target.value) || 0);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-12 px-2 py-1.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
          placeholder="MM"
        />
      </div>
    </div>
  );
});
