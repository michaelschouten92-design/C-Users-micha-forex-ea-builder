"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { showError, showSuccess } from "@/lib/toast";
import type { BacktestEngineResult } from "@/lib/backtest/types";
import type { BacktestConfig } from "@/lib/backtest/types";
import { DEFAULT_BACKTEST_CONFIG } from "@/lib/backtest/types";
import type { BuildJsonSchema } from "@/types/builder";
import { parseCSV } from "@/lib/backtest/data/csv-parser";
import { runBacktestInWorker } from "@/lib/backtest/worker-client";
import { runMonteCarloSimulation } from "@/lib/backtest/monte-carlo";
import type { MonteCarloResult } from "@/lib/backtest/monte-carlo";
import { runWalkForward } from "@/lib/backtest/walk-forward";
import type { WalkForwardResult } from "@/lib/backtest/walk-forward";
import type { OHLCVBar } from "@/lib/backtest/types";

interface BacktestFormProps {
  projects: Array<{ id: string; name: string }>;
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

// ============================================
// RESULTS DISPLAY COMPONENTS
// ============================================

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

function EquityChart({ points }: { points: BacktestEngineResult["equityCurve"] }) {
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

  const equities = points.map((p) => p.equity);
  const minEquity = Math.min(...equities);
  const maxEquity = Math.max(...equities);
  const equityRange = maxEquity - minEquity || 1;

  const scaleX = (i: number) => padding.left + (i / (points.length - 1)) * chartWidth;
  const scaleY = (eq: number) =>
    padding.top + chartHeight - ((eq - minEquity) / equityRange) * chartHeight;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.equity)}`)
    .join(" ");

  const areaD = `${pathD} L ${scaleX(points.length - 1)} ${padding.top + chartHeight} L ${scaleX(0)} ${padding.top + chartHeight} Z`;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minEquity + (equityRange / 4) * i;
    return { value, y: scaleY(value) };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
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
      <path d={areaD} fill="url(#eqGradient)" />
      <path d={pathD} fill="none" stroke="#4F46E5" strokeWidth="2" />
      <defs>
        <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(79,70,229,0.3)" />
          <stop offset="100%" stopColor="rgba(79,70,229,0.02)" />
        </linearGradient>
      </defs>
      <text x={width / 2} y={height - 4} textAnchor="middle" fill="#7C8DB0" fontSize="10">
        Bar Index
      </text>
    </svg>
  );
}

function MonthlyPnLTable({ data }: { data: BacktestEngineResult["monthlyPnL"] }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Monthly P&L</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#7C8DB0] border-b border-[rgba(79,70,229,0.15)]">
              <th className="text-left py-2 pr-4">Month</th>
              <th className="text-right py-2 pr-4">P&L</th>
              <th className="text-right py-2">Trades</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="border-b border-[rgba(79,70,229,0.08)]">
                <td className="py-2 pr-4 text-[#CBD5E1]">{row.month}</td>
                <td
                  className={`py-2 pr-4 text-right font-medium ${
                    row.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {formatCurrency(row.pnl)}
                </td>
                <td className="py-2 text-right text-[#CBD5E1]">{row.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonteCarloDisplay({ data }: { data: MonteCarloResult }) {
  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Monte Carlo Simulation ({data.simulations} runs)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#A78BFA]">95% Confidence</h4>
          <div className="space-y-2">
            <StatRow
              label="Max Drawdown"
              value={formatCurrency(data.confidence95.maxDrawdown)}
              valueClass="text-[#EF4444]"
            />
            <StatRow
              label="Worst Final Balance"
              value={formatCurrency(data.confidence95.finalBalance)}
            />
            <StatRow
              label="Worst Return"
              value={formatCurrency(data.confidence95.worstReturn)}
              valueClass={data.confidence95.worstReturn >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
            />
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#A78BFA]">99% Confidence</h4>
          <div className="space-y-2">
            <StatRow
              label="Max Drawdown"
              value={formatCurrency(data.confidence99.maxDrawdown)}
              valueClass="text-[#EF4444]"
            />
            <StatRow
              label="Worst Final Balance"
              value={formatCurrency(data.confidence99.finalBalance)}
            />
            <StatRow
              label="Worst Return"
              value={formatCurrency(data.confidence99.worstReturn)}
              valueClass={data.confidence99.worstReturn >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)] space-y-2">
        <StatRow label="Median Final Balance" value={formatCurrency(data.medianFinalBalance)} />
        <StatRow
          label="Probability of Ruin (50% DD)"
          value={formatPercent(data.probabilityOfRuin)}
          valueClass={data.probabilityOfRuin > 10 ? "text-[#EF4444]" : "text-[#10B981]"}
        />
      </div>
    </div>
  );
}

function WalkForwardDisplay({ data }: { data: WalkForwardResult }) {
  if (data.windows.length === 0) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Walk-Forward Validation</h3>
        <p className="text-sm text-[#7C8DB0]">
          Not enough data to run walk-forward validation (requires at least 100 bars).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Walk-Forward Validation</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#7C8DB0] border-b border-[rgba(79,70,229,0.15)]">
              <th className="text-left py-2 pr-4">Window</th>
              <th className="text-right py-2 pr-4">IS Profit</th>
              <th className="text-right py-2 pr-4">OOS Profit</th>
              <th className="text-right py-2 pr-4">IS Sharpe</th>
              <th className="text-right py-2">OOS Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {data.windows.map((w, i) => (
              <tr key={i} className="border-b border-[rgba(79,70,229,0.08)]">
                <td className="py-2 pr-4 text-[#CBD5E1]">#{i + 1}</td>
                <td
                  className={`py-2 pr-4 text-right ${
                    w.inSampleProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {formatCurrency(w.inSampleProfit)}
                </td>
                <td
                  className={`py-2 pr-4 text-right ${
                    w.outOfSampleProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {formatCurrency(w.outOfSampleProfit)}
                </td>
                <td className="py-2 pr-4 text-right text-[#CBD5E1]">
                  {w.inSampleSharpe.toFixed(2)}
                </td>
                <td className="py-2 text-right text-[#CBD5E1]">{w.outOfSampleSharpe.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)] space-y-2">
        <StatRow
          label="Overall OOS Profit"
          value={formatCurrency(data.overallOutOfSampleProfit)}
          valueClass={data.overallOutOfSampleProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
        />
        <StatRow
          label="Walk-Forward Efficiency"
          value={formatPercent(data.walkForwardEfficiency * 100)}
          valueClass={data.walkForwardEfficiency >= 0.5 ? "text-[#10B981]" : "text-[#F59E0B]"}
        />
      </div>
    </div>
  );
}

function getProfitFactorColor(pf: number): string {
  if (pf >= 1.5) return "text-[#10B981]";
  if (pf >= 1) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

// ============================================
// MAIN COMPONENT
// ============================================

// Broker presets
const BROKER_PRESETS: Record<
  string,
  { label: string; spread: string; commission: string; description: string }
> = {
  custom: {
    label: "Custom (Manual Entry)",
    spread: "",
    commission: "",
    description: "Enter your own spread and commission values",
  },
  oanda: {
    label: "OANDA",
    spread: "12",
    commission: "0",
    description: "Spread ~1.2 pips, no commission",
  },
  icmarkets: {
    label: "IC Markets Raw",
    spread: "1",
    commission: "7.0",
    description: "Spread ~0.1 pips, $7/lot RT",
  },
  pepperstone: {
    label: "Pepperstone Razor",
    spread: "1",
    commission: "7.0",
    description: "Spread ~0.1 pips, $7/lot RT",
  },
  ftmo: {
    label: "FTMO Challenge",
    spread: "10",
    commission: "4.0",
    description: "Spread ~1.0 pip, $4/lot RT",
  },
  genericecn: {
    label: "Generic ECN",
    spread: "3",
    commission: "6.0",
    description: "Spread ~0.3 pips, $6/lot RT",
  },
};

export function BacktestForm({ projects }: BacktestFormProps) {
  const [projectId, setProjectId] = useState("");
  const [initialBalance, setInitialBalance] = useState("10000");
  const [spread, setSpread] = useState("10");
  const [commission, setCommission] = useState("3.5");
  const [symbol, setSymbol] = useState("EURUSD");
  const [brokerPreset, setBrokerPreset] = useState("custom");
  const [swapLong, setSwapLong] = useState("0");
  const [swapShort, setSwapShort] = useState("0");
  const [requoteRate, setRequoteRate] = useState("0");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dataHelpOpen, setDataHelpOpen] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBarsCount, setCsvBarsCount] = useState(0);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BacktestEngineResult | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monte Carlo and Walk-Forward state
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [monteCarloRunning, setMonteCarloRunning] = useState(false);
  const [walkForwardResult, setWalkForwardResult] = useState<WalkForwardResult | null>(null);
  const [walkForwardRunning, setWalkForwardRunning] = useState(false);

  // Store parsed bars and buildJson for MC / WF
  const parsedBarsRef = useRef<OHLCVBar[]>([]);
  const buildJsonRef = useRef<BuildJsonSchema | null>(null);
  const configRef = useRef<BacktestConfig>(DEFAULT_BACKTEST_CONFIG);
  const [saving, setSaving] = useState(false);
  const [addingToJournal, setAddingToJournal] = useState(false);

  // ---- CSV Upload ----
  const handleCSVUpload = useCallback((file: File) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showError("File too large. Maximum 50MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseCSV(text);
      if (parsed.bars.length === 0) {
        showError("Could not parse any OHLCV bars from the file");
        return;
      }
      setCsvFile(file);
      setCsvBarsCount(parsed.bars.length);
      setCsvWarnings(parsed.warnings);
    };
    reader.readAsText(file);
  }, []);

  // ---- Run Backtest ----
  const handleRunBacktest = useCallback(async () => {
    if (!projectId) {
      showError("Please select a project");
      return;
    }
    if (!csvFile) {
      showError("Please upload CSV price data");
      return;
    }

    setRunning(true);
    setProgress(0);
    setResult(null);
    setMonteCarloResult(null);
    setWalkForwardResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/backtest`);
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to load project strategy");
        return;
      }
      const { buildJson } = await res.json();

      const text = await csvFile.text();
      const parsed = parseCSV(text);
      if (parsed.bars.length === 0) {
        showError("No valid bars in CSV");
        return;
      }

      const isJPY = symbol.includes("JPY");
      const parsedRequotePercent = parseFloat(requoteRate) || 0;
      const config: BacktestConfig = {
        ...DEFAULT_BACKTEST_CONFIG,
        initialBalance: parseFloat(initialBalance) || 10000,
        symbol,
        spread: parseInt(spread) || 10,
        commission: parseFloat(commission) || 3.5,
        digits: isJPY ? 3 : 5,
        pointValue: isJPY ? 100 / 1e3 : 1,
        swapLong: parseFloat(swapLong) || 0,
        swapShort: parseFloat(swapShort) || 0,
        requoteRate: Math.min(Math.max(parsedRequotePercent / 100, 0), 0.3),
      };

      // Store for MC/WF
      parsedBarsRef.current = parsed.bars;
      buildJsonRef.current = buildJson as BuildJsonSchema;
      configRef.current = config;

      const { promise, cancel } = runBacktestInWorker(
        parsed.bars,
        buildJson as BuildJsonSchema,
        config,
        (p) => setProgress(p.percent)
      );
      cancelRef.current = cancel;

      const backtestResult = await promise;
      setResult(backtestResult);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setRunning(false);
      cancelRef.current = null;
    }
  }, [
    projectId,
    csvFile,
    initialBalance,
    spread,
    commission,
    symbol,
    swapLong,
    swapShort,
    requoteRate,
  ]);

  const handleCancel = () => {
    cancelRef.current?.();
    setRunning(false);
  };

  // ---- Monte Carlo ----
  const handleMonteCarlo = useCallback(() => {
    if (!result || result.trades.length === 0) return;
    setMonteCarloRunning(true);
    // Run asynchronously to avoid blocking UI
    setTimeout(() => {
      const mcResult = runMonteCarloSimulation(
        result.trades,
        configRef.current.initialBalance,
        1000,
        0.5
      );
      setMonteCarloResult(mcResult);
      setMonteCarloRunning(false);
    }, 50);
  }, [result]);

  // ---- Walk-Forward ----
  const handleWalkForward = useCallback(() => {
    if (!buildJsonRef.current || parsedBarsRef.current.length === 0) return;
    setWalkForwardRunning(true);
    setTimeout(() => {
      const wfResult = runWalkForward(
        parsedBarsRef.current,
        buildJsonRef.current!,
        configRef.current,
        5,
        0.7
      );
      setWalkForwardResult(wfResult);
      setWalkForwardRunning(false);
    }, 50);
  }, []);

  // ---- Save Results ----
  const handleSaveResults = useCallback(async () => {
    if (!result || !projectId || !csvFile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/backtest-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results: result,
          fileName: csvFile.name,
        }),
      });
      if (res.ok) {
        showSuccess("Backtest results saved");
      } else {
        const err = await res.json();
        showError(err.error || "Failed to save results");
      }
    } catch {
      showError("Failed to save results");
    } finally {
      setSaving(false);
    }
  }, [result, projectId, csvFile]);

  // ---- Add to Journal ----
  const handleAddToJournal = useCallback(async () => {
    if (!result || !projectId) return;
    setAddingToJournal(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          backtestProfit: result.netProfit,
          backtestWinRate: result.winRate,
          backtestSharpe: result.sharpeRatio,
          status: "BACKTESTING",
        }),
      });
      if (res.ok) {
        showSuccess("Added to Trade Journal");
      } else {
        const err = await res.json();
        showError(err.error || "Failed to add to journal");
      }
    } catch {
      showError("Failed to add to journal");
    } finally {
      setAddingToJournal(false);
    }
  }, [result, projectId]);

  const r = result;

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Run Backtest</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Project */}
          <div className="sm:col-span-2">
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

          {/* CSV Upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Price Data (CSV)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 border-[rgba(79,70,229,0.3)] bg-[#0A0118]/50 hover:border-[rgba(79,70,229,0.5)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCSVUpload(f);
                  e.target.value = "";
                }}
                className="hidden"
              />
              {csvFile ? (
                <div>
                  <p className="text-sm text-[#A78BFA] font-medium">{csvFile.name}</p>
                  <p className="text-xs text-[#7C8DB0] mt-1">
                    {csvBarsCount.toLocaleString()} bars loaded
                  </p>
                  {csvWarnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-[#FBBF24] mt-0.5">
                      {w}
                    </p>
                  ))}
                </div>
              ) : (
                <>
                  <svg
                    className="w-8 h-8 mx-auto text-[#4F46E5]/50 mb-2"
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
                  <p className="text-sm text-[#CBD5E1]">Upload OHLCV CSV data</p>
                  <p className="text-[10px] text-[#7C8DB0] mt-1">
                    Supports MetaTrader, TradingView, and generic CSV formats
                  </p>
                </>
              )}
            </div>

            {/* Data Source Help */}
            <div className="mt-2">
              <button
                onClick={() => setDataHelpOpen(!dataHelpOpen)}
                className="flex items-center gap-1.5 text-[11px] text-[#7C8DB0] hover:text-[#A78BFA] transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${dataHelpOpen ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Where to get historical data?
              </button>

              {dataHelpOpen && (
                <div className="mt-3 p-4 bg-[#0A0118] rounded-lg border border-[rgba(79,70,229,0.15)] space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-[#A78BFA] mb-2">
                      Export from MetaTrader 5
                    </h4>
                    <ol className="space-y-1.5 text-[11px] text-[#94A3B8]">
                      <li className="flex gap-2">
                        <span className="text-[#4F46E5] font-bold shrink-0">1.</span>
                        <span>
                          Open MT5 and go to <span className="text-white">View &gt; Symbols</span>{" "}
                          (or press Ctrl+U)
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#4F46E5] font-bold shrink-0">2.</span>
                        <span>
                          Select the symbol and timeframe, then click{" "}
                          <span className="text-white">Bars</span> tab
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#4F46E5] font-bold shrink-0">3.</span>
                        <span>
                          Click <span className="text-white">Export Bars</span> and save as CSV
                        </span>
                      </li>
                    </ol>
                    <p className="text-[10px] text-[#7C8DB0] mt-2">
                      Tip: Open a free MetaQuotes demo account for access to historical data without
                      a broker.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#A78BFA] mb-2">
                      Expected CSV Format
                    </h4>
                    <div className="bg-[#1A0626] rounded p-2 font-mono text-[10px] text-[#CBD5E1] overflow-x-auto">
                      <p className="text-[#7C8DB0]"># Date, Open, High, Low, Close, Volume</p>
                      <p>2024.01.02 00:00,1.10245,1.10312,1.10201,1.10289,4521</p>
                      <p>2024.01.02 01:00,1.10289,1.10345,1.10267,1.10331,3872</p>
                    </div>
                    <p className="text-[10px] text-[#7C8DB0] mt-1.5">
                      MetaTrader, TradingView, and most generic CSV formats are auto-detected.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#A78BFA] mb-2">
                      Download Sample Template
                    </h4>
                    <button
                      onClick={() => {
                        const sampleCSV = `Date,Open,High,Low,Close,Volume\n2024.01.02 00:00,1.10245,1.10312,1.10201,1.10289,4521\n2024.01.02 01:00,1.10289,1.10345,1.10267,1.10331,3872\n2024.01.02 02:00,1.10331,1.10398,1.10310,1.10376,2941\n2024.01.02 03:00,1.10376,1.10401,1.10342,1.10358,1856\n2024.01.02 04:00,1.10358,1.10412,1.10345,1.10395,2234`;
                        const blob = new Blob([sampleCSV], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "sample_ohlcv_template.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#A78BFA] border border-[#A78BFA]/30 rounded-lg hover:bg-[#A78BFA]/10 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download sample_ohlcv_template.csv
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Broker Preset */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Broker Preset</label>
            <select
              value={brokerPreset}
              onChange={(e) => {
                const key = e.target.value;
                setBrokerPreset(key);
                const preset = BROKER_PRESETS[key];
                if (preset && key !== "custom") {
                  setSpread(preset.spread);
                  setCommission(preset.commission);
                }
              }}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            >
              {Object.entries(BROKER_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>
            {brokerPreset !== "custom" && (
              <p className="text-[10px] text-[#7C8DB0] mt-1">
                {BROKER_PRESETS[brokerPreset]?.description}
              </p>
            )}
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Initial Balance (USD)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>

          {/* Spread */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Spread (points)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={spread}
              onChange={(e) => {
                setSpread(e.target.value);
                setBrokerPreset("custom");
              }}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
            <p className="text-[10px] text-[#7C8DB0] mt-1">10 points = 1 pip on 5-digit brokers</p>
          </div>

          {/* Commission */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Commission ($/lot/side)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={commission}
              onChange={(e) => {
                setCommission(e.target.value);
                setBrokerPreset("custom");
              }}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
        </div>

        {/* Advanced Settings (collapsible) */}
        <div className="mt-4 border border-[rgba(79,70,229,0.2)] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#A78BFA] bg-[#0A0118]/50 hover:bg-[#0A0118]/80 transition-colors"
          >
            <span>Advanced Settings</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {advancedOpen && (
            <div className="px-4 pb-4 pt-2 space-y-4 bg-[#0A0118]/30">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Swap Long */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
                    Swap Long ($/lot/night)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={swapLong}
                    onChange={(e) => setSwapLong(e.target.value)}
                    className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                  />
                  <p className="text-[10px] text-[#7C8DB0] mt-1">
                    Overnight swap for BUY positions. Negative = credit.
                  </p>
                </div>

                {/* Swap Short */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
                    Swap Short ($/lot/night)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={swapShort}
                    onChange={(e) => setSwapShort(e.target.value)}
                    className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                  />
                  <p className="text-[10px] text-[#7C8DB0] mt-1">
                    Overnight swap for SELL positions. Negative = credit.
                  </p>
                </div>

                {/* Requote Rate */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
                    Requote Rate (0-30%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={requoteRate}
                    onChange={(e) => setRequoteRate(e.target.value)}
                    className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-[#7C8DB0] mt-1">
                    Probability of trade entry being rejected (requoted). 0 = no requotes, 30 = 30%
                    chance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Run / Cancel button */}
        {running ? (
          <div className="mt-6 space-y-3">
            <div className="w-full bg-[#0A0118] rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4F46E5] to-[#22D3EE] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#A78BFA]">Running backtest... {progress}%</p>
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 text-xs font-medium text-[#EF4444] border border-[#EF4444]/30 rounded-lg hover:bg-[#EF4444]/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleRunBacktest}
            disabled={!projectId || !csvFile}
            className="mt-6 w-full py-3 px-4 rounded-lg font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Backtest
          </button>
        )}
      </div>

      {/* Warnings */}
      {r && r.warnings.length > 0 && (
        <div className="bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)] rounded-xl p-4">
          <h4 className="text-sm font-medium text-[#FBBF24] mb-2">Warnings</h4>
          {r.warnings.map((w, i) => (
            <p key={i} className="text-xs text-[#FBBF24]/80">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Results */}
      {r && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
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
                {r.barsProcessed.toLocaleString()} bars processed in{" "}
                {(r.duration / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToJournal}
                disabled={addingToJournal}
                className="px-4 py-1.5 text-xs font-medium text-[#22D3EE] border border-[#22D3EE]/30 rounded-lg hover:bg-[#22D3EE]/10 transition-colors disabled:opacity-40"
              >
                {addingToJournal ? "Adding..." : "Add to Journal"}
              </button>
              <button
                onClick={handleSaveResults}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium text-[#A78BFA] border border-[#A78BFA]/30 rounded-lg hover:bg-[#A78BFA]/10 transition-colors disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save Results"}
              </button>
            </div>
          </div>

          {/* Monte Carlo & Walk-Forward Buttons (prominent position) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleMonteCarlo}
              disabled={monteCarloRunning || r.trades.length === 0}
              className="py-3 px-4 rounded-lg font-semibold bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white hover:from-[#6366F1] hover:to-[#818CF8] transition-all duration-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_10px_rgba(79,70,229,0.3)]"
            >
              {monteCarloRunning
                ? "Running Monte Carlo..."
                : "Run Monte Carlo Simulation (1000 sims)"}
            </button>
            <button
              onClick={handleWalkForward}
              disabled={walkForwardRunning || parsedBarsRef.current.length === 0}
              className="py-3 px-4 rounded-lg font-semibold bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white hover:from-[#6366F1] hover:to-[#818CF8] transition-all duration-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_10px_rgba(79,70,229,0.3)]"
            >
              {walkForwardRunning ? "Running Walk-Forward..." : "Run Walk-Forward Validation"}
            </button>
          </div>

          {/* Monte Carlo Results (shown immediately after buttons) */}
          {monteCarloResult && <MonteCarloDisplay data={monteCarloResult} />}

          {/* Walk-Forward Results */}
          {walkForwardResult && <WalkForwardDisplay data={walkForwardResult} />}

          {/* Key metrics */}
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
              value={r.profitFactor === Infinity ? "---" : r.profitFactor.toFixed(2)}
              colorClass={getProfitFactorColor(r.profitFactor)}
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
            <MetricCard label="Sortino Ratio" value={r.sortinoRatio.toFixed(2)} />
            <MetricCard label="Calmar Ratio" value={r.calmarRatio.toFixed(2)} />
            <MetricCard label="Ulcer Index" value={r.ulcerIndex.toFixed(2)} />
            <MetricCard label="Recovery Factor" value={r.recoveryFactor.toFixed(2)} />
            <MetricCard
              label="Expected Payoff"
              value={formatCurrency(r.expectedPayoff)}
              colorClass={r.expectedPayoff >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
            />
            <MetricCard
              label="Avg Trade Duration"
              value={`${r.averageTradeDuration.toFixed(1)} bars`}
            />
          </div>

          {/* Long vs Short Breakdown */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Long / Short Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <StatRow label="Long Trades" value={r.longTrades.toString()} />
                <StatRow
                  label="Long Win Rate"
                  value={formatPercent(r.longWinRate)}
                  valueClass={r.longWinRate >= 50 ? "text-[#10B981]" : "text-[#F59E0B]"}
                />
              </div>
              <div className="space-y-2">
                <StatRow label="Short Trades" value={r.shortTrades.toString()} />
                <StatRow
                  label="Short Win Rate"
                  value={formatPercent(r.shortWinRate)}
                  valueClass={r.shortWinRate >= 50 ? "text-[#10B981]" : "text-[#F59E0B]"}
                />
              </div>
            </div>
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
                <h4 className="text-sm font-medium text-[#A78BFA]">Streaks & Balance</h4>
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
                  <StatRow
                    label="Total Swap"
                    value={formatCurrency(r.totalSwap)}
                    valueClass={r.totalSwap >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
                  />
                  <StatRow
                    label="Total Commission"
                    value={formatCurrency(-r.totalCommission)}
                    valueClass="text-[#EF4444]"
                  />
                  {r.requoteCount > 0 && (
                    <StatRow
                      label="Requotes"
                      value={r.requoteCount.toString()}
                      valueClass="text-[#F59E0B]"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly P&L */}
          <MonthlyPnLTable data={r.monthlyPnL} />

          {/* Workflow Navigation */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Workflow Stepper */}
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/app"
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#7C8DB0] hover:text-[#A78BFA] hover:bg-[#4F46E5]/10 transition-all"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[8px]">
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    Build
                  </Link>
                  <svg
                    className="w-3 h-3 text-[#4F46E5]/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-[#4F46E5]/20 text-[10px] font-semibold text-[#A78BFA]">
                    <span className="w-4 h-4 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[8px]">
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    Test
                  </span>
                  <svg
                    className="w-3 h-3 text-[#4F46E5]/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#7C8DB0]">
                    <span className="w-4 h-4 rounded-full border border-[#7C8DB0]/40 flex items-center justify-center text-[8px]">
                      3
                    </span>
                    Deploy
                  </span>
                  <svg
                    className="w-3 h-3 text-[#4F46E5]/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#7C8DB0]">
                    <span className="w-4 h-4 rounded-full border border-[#7C8DB0]/40 flex items-center justify-center text-[8px]">
                      4
                    </span>
                    Monitor
                  </span>
                </div>
              </div>
              <Link
                href="/app/live"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-all duration-200 hover:shadow-[0_0_16px_rgba(16,185,129,0.3)]"
              >
                Next: Go Live
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* (Monte Carlo & Walk-Forward buttons moved above key metrics) */}
        </div>
      )}
    </div>
  );
}
