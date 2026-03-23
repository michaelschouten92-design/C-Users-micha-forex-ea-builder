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
      <div className="flex gap-1 mb-5 bg-[#0A0118]/40 border border-[#1E293B]/30 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key
                ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.03]"
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
