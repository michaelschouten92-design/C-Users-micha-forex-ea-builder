"use client";

import { useState } from "react";
import { JournalContent } from "../journal/page";

type Tab = "strategies" | "journal";

interface MonitorTabsProps {
  defaultTab?: Tab;
  children: React.ReactNode;
}

export function MonitorTabs({ defaultTab = "strategies", children }: MonitorTabsProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("strategies")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "strategies"
              ? "bg-[#4F46E5] text-white"
              : "text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.1)]"
          }`}
        >
          Strategies
        </button>
        <button
          onClick={() => setTab("journal")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "journal"
              ? "bg-[#4F46E5] text-white"
              : "text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.1)]"
          }`}
        >
          Journal
        </button>
      </div>

      {tab === "strategies" ? <>{children}</> : <JournalContent />}
    </div>
  );
}
