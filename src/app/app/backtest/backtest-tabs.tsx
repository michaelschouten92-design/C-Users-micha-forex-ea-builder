"use client";

import { useState, type ReactNode } from "react";

interface BacktestTabsProps {
  runBacktestTab: ReactNode;
  importReportTab: ReactNode;
  optimizeTab?: ReactNode;
}

type TabId = "run" | "import" | "optimize";

const TAB_CONFIG: Array<{ id: TabId; label: string; requiresProp?: "optimizeTab" }> = [
  { id: "run", label: "Run Backtest" },
  { id: "import", label: "Import Report" },
  { id: "optimize", label: "Optimize", requiresProp: "optimizeTab" },
];

export function BacktestTabs({ runBacktestTab, importReportTab, optimizeTab }: BacktestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("run");

  function getTabContent(): ReactNode {
    switch (activeTab) {
      case "run":
        return runBacktestTab;
      case "import":
        return importReportTab;
      case "optimize":
        return optimizeTab ?? null;
    }
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[#0A0118] rounded-lg p-1 w-fit">
        {TAB_CONFIG.map((tab) => {
          if (tab.requiresProp === "optimizeTab" && !optimizeTab) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[#4F46E5] text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {getTabContent()}
    </div>
  );
}
