"use client";

import { useState } from "react";
import { JournalContent } from "../journal/page";

type Tab = "accounts" | "journal";

interface MonitorTabsProps {
  defaultTab?: Tab;
  children: React.ReactNode;
}

export function MonitorTabs({ defaultTab = "accounts", children }: MonitorTabsProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "accounts", label: "Accounts" },
    { key: "journal", label: "Journal" },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? "bg-[#4F46E5] text-white"
                : "text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.1)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "accounts" && <>{children}</>}
      {tab === "journal" && <JournalContent />}
    </div>
  );
}
