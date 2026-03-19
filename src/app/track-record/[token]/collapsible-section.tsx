"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleSection({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-[#818CF8] hover:text-white transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? "Hide" : "Show"} {label} ({count})
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
