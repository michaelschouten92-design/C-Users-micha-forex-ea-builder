"use client";

import { useState, type ReactNode } from "react";

interface BacktestTabsProps {
  runBacktestTab: ReactNode;
  importReportTab: ReactNode;
}

export function BacktestTabs({ runBacktestTab, importReportTab }: BacktestTabsProps) {
  const [activeTab, setActiveTab] = useState<"run" | "import">("run");

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[#0A0118] rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("run")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === "run"
              ? "bg-[#4F46E5] text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Run Backtest
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === "import"
              ? "bg-[#4F46E5] text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Import Report
        </button>
      </div>

      {activeTab === "run" ? runBacktestTab : importReportTab}
    </div>
  );
}
