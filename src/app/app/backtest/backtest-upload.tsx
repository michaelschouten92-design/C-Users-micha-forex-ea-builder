"use client";

import { useState, useRef, useCallback } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import type { BacktestResult } from "@/lib/backtest-parser";

interface BacktestUploadProps {
  projects: Array<{ id: string; name: string }>;
}

interface ParsedResult {
  id: string;
  results: BacktestResult;
  fileName: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function MetricCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">{label}</p>
      <p className={`text-lg font-semibold ${colorClass ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function EquityChart({ points }: { points: Array<{ trade: number; equity: number }> }) {
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-[#7C8DB0] text-sm">
        No equity curve data available
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minEquity = Math.min(...points.map((p) => p.equity));
  const maxEquity = Math.max(...points.map((p) => p.equity));
  const equityRange = maxEquity - minEquity || 1;

  function scaleX(trade: number): number {
    const maxTrade = points[points.length - 1].trade || 1;
    return padding.left + (trade / maxTrade) * chartWidth;
  }

  function scaleY(equity: number): number {
    return padding.top + chartHeight - ((equity - minEquity) / equityRange) * chartHeight;
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.trade)} ${scaleY(p.equity)}`)
    .join(" ");

  // Fill area under curve
  const areaD = `${pathD} L ${scaleX(points[points.length - 1].trade)} ${padding.top + chartHeight} L ${scaleX(points[0].trade)} ${padding.top + chartHeight} Z`;

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minEquity + (equityRange / 4) * i;
    return { value, y: scaleY(value) };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="rgba(79,70,229,0.1)"
            strokeDasharray="4 4"
          />
          <text x={padding.left - 8} y={tick.y + 4} textAnchor="end" fill="#7C8DB0" fontSize="10">
            {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}k` : tick.value.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#equityGradient)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#4F46E5" strokeWidth="2" />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(79,70,229,0.3)" />
          <stop offset="100%" stopColor="rgba(79,70,229,0.02)" />
        </linearGradient>
      </defs>

      {/* X-axis label */}
      <text x={width / 2} y={height - 4} textAnchor="middle" fill="#7C8DB0" fontSize="10">
        Trade Number
      </text>
    </svg>
  );
}

export function BacktestUpload({ projects }: BacktestUploadProps) {
  const [projectId, setProjectId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!projectId) {
        showError("Please select a project first");
        return;
      }

      const name = file.name.toLowerCase();
      if (!name.endsWith(".htm") && !name.endsWith(".html")) {
        showError("Please upload an MT5 Strategy Tester report (.htm or .html file)");
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);

        const res = await fetch("/api/backtest/upload", {
          method: "POST",
          headers: getCsrfHeaders(),
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          showError(data.error || "Failed to upload report");
          return;
        }

        setResult(data);
        showSuccess("Report parsed successfully");
      } catch {
        showError("Something went wrong. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [projectId]
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  const r = result?.results;

  return (
    <div className="space-y-6">
      {/* Project selector + upload area */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Import MT5 Backtest Report</h3>

        <div className="mb-4">
          <label htmlFor="bt-project" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
            Project
          </label>
          <select
            id="bt-project"
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

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            dragActive
              ? "border-[#4F46E5] bg-[#4F46E5]/10"
              : "border-[rgba(79,70,229,0.3)] bg-[#0A0118]/50 hover:border-[rgba(79,70,229,0.5)] hover:bg-[#0A0118]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".htm,.html"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading ? (
            <div className="space-y-2">
              <div className="w-8 h-8 mx-auto border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#A78BFA]">Parsing report...</p>
            </div>
          ) : (
            <>
              <svg
                className="w-10 h-10 mx-auto text-[#4F46E5]/50 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-[#CBD5E1] font-medium">
                Drop your MT5 Strategy Tester report here
              </p>
              <p className="text-xs text-[#7C8DB0] mt-1">or click to browse (.htm / .html files)</p>
            </>
          )}
        </div>
      </div>

      {/* Results Dashboard */}
      {r && (
        <div className="space-y-6">
          {/* File info */}
          <div className="flex items-center gap-2 text-sm text-[#7C8DB0]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Results from <span className="text-[#A78BFA]">{result.fileName}</span>
            </span>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Net Profit"
              value={formatCurrency(r.netProfit)}
              colorClass={r.netProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
            />
            <MetricCard label="Total Trades" value={r.totalTrades.toString()} />
            <MetricCard
              label="Win Rate"
              value={formatPercent(r.winRate)}
              colorClass={r.winRate >= 50 ? "text-[#10B981]" : "text-[#F59E0B]"}
            />
            <MetricCard
              label="Profit Factor"
              value={r.profitFactor.toFixed(2)}
              colorClass={
                r.profitFactor >= 1.5
                  ? "text-[#10B981]"
                  : r.profitFactor >= 1
                    ? "text-[#F59E0B]"
                    : "text-[#EF4444]"
              }
            />
            <MetricCard
              label="Max Drawdown"
              value={
                r.maxDrawdownPercent > 0
                  ? formatPercent(r.maxDrawdownPercent)
                  : formatCurrency(r.maxDrawdown)
              }
              colorClass="text-[#EF4444]"
            />
            <MetricCard label="Sharpe Ratio" value={r.sharpeRatio.toFixed(2)} />
            <MetricCard label="Recovery Factor" value={r.recoveryFactor.toFixed(2)} />
            <MetricCard
              label="Expected Payoff"
              value={formatCurrency(r.expectedPayoff)}
              colorClass={r.expectedPayoff >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
            />
          </div>

          {/* Equity Curve */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Equity Curve</h3>
            <EquityChart points={r.equityCurve} />
          </div>

          {/* Trade Statistics */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trade Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#A78BFA]">Profit / Loss</h4>
                <div className="space-y-2">
                  <StatRow
                    label="Gross Profit"
                    value={formatCurrency(r.totalProfit)}
                    valueClass="text-[#10B981]"
                  />
                  <StatRow
                    label="Gross Loss"
                    value={formatCurrency(-r.totalLoss)}
                    valueClass="text-[#EF4444]"
                  />
                  <StatRow label="Largest Win" value={formatCurrency(r.largestWin)} />
                  <StatRow label="Largest Loss" value={formatCurrency(-r.largestLoss)} />
                  <StatRow label="Average Win" value={formatCurrency(r.averageWin)} />
                  <StatRow label="Average Loss" value={formatCurrency(-r.averageLoss)} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#A78BFA]">Streaks</h4>
                <div className="space-y-2">
                  <StatRow
                    label="Max Consecutive Wins"
                    value={r.maxConsecutiveWins.toString()}
                    valueClass="text-[#10B981]"
                  />
                  <StatRow
                    label="Max Consecutive Losses"
                    value={r.maxConsecutiveLosses.toString()}
                    valueClass="text-[#EF4444]"
                  />
                  <StatRow label="Initial Deposit" value={formatCurrency(r.initialDeposit)} />
                  <StatRow label="Final Balance" value={formatCurrency(r.finalBalance)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-[#7C8DB0]">{label}</span>
      <span className={valueClass ?? "text-[#CBD5E1]"}>{value}</span>
    </div>
  );
}
