"use client";

import { useState } from "react";
import { RiskCalculator } from "../risk-calculator/risk-calculator";
import { PositionSizing } from "../risk-calculator/position-sizing";
import { RiskDashboardClient } from "../risk-dashboard/risk-dashboard-client";

type Tab = "simulator" | "portfolio";

export function RiskPageTabs() {
  const [tab, setTab] = useState<Tab>("simulator");

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("simulator")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "simulator"
              ? "bg-[#4F46E5] text-white"
              : "text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.1)]"
          }`}
        >
          Simulator
        </button>
        <button
          onClick={() => setTab("portfolio")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "portfolio"
              ? "bg-[#4F46E5] text-white"
              : "text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.1)]"
          }`}
        >
          Portfolio
        </button>
      </div>

      {tab === "simulator" ? (
        <div>
          <RiskCalculator />
          <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)]">
            <PositionSizing />
          </div>
        </div>
      ) : (
        <RiskDashboardClient />
      )}
    </div>
  );
}
