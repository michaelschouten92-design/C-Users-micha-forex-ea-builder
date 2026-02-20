"use client";

import { useState, useCallback, useRef } from "react";
import { showError } from "@/lib/toast";
import type { BacktestEngineResult, BacktestConfig } from "@/lib/backtest/types";
import { DEFAULT_BACKTEST_CONFIG } from "@/lib/backtest/types";
import type { BuildJsonSchema, BuilderNode, BaseNodeData } from "@/types/builder";
import { parseCSV } from "@/lib/backtest/data/csv-parser";
import { runBacktestInWorker } from "@/lib/backtest/worker-client";

// ============================================
// TYPES
// ============================================

interface SensitivityProps {
  projects: Array<{ id: string; name: string }>;
}

interface ParamInfo {
  nodeId: string;
  nodeLabel: string;
  fieldName: string;
  currentValue: number;
}

interface VariationResult {
  variation: number; // e.g., -30, -20, -10, 0, 10, 20, 30
  netProfit: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
}

interface ParamSensitivity {
  param: ParamInfo;
  baseResult: { netProfit: number; maxDrawdownPercent: number; sharpeRatio: number };
  variations: VariationResult[];
  robustnessScore: number; // 0-100, higher = more robust
  classification: "robust" | "moderate" | "fragile";
}

// ============================================
// HELPERS
// ============================================

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

function extractNumericParams(buildJson: BuildJsonSchema): ParamInfo[] {
  const params: ParamInfo[] = [];

  for (const node of buildJson.nodes) {
    const data = node.data as BaseNodeData & Record<string, unknown>;

    // Check for explicit optimizableFields first
    const optimizableFields = data.optimizableFields;
    if (optimizableFields && Array.isArray(optimizableFields)) {
      for (const fieldName of optimizableFields) {
        const value = data[fieldName];
        if (typeof value === "number" && isFinite(value)) {
          params.push({
            nodeId: node.id,
            nodeLabel: data.label || node.id,
            fieldName,
            currentValue: value,
          });
        }
      }
      continue;
    }

    // Auto-detect numeric fields
    for (const [key, value] of Object.entries(data)) {
      if (SKIP_FIELDS.has(key) || key.startsWith("_")) continue;
      if (typeof value === "number" && isFinite(value) && value !== 0) {
        params.push({
          nodeId: node.id,
          nodeLabel: data.label || node.id,
          fieldName: key,
          currentValue: value,
        });
      }
    }
  }

  return params;
}

function applyParamValue(
  buildJson: BuildJsonSchema,
  nodeId: string,
  fieldName: string,
  value: number
): BuildJsonSchema {
  const clone: BuildJsonSchema = JSON.parse(JSON.stringify(buildJson));
  const node = clone.nodes.find((n: BuilderNode) => n.id === nodeId);
  if (node) {
    (node.data as Record<string, unknown>)[fieldName] = value;
  }
  return clone;
}

