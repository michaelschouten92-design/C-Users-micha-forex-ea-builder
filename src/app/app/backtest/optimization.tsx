"use client";

import { useState, useRef, useCallback } from "react";
import { showError } from "@/lib/toast";
import type { BacktestEngineResult, BacktestConfig } from "@/lib/backtest/types";
import { DEFAULT_BACKTEST_CONFIG } from "@/lib/backtest/types";
import type { BuildJsonSchema, BuilderNode, BaseNodeData } from "@/types/builder";
import { parseCSV } from "@/lib/backtest/data/csv-parser";
import { runBacktestInWorker } from "@/lib/backtest/worker-client";

// ============================================
// TYPES
// ============================================

interface OptimizationProps {
  projects: Array<{ id: string; name: string }>;
  onApplyBest?: (buildJson: BuildJsonSchema) => void;
}

interface OptimizableParam {
  nodeId: string;
  nodeLabel: string;
  fieldName: string;
  currentValue: number;
}

interface ParamRange {
  param: OptimizableParam;
  min: number;
  max: number;
  step: number;
  enabled: boolean;
}

interface OptimizationResult {
  paramValues: Record<string, number>;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  totalTrades: number;
}

type SortField = keyof Omit<OptimizationResult, "paramValues">;
type SortDirection = "asc" | "desc";

// ============================================
// HELPERS
// ============================================

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

function extractOptimizableParams(buildJson: BuildJsonSchema): OptimizableParam[] {
  const params: OptimizableParam[] = [];

  for (const node of buildJson.nodes) {
    const data = node.data as BaseNodeData & Record<string, unknown>;
    const optimizableFields = data.optimizableFields;

    if (!optimizableFields || !Array.isArray(optimizableFields)) continue;

    for (const fieldName of optimizableFields) {
      const value = data[fieldName];
      if (typeof value === "number") {
        params.push({
          nodeId: node.id,
          nodeLabel: data.label || node.id,
          fieldName,
          currentValue: value,
        });
      }
    }
  }

  // If no explicit optimizableFields, auto-detect common numeric params
  if (params.length === 0) {
    for (const node of buildJson.nodes) {
      const data = node.data as BaseNodeData & Record<string, unknown>;
      const numericFields = extractNumericFields(data);
      for (const { name, value } of numericFields) {
        params.push({
          nodeId: node.id,
          nodeLabel: data.label || node.id,
          fieldName: name,
          currentValue: value,
        });
      }
    }
  }

  return params;
}

const SKIP_FIELDS = new Set([
  "label",
  "category",
  "optimizableFields",
  "position",
  "selected",
  "dragging",
  "width",
  "height",
  "zIndex",
]);

function extractNumericFields(
  data: Record<string, unknown>
): Array<{ name: string; value: number }> {
  const fields: Array<{ name: string; value: number }> = [];

  for (const [key, value] of Object.entries(data)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (typeof value === "number" && isFinite(value) && !key.startsWith("_")) {
      fields.push({ name: key, value });
    }
  }

  return fields;
}

function generateParamCombinations(ranges: ParamRange[]): Record<string, number>[] {
  const enabledRanges = ranges.filter((r) => r.enabled);
  if (enabledRanges.length === 0) return [];

  const combinations: Record<string, number>[] = [];
  const keys = enabledRanges.map((r) => `${r.param.nodeId}::${r.param.fieldName}`);

  function buildValues(range: ParamRange): number[] {
    const values: number[] = [];
    const step = Math.max(range.step, 0.001);
    for (let v = range.min; v <= range.max + step * 0.001; v += step) {
      values.push(Math.round(v * 1000) / 1000);
    }
    return values;
  }

  const allValues = enabledRanges.map(buildValues);

  function recurse(index: number, current: Record<string, number>): void {
    if (index >= enabledRanges.length) {
      combinations.push({ ...current });
      return;
    }
    for (const val of allValues[index]) {
      current[keys[index]] = val;
      recurse(index + 1, current);
    }
  }

  recurse(0, {});
  return combinations;
}

