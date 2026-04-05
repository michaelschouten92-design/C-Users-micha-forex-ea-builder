"use client";

import { useState } from "react";

interface DisclosureSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function DisclosureSection({
  title,
  count,
  defaultOpen = false,
  children,
}: DisclosureSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0]">
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[rgba(79,70,229,0.15)] text-[#7C8DB0]">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[#7C8DB0] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 border-t border-[rgba(79,70,229,0.1)]">{children}</div>}
    </div>
  );
}