function calculateRobustness(variations: VariationResult[]): number {
  const base = variations.find((v) => v.variation === 0);
  if (!base || base.netProfit === 0) return 50;

  // Calculate average % deviation in net profit from variations
  const deviations = variations
    .filter((v) => v.variation !== 0)
    .map((v) => Math.abs((v.netProfit - base.netProfit) / Math.abs(base.netProfit)));

  if (deviations.length === 0) return 100;

  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Score: 100 = perfectly robust (0% deviation), 0 = extremely fragile (200%+ deviation)
  const score = Math.max(0, Math.min(100, 100 - avgDeviation * 50));
  return score;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ============================================
// SENSITIVITY TABLE COMPONENT
// ============================================

function SensitivityTable({ data }: { data: ParamSensitivity }) {
  const variationPcts = [-30, -20, -10, 0, 10, 20, 30];
  const base = data.baseResult;

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-white">
            {data.param.nodeLabel}
            <span className="text-[#7C8DB0] font-normal ml-1">/ {data.param.fieldName}</span>
          </h4>
          <span className="text-xs text-[#7C8DB0]">Base: {data.param.currentValue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
              data.classification === "robust"
                ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                : data.classification === "moderate"
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                  : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
            }`}
          >
            {data.classification === "robust"
              ? "Robust"
              : data.classification === "moderate"
                ? "Moderate"
                : "Fragile"}
          </span>
          <span className="text-[10px] text-[#7C8DB0]">
            Score: {data.robustnessScore.toFixed(0)}/100
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[rgba(79,70,229,0.15)]">
              <th className="text-left py-2 pr-3 text-[#7C8DB0] font-medium">Variation</th>
              <th className="text-left py-2 pr-3 text-[#7C8DB0] font-medium">Value</th>
              <th className="text-right py-2 pr-3 text-[#7C8DB0] font-medium">Net Profit</th>
              <th className="text-right py-2 pr-3 text-[#7C8DB0] font-medium">Change</th>
              <th className="text-right py-2 pr-3 text-[#7C8DB0] font-medium">Max DD</th>
              <th className="text-right py-2 text-[#7C8DB0] font-medium">Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {variationPcts.map((pct) => {
              const result = data.variations.find((v) => v.variation === pct);
              if (!result) return null;

              const isBase = pct === 0;
              const paramValue = data.param.currentValue * (1 + pct / 100);
              const profitChange =
                base.netProfit !== 0
                  ? ((result.netProfit - base.netProfit) / Math.abs(base.netProfit)) * 100
                  : 0;

              // Color coding for change magnitude
              const changeMagnitude = Math.abs(profitChange);
              const changeColor = isBase
                ? "text-[#CBD5E1]"
                : changeMagnitude < 10
                  ? "text-[#10B981]"
                  : changeMagnitude < 30
                    ? "text-[#F59E0B]"
                    : "text-[#EF4444]";

              return (
                <tr
                  key={pct}
                  className={`border-b border-[rgba(79,70,229,0.08)] ${
                    isBase ? "bg-[rgba(79,70,229,0.08)]" : "hover:bg-[rgba(79,70,229,0.03)]"
                  }`}
                >
                  <td className="py-2 pr-3 text-[#CBD5E1]">
                    {isBase ? (
                      <span className="font-semibold text-[#A78BFA]">Base</span>
                    ) : (
                      `${pct > 0 ? "+" : ""}${pct}%`
                    )}
                  </td>
                  <td className="py-2 pr-3 text-[#CBD5E1]">
                    {paramValue.toFixed(paramValue % 1 === 0 ? 0 : 2)}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right font-medium ${result.netProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                  >
                    {formatCurrency(result.netProfit)}
                  </td>
                  <td className={`py-2 pr-3 text-right font-medium ${changeColor}`}>
                    {isBase ? "--" : `${profitChange >= 0 ? "+" : ""}${profitChange.toFixed(1)}%`}
                  </td>
                  <td className="py-2 pr-3 text-right text-[#EF4444]">
                    {formatPercent(result.maxDrawdownPercent)}
                  </td>
                  <td className="py-2 text-right text-[#CBD5E1]">
                    {result.sharpeRatio.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function Sensitivity({ projects }: SensitivityProps) {
  const [projectId, setProjectId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBarsCount, setCsvBarsCount] = useState(0);
  const [symbol, setSymbol] = useState("EURUSD");
  const [initialBalance, setInitialBalance] = useState("10000");
  const [spread, setSpread] = useState("10");
  const [commission, setCommission] = useState("3.5");

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [results, setResults] = useState<ParamSensitivity[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

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

  // ---- Run Sensitivity Analysis ----
  const handleRunAnalysis = useCallback(async () => {
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
    setResults([]);
    cancelRef.current = false;

    try {
      // Load project
      const res = await fetch(`/api/projects/${projectId}/backtest`);
      if (!res.ok) {
        showError("Failed to load project strategy");
        return;
      }
      const { buildJson } = await res.json();
      const typedBuildJson = buildJson as BuildJsonSchema;

      // Parse CSV
      const text = await csvFile.text();
      const parsed = parseCSV(text);
      if (parsed.bars.length === 0) {
        showError("No valid bars in CSV");
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

      // Extract parameters
      const params = extractNumericParams(typedBuildJson);
      if (params.length === 0) {
        showError("No numeric parameters found in strategy");
        return;
      }

      const variationPcts = [-30, -20, -10, 0, 10, 20, 30];
      const totalRuns = params.length * variationPcts.length;
      let completedRuns = 0;

      const sensitivityResults: ParamSensitivity[] = [];

      for (const param of params) {
        if (cancelRef.current) break;

        const variations: VariationResult[] = [];

        for (const pct of variationPcts) {
          if (cancelRef.current) break;

          const newValue = param.currentValue * (1 + pct / 100);
          const modifiedJson = applyParamValue(
            typedBuildJson,
            param.nodeId,
            param.fieldName,
            newValue
          );

          setProgressLabel(
            `${param.nodeLabel}/${param.fieldName} at ${pct >= 0 ? "+" : ""}${pct}%`
          );

          try {
            const { promise } = runBacktestInWorker(parsed.bars, modifiedJson, config);
            const btResult: BacktestEngineResult = await promise;

            variations.push({
              variation: pct,
              netProfit: btResult.netProfit,
              maxDrawdownPercent: btResult.maxDrawdownPercent,
              sharpeRatio: btResult.sharpeRatio,
            });
          } catch {
            variations.push({
              variation: pct,
              netProfit: 0,
              maxDrawdownPercent: 0,
              sharpeRatio: -999,
            });
          }

          completedRuns++;
          setProgress(Math.round((completedRuns / totalRuns) * 100));
        }

        const baseVariation = variations.find((v) => v.variation === 0);
        const robustnessScore = calculateRobustness(variations);

        sensitivityResults.push({
          param,
          baseResult: baseVariation
            ? {
                netProfit: baseVariation.netProfit,
                maxDrawdownPercent: baseVariation.maxDrawdownPercent,
                sharpeRatio: baseVariation.sharpeRatio,
              }
            : { netProfit: 0, maxDrawdownPercent: 0, sharpeRatio: 0 },
          variations,
          robustnessScore,
          classification:
            robustnessScore >= 70 ? "robust" : robustnessScore >= 40 ? "moderate" : "fragile",
        });
      }

      // Sort by robustness (most fragile first for attention)
      sensitivityResults.sort((a, b) => a.robustnessScore - b.robustnessScore);
      setResults(sensitivityResults);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }, [projectId, csvFile, symbol, initialBalance, spread, commission]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
  }, []);

  const robustParams = results.filter((r) => r.classification === "robust");
  const fragileParams = results.filter((r) => r.classification === "fragile");

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Parameter Sensitivity Analysis</h3>
        <p className="text-sm text-[#94A3B8] mb-4">
          Vary each strategy parameter by +/-10%, 20%, 30% to see how sensitive your results are to
          parameter changes. Fragile parameters suggest over-fitting.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Project */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Project</label>
            <select
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
              <div>
                <p className="text-sm text-[#A78BFA]">
                  Running sensitivity analysis... {progress}%
                </p>
                <p className="text-[10px] text-[#7C8DB0] mt-0.5">{progressLabel}</p>
              </div>
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
            onClick={handleRunAnalysis}
            disabled={!projectId || !csvFile}
            className="mt-6 w-full py-3 px-4 rounded-lg font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Sensitivity Analysis
          </button>
        )}
      </div>

      {/* Summary */}
      {results.length > 0 && (
        <div
          className={`rounded-xl p-4 border ${
            fragileParams.length > robustParams.length
              ? "bg-[#EF4444]/10 border-[#EF4444]/30"
              : fragileParams.length > 0
                ? "bg-[#F59E0B]/10 border-[#F59E0B]/30"
                : "bg-[#10B981]/10 border-[#10B981]/30"
          }`}
        >
          <p className="text-sm text-[#CBD5E1]">
            <span className="font-semibold text-white">Summary:</span>{" "}
            {robustParams.length > 0 && (
              <>
                Your strategy is <span className="text-[#10B981] font-medium">robust</span> to{" "}
                {robustParams.map((r) => r.param.fieldName).join(", ")}
              </>
            )}
            {robustParams.length > 0 && fragileParams.length > 0 && " but "}
            {fragileParams.length > 0 && (
              <>
                <span className="text-[#EF4444] font-medium">fragile</span> to{" "}
                {fragileParams.map((r) => r.param.fieldName).join(", ")}. Consider using
                optimization or walk-forward validation for those parameters.
              </>
            )}
            {robustParams.length === 0 && fragileParams.length === 0 && (
              <>
                All parameters show <span className="text-[#F59E0B] font-medium">moderate</span>{" "}
                sensitivity.
              </>
            )}
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r) => (
            <SensitivityTable key={`${r.param.nodeId}-${r.param.fieldName}`} data={r} />
          ))}
        </div>
      )}
    </div>
  );
}
