"use client";

import { useState, type ReactNode } from "react";

interface BacktestTabsProps {
  runBacktestTab: ReactNode;
  importReportTab: ReactNode;
  optimizeTab?: ReactNode;
  stressTestTab?: ReactNode;
  sensitivityTab?: ReactNode;
}

type TabId = "run" | "import" | "optimize" | "stress" | "sensitivity";

const TAB_CONFIG: Array<{
  id: TabId;
  label: string;
  requiresProp?: keyof Omit<BacktestTabsProps, "runBacktestTab" | "importReportTab">;
}> = [
  { id: "run", label: "Run Backtest" },
  { id: "import", label: "Import Report" },
  { id: "optimize", label: "Optimize", requiresProp: "optimizeTab" },
  { id: "stress", label: "Stress Test", requiresProp: "stressTestTab" },
  { id: "sensitivity", label: "Sensitivity", requiresProp: "sensitivityTab" },
];

export function BacktestTabs({
  runBacktestTab,
  importReportTab,
  optimizeTab,
  stressTestTab,
  sensitivityTab,
}: BacktestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("run");

  const propMap: Record<string, ReactNode | undefined> = {
    optimizeTab,
    stressTestTab,
    sensitivityTab,
  };

  function getTabContent(): ReactNode {
    switch (activeTab) {
      case "run":
        return runBacktestTab;
      case "import":
        return importReportTab;
      case "optimize":
        return optimizeTab ?? null;
      case "stress":
        return stressTestTab ?? null;
      case "sensitivity":
        return sensitivityTab ?? null;
    }
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[#0A0118] rounded-lg p-1 w-fit flex-wrap">
        {TAB_CONFIG.map((tab) => {
          if (tab.requiresProp && !propMap[tab.requiresProp]) return null;
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