function applyParamsToJson(
  buildJson: BuildJsonSchema,
  paramValues: Record<string, number>
): BuildJsonSchema {
  const clone: BuildJsonSchema = JSON.parse(JSON.stringify(buildJson));

  for (const [key, value] of Object.entries(paramValues)) {
    const [nodeId, fieldName] = key.split("::");
    const node = clone.nodes.find((n: BuilderNode) => n.id === nodeId);
    if (node) {
      (node.data as Record<string, unknown>)[fieldName] = value;
    }
  }

  return clone;
}

function interpolateColor(value: number, min: number, max: number): string {
  if (max === min) return "rgb(79, 70, 229)";
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Red (low) -> Yellow (mid) -> Green (high)
  if (ratio < 0.5) {
    const t = ratio * 2;
    const r = 239;
    const g = Math.round(68 + t * (245 - 68));
    const b = Math.round(68 + t * (158 - 68));
    return `rgb(${r}, ${g}, ${b})`;
  }

  const t = (ratio - 0.5) * 2;
  const r = Math.round(245 - t * (245 - 16));
  const g = Math.round(158 + t * (185 - 158));
  const b = Math.round(11 + t * (129 - 11));
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================
// HEATMAP COMPONENT
// ============================================

interface HeatmapProps {
  results: OptimizationResult[];
  param1Key: string;
  param2Key: string;
  param1Label: string;
  param2Label: string;
  metric: "sharpeRatio" | "netProfit";
}

function Heatmap({
  results,
  param1Key,
  param2Key,
  param1Label,
  param2Label,
  metric,
}: HeatmapProps) {
  const param1Values = [...new Set(results.map((r) => r.paramValues[param1Key]))].sort(
    (a, b) => a - b
  );
  const param2Values = [...new Set(results.map((r) => r.paramValues[param2Key]))].sort(
    (a, b) => a - b
  );

  const metricValues = results.map((r) => r[metric]);
  const minMetric = Math.min(...metricValues);
  const maxMetric = Math.max(...metricValues);

  const resultMap = new Map<string, OptimizationResult>();
  for (const r of results) {
    const key = `${r.paramValues[param1Key]}::${r.paramValues[param2Key]}`;
    resultMap.set(key, r);
  }

  const cellSize = Math.max(
    36,
    Math.min(60, 400 / Math.max(param1Values.length, param2Values.length))
  );

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-2">
        Heatmap: {metric === "sharpeRatio" ? "Sharpe Ratio" : "Net Profit"}
      </h3>
      <p className="text-xs text-[#7C8DB0] mb-4">
        X: {param1Label} / Y: {param2Label}
      </p>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex" style={{ marginLeft: cellSize + 8 }}>
            {param1Values.map((v) => (
              <div
                key={v}
                className="text-[10px] text-[#7C8DB0] text-center"
                style={{ width: cellSize }}
              >
                {v}
              </div>
            ))}
          </div>

          {/* Rows */}
          {param2Values.map((p2) => (
            <div key={p2} className="flex items-center">
              <div
                className="text-[10px] text-[#7C8DB0] text-right pr-2 shrink-0"
                style={{ width: cellSize + 8 }}
              >
                {p2}
              </div>
              {param1Values.map((p1) => {
                const key = `${p1}::${p2}`;
                const result = resultMap.get(key);
                const value = result ? result[metric] : 0;
                const bgColor = interpolateColor(value, minMetric, maxMetric);

                return (
                  <div
                    key={`${p1}-${p2}`}
                    className="border border-[rgba(0,0,0,0.2)] flex items-center justify-center cursor-default"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bgColor,
                    }}
                    title={`${param1Label}=${p1}, ${param2Label}=${p2}\n${metric === "sharpeRatio" ? "Sharpe" : "Profit"}: ${metric === "netProfit" ? formatCurrency(value) : value.toFixed(2)}`}
                  >
                    <span className="text-[9px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {metric === "netProfit" ? Math.round(value) : value.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4">
        <span className="text-[10px] text-[#7C8DB0]">Low</span>
        <div
          className="h-3 flex-1 max-w-[200px] rounded-sm"
          style={{
            background:
              "linear-gradient(to right, rgb(239,68,68), rgb(245,158,11), rgb(16,185,129))",
          }}
        />
        <span className="text-[10px] text-[#7C8DB0]">High</span>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function Optimization({ projects, onApplyBest }: OptimizationProps) {
  const [projectId, setProjectId] = useState("");
  const [initialBalance, setInitialBalance] = useState("10000");
  const [spread, setSpread] = useState("10");
  const [commission, setCommission] = useState("3.5");
  const [symbol, setSymbol] = useState("EURUSD");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBarsCount, setCsvBarsCount] = useState(0);

  const [buildJson, setBuildJson] = useState<BuildJsonSchema | null>(null);
  const [availableParams, setAvailableParams] = useState<OptimizableParam[]>([]);
  const [paramRanges, setParamRanges] = useState<ParamRange[]>([]);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [totalCombos, setTotalCombos] = useState(0);
  const [results, setResults] = useState<OptimizationResult[]>([]);

  const [sortField, setSortField] = useState<SortField>("sharpeRatio");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [heatmapMetric, setHeatmapMetric] = useState<"sharpeRatio" | "netProfit">("sharpeRatio");

  const cancelRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Load project strategy ----
  const handleLoadProject = useCallback(async () => {
    if (!projectId) return;

    const res = await fetch(`/api/projects/${projectId}/backtest`);
    if (!res.ok) {
      showError("Failed to load project strategy");
      return;
    }

    const { buildJson: json } = await res.json();
    setBuildJson(json as BuildJsonSchema);
    const params = extractOptimizableParams(json as BuildJsonSchema);
    setAvailableParams(params);
    setParamRanges(
      params.map((p) => ({
        param: p,
        min: Math.max(1, Math.floor(p.currentValue * 0.5)),
        max: Math.ceil(p.currentValue * 1.5),
        step: Math.max(1, Math.floor(p.currentValue * 0.1)),
        enabled: false,
      }))
    );
    setResults([]);
  }, [projectId]);

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
    };
    reader.readAsText(file);
  }, []);

  // ---- Update param range ----
  function updateRange(index: number, field: keyof ParamRange, value: number | boolean): void {
    setParamRanges((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // ---- Run optimization ----
  const handleRunOptimization = useCallback(async () => {
    if (!buildJson || !csvFile) {
      showError("Please load a project and upload CSV data first");
      return;
    }

    const enabledRanges = paramRanges.filter((r) => r.enabled);
    if (enabledRanges.length === 0) {
      showError("Please enable at least one parameter to optimize");
      return;
    }

    const combinations = generateParamCombinations(paramRanges);
    if (combinations.length === 0) {
      showError("No parameter combinations generated");
      return;
    }

    if (combinations.length > 500) {
      showError(
        `Too many combinations (${combinations.length}). Reduce parameter ranges or increase step sizes to stay under 500.`
      );
      return;
    }

    setRunning(true);
    setProgress(0);
    setCurrentCombo(0);
    setTotalCombos(combinations.length);
    setResults([]);
    cancelRef.current = false;

    const text = await csvFile.text();
    const parsed = parseCSV(text);
    if (parsed.bars.length === 0) {
      showError("No valid bars in CSV");
      setRunning(false);
      return;
    }

    const isJPY = symbol.includes("JPY");
    const config: BacktestConfig = {
      ...DEFAULT_BACKTEST_CONFIG,
      initialBalance: parseFloat(initialBalance) || 10000,
      symbol,
      spread: parseInt(spread) || 10,
      commission: parseFloat(commission) || 3.5,
      digits: isJPY ? 3 : 5,
      pointValue: isJPY ? 100 / 1e3 : 1,
    };

    const optimizationResults: OptimizationResult[] = [];

    for (let i = 0; i < combinations.length; i++) {
      if (cancelRef.current) break;

      const combo = combinations[i];
      const modifiedJson = applyParamsToJson(buildJson, combo);

      setCurrentCombo(i + 1);
      setProgress(Math.round(((i + 1) / combinations.length) * 100));

      try {
        const { promise } = runBacktestInWorker(parsed.bars, modifiedJson, config);
        const result: BacktestEngineResult = await promise;

        optimizationResults.push({
          paramValues: combo,
          netProfit: result.netProfit,
          winRate: result.winRate,
          profitFactor: result.profitFactor === Infinity ? 999 : result.profitFactor,
          maxDrawdownPercent: result.maxDrawdownPercent,
          sharpeRatio: result.sharpeRatio,
          totalTrades: result.totalTrades,
        });
      } catch {
        optimizationResults.push({
          paramValues: combo,
          netProfit: 0,
          winRate: 0,
          profitFactor: 0,
          maxDrawdownPercent: 0,
          sharpeRatio: -999,
          totalTrades: 0,
        });
      }
    }

    setResults(optimizationResults);
    setRunning(false);
  }, [buildJson, csvFile, paramRanges, symbol, initialBalance, spread, commission]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
  }, []);

  // ---- Sorting ----
  function handleSort(field: SortField): void {
    if (sortField === field) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const bestResult =
    results.length > 0
      ? results.reduce((best, r) => (r.sharpeRatio > best.sharpeRatio ? r : best), results[0])
      : null;

  // ---- Apply best ----
  function handleApplyBest(): void {
    if (!bestResult || !buildJson) return;
    const optimizedJson = applyParamsToJson(buildJson, bestResult.paramValues);
    onApplyBest?.(optimizedJson);
  }

  // ---- Heatmap setup ----
  const enabledRanges = paramRanges.filter((r) => r.enabled);
  const showHeatmap = enabledRanges.length === 2 && results.length > 0;
  const heatmapParam1Key = enabledRanges[0]
    ? `${enabledRanges[0].param.nodeId}::${enabledRanges[0].param.fieldName}`
    : "";
  const heatmapParam2Key = enabledRanges[1]
    ? `${enabledRanges[1].param.nodeId}::${enabledRanges[1].param.fieldName}`
    : "";

  const renderSortIndicator = (field: SortField): React.ReactNode => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDir === "desc" ? "v" : "^"}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Parameter Optimization</h3>
        <p className="text-sm text-[#94A3B8] mb-4">
          Run a grid search over parameter combinations to find optimal values for your strategy.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Project */}
          <div className="sm:col-span-2">
            <label
              htmlFor="opt-project"
              className="block text-sm font-medium text-[#CBD5E1] mb-1.5"
            >
              Project
            </label>
            <div className="flex gap-2">
              <select
                id="opt-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="flex-1 rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleLoadProject}
                disabled={!projectId}
                className="px-4 py-2.5 rounded-lg font-medium bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-all duration-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Load
              </button>
            </div>
          </div>

          {/* CSV Upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Price Data (CSV)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 border-[rgba(79,70,229,0.3)] bg-[#0A0118]/50 hover:border-[rgba(79,70,229,0.5)]"
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
                </div>
              ) : (
                <p className="text-sm text-[#CBD5E1]">Upload OHLCV CSV data</p>
              )}
            </div>
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
              onChange={(e) => setSpread(e.target.value)}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
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
              onChange={(e) => setCommission(e.target.value)}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Parameter Ranges */}
      {availableParams.length > 0 && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Parameters to Optimize</h3>
          <p className="text-xs text-[#7C8DB0] mb-4">
            Enable parameters and set min/max/step values. Keep combinations under 500 for
            reasonable run times.
          </p>

          <div className="space-y-3">
            {paramRanges.map((range, index) => (
              <div
                key={`${range.param.nodeId}-${range.param.fieldName}`}
                className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
                  range.enabled
                    ? "bg-[rgba(79,70,229,0.08)] border-[rgba(79,70,229,0.3)]"
                    : "bg-[#0A0118]/50 border-[rgba(79,70,229,0.1)]"
                }`}
              >
                <label className="flex items-center gap-2 min-w-[200px]">
                  <input
                    type="checkbox"
                    checked={range.enabled}
                    onChange={(e) => updateRange(index, "enabled", e.target.checked)}
                    className="rounded border-[rgba(79,70,229,0.3)] bg-[#0A0118] text-[#4F46E5] focus:ring-[#4F46E5]"
                  />
                  <span className="text-sm text-white">
                    {range.param.nodeLabel}{" "}
                    <span className="text-[#7C8DB0]">/ {range.param.fieldName}</span>
                  </span>
                </label>

                <span className="text-xs text-[#7C8DB0]">Current: {range.param.currentValue}</span>

                {range.enabled && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#7C8DB0]">Min</label>
                    <input
                      type="number"
                      value={range.min}
                      onChange={(e) => updateRange(index, "min", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-2 py-1 text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                    <label className="text-xs text-[#7C8DB0]">Max</label>
                    <input
                      type="number"
                      value={range.max}
                      onChange={(e) => updateRange(index, "max", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-2 py-1 text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                    <label className="text-xs text-[#7C8DB0]">Step</label>
                    <input
                      type="number"
                      value={range.step}
                      onChange={(e) => updateRange(index, "step", parseFloat(e.target.value) || 1)}
                      className="w-20 rounded bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-2 py-1 text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Combination count */}
          {enabledRanges.length > 0 && (
            <p className="text-xs text-[#7C8DB0] mt-3">
              Total combinations:{" "}
              <span className="text-white font-medium">
                {generateParamCombinations(paramRanges).length}
              </span>
            </p>
          )}

          {/* Run / Cancel */}
          {running ? (
            <div className="mt-6 space-y-3">
              <div className="w-full bg-[#0A0118] rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4F46E5] to-[#22D3EE] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#A78BFA]">
                  Running {currentCombo} / {totalCombos} combinations... {progress}%
                </p>
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
              onClick={handleRunOptimization}
              disabled={!buildJson || !csvFile || enabledRanges.length === 0}
              className="mt-6 w-full py-3 px-4 rounded-lg font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Run Optimization
            </button>
          )}
        </div>
      )}

      {/* Heatmap */}
      {showHeatmap && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#7C8DB0]">Heatmap metric:</span>
            <select
              value={heatmapMetric}
              onChange={(e) => setHeatmapMetric(e.target.value as "sharpeRatio" | "netProfit")}
              className="rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-xs focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="sharpeRatio">Sharpe Ratio</option>
              <option value="netProfit">Net Profit</option>
            </select>
          </div>
          <Heatmap
            results={results}
            param1Key={heatmapParam1Key}
            param2Key={heatmapParam2Key}
            param1Label={`${enabledRanges[0].param.nodeLabel} / ${enabledRanges[0].param.fieldName}`}
            param2Label={`${enabledRanges[1].param.nodeLabel} / ${enabledRanges[1].param.fieldName}`}
            metric={heatmapMetric}
          />
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Results ({results.length} combinations)
            </h3>
            {bestResult && onApplyBest && (
              <button
                onClick={handleApplyBest}
                className="px-4 py-2 rounded-lg font-medium bg-[#10B981] text-white hover:bg-[#059669] transition-all duration-200 text-sm"
              >
                Apply Best Parameters
              </button>
            )}
          </div>

          {bestResult && (
            <div className="mb-4 p-3 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)]">
              <p className="text-sm text-[#10B981] font-medium">
                Best by Sharpe Ratio: {bestResult.sharpeRatio.toFixed(2)}
              </p>
              <p className="text-xs text-[#7C8DB0] mt-1">
                {enabledRanges
                  .map((r) => {
                    const key = `${r.param.nodeId}::${r.param.fieldName}`;
                    return `${r.param.fieldName}=${bestResult.paramValues[key]}`;
                  })
                  .join(", ")}
                {" | "}
                Profit: {formatCurrency(bestResult.netProfit)}, Win Rate:{" "}
                {formatPercent(bestResult.winRate)}, Trades: {bestResult.totalTrades}
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  {enabledRanges.map((r) => (
                    <th
                      key={`${r.param.nodeId}-${r.param.fieldName}`}
                      className="text-left py-2 px-3 text-[#7C8DB0] font-medium text-xs"
                    >
                      {r.param.fieldName}
                    </th>
                  ))}
                  <th
                    className="text-right py-2 px-3 text-[#7C8DB0] font-medium text-xs cursor-pointer hover:text-white"
                    onClick={() => handleSort("netProfit")}
                  >
                    Net Profit
                    {renderSortIndicator("netProfit")}
                  </th>
                  <th
                    className="text-right py-2 px-3 text-[#7C8DB0] font-medium text-xs cursor-pointer hover:text-white"
                    onClick={() => handleSort("winRate")}
                  >
                    Win Rate
                    {renderSortIndicator("winRate")}
                  </th>
                  <th
                    className="text-right py-2 px-3 text-[#7C8DB0] font-medium text-xs cursor-pointer hover:text-white"
                    onClick={() => handleSort("profitFactor")}
                  >
                    P. Factor
                    {renderSortIndicator("profitFactor")}
                  </th>
                  <th
                    className="text-right py-2 px-3 text-[#7C8DB0] font-medium text-xs cursor-pointer hover:text-white"
                    onClick={() => handleSort("maxDrawdownPercent")}
                  >
                    Max DD
                    {renderSortIndicator("maxDrawdownPercent")}
                  </th>
                  <th
                    className="text-right py-2 px-3 text-[#7C8DB0] font-medium text-xs cursor-pointer hover:text-white"
                    onClick={() => handleSort("sharpeRatio")}
                  >
                    Sharpe
                    {renderSortIndicator("sharpeRatio")}
                  </th>
                  <th
                    className="text-right py-2 px-3 text-[#7C8DB0] font-medium text-xs cursor-pointer hover:text-white"
                    onClick={() => handleSort("totalTrades")}
                  >
                    Trades
                    {renderSortIndicator("totalTrades")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, i) => {
                  const isBest = bestResult === result;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-[rgba(79,70,229,0.1)] ${
                        isBest ? "bg-[rgba(16,185,129,0.08)]" : "hover:bg-[rgba(79,70,229,0.05)]"
                      }`}
                    >
                      {enabledRanges.map((r) => {
                        const key = `${r.param.nodeId}::${r.param.fieldName}`;
                        return (
                          <td key={key} className="py-2 px-3 text-[#CBD5E1] text-xs">
                            {result.paramValues[key]}
                          </td>
                        );
                      })}
                      <td
                        className={`py-2 px-3 text-right text-xs font-medium ${
                          result.netProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                        }`}
                      >
                        {formatCurrency(result.netProfit)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-[#CBD5E1]">
                        {formatPercent(result.winRate)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-[#CBD5E1]">
                        {result.profitFactor >= 999 ? "---" : result.profitFactor.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-[#EF4444]">
                        {formatPercent(result.maxDrawdownPercent)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right text-xs font-medium ${
                          isBest ? "text-[#10B981]" : "text-[#CBD5E1]"
                        }`}
                      >
                        {result.sharpeRatio <= -999 ? "N/A" : result.sharpeRatio.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-[#CBD5E1]">
                        {result.totalTrades}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
