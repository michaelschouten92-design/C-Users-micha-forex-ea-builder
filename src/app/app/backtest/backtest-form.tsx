"use client";

import { useState } from "react";
import { showInfo } from "@/lib/toast";

interface BacktestFormProps {
  projects: Array<{ id: string; name: string }>;
}

export function BacktestForm({ projects }: BacktestFormProps) {
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [initialBalance, setInitialBalance] = useState("10000");

  function handleRunBacktest() {
    showInfo(
      "Coming soon",
      "For now, use MetaTrader 5 Strategy Tester to backtest your exported EA."
    );
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Configure Backtest</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="project" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
            Project
          </label>
          <select
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors [color-scheme:dark]"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="initialBalance"
            className="block text-sm font-medium text-[#CBD5E1] mb-1.5"
          >
            Initial Balance (USD)
          </label>
          <input
            id="initialBalance"
            type="number"
            min="100"
            step="100"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
          />
        </div>
      </div>

      <button
        onClick={handleRunBacktest}
        className="mt-6 w-full py-3 px-4 rounded-lg font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] text-sm"
      >
        Run Backtest
      </button>
    </div>
  );
}
