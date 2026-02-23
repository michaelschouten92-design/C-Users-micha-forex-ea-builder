"use client";

import { useState, useCallback } from "react";

// ============================================
// TYPES
// ============================================

interface SimulationParams {
  winRate: number;
  rrRatio: number;
  riskPerTrade: number;
  numTrades: number;
  numSimulations: number;
  startBalance: number;
}

interface SimulationResult {
  medianFinalBalance: number;
  p25FinalBalance: number;
  p75FinalBalance: number;
  medianMaxDrawdown: number;
  worstMaxDrawdown: number;
  probabilityOfRuin: number;
  probabilityOf2x: number;
  equityCurves: {
    best: number[];
    worst: number[];
    median: number[];
    p25: number[];
    p75: number[];
  };
}

// ============================================
// MONTE CARLO ENGINE
// ============================================

function runMonteCarlo(params: SimulationParams): SimulationResult {
  const { winRate, rrRatio, riskPerTrade, numTrades, numSimulations, startBalance } = params;
  const winProb = Math.max(0.001, Math.min(0.999, winRate / 100));
  const safeRR = Math.max(0.001, rrRatio);
  const risk = Math.max(0.001, riskPerTrade / 100);
  const safeSimulations = Math.max(1, numSimulations);

  const allFinalBalances: number[] = [];
  const allMaxDrawdowns: number[] = [];
  const allCurves: number[][] = [];
  let ruinCount = 0;
  let doubleCount = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    let balance = startBalance;
    let peak = balance;
    let maxDD = 0;
    const curve: number[] = [balance];

    for (let t = 0; t < numTrades; t++) {
      const win = Math.random() < winProb;
      const pnl = win ? balance * risk * safeRR : -balance * risk;
      balance += pnl;

      if (balance <= 0) {
        balance = 0;
        // Fill remaining curve with zeros
        for (let r = t + 1; r <= numTrades; r++) {
          curve.push(0);
        }
        break;
      }

      peak = Math.max(peak, balance);
      const dd = (peak - balance) / peak;
      maxDD = Math.max(maxDD, dd);
      curve.push(balance);
    }

    allFinalBalances.push(balance);
    allMaxDrawdowns.push(maxDD * 100);
    allCurves.push(curve);

    if (balance <= 0) ruinCount++;
    if (balance >= startBalance * 2) doubleCount++;
  }

  // Sort for percentile calculations
  const sortedBalances = [...allFinalBalances].sort((a, b) => a - b);
  const sortedDrawdowns = [...allMaxDrawdowns].sort((a, b) => a - b);

  const percentile = (arr: number[], p: number) => {
    const idx = Math.floor(arr.length * p);
    return arr[Math.min(idx, arr.length - 1)];
  };

  // Build equity curve bands by sampling at regular intervals
  const samplePoints = Math.min(numTrades + 1, 100);
  const step = Math.max(1, Math.floor(numTrades / (samplePoints - 1)));
  const sampleIndices: number[] = [];
  for (let i = 0; i <= numTrades; i += step) {
    sampleIndices.push(i);
  }
  if (sampleIndices[sampleIndices.length - 1] !== numTrades) {
    sampleIndices.push(numTrades);
  }

  const best: number[] = [];
  const worst: number[] = [];
  const median: number[] = [];
  const p25: number[] = [];
  const p75: number[] = [];

  for (const idx of sampleIndices) {
    const values = allCurves
      .map((curve) => curve[Math.min(idx, curve.length - 1)])
      .sort((a, b) => a - b);

    worst.push(percentile(values, 0.05));
    p25.push(percentile(values, 0.25));
    median.push(percentile(values, 0.5));
    p75.push(percentile(values, 0.75));
    best.push(percentile(values, 0.95));
  }

  return {
    medianFinalBalance: percentile(sortedBalances, 0.5),
    p25FinalBalance: percentile(sortedBalances, 0.25),
    p75FinalBalance: percentile(sortedBalances, 0.75),
    medianMaxDrawdown: percentile(sortedDrawdowns, 0.5),
    worstMaxDrawdown: percentile(sortedDrawdowns, 0.95),
    probabilityOfRuin: (ruinCount / safeSimulations) * 100,
    probabilityOf2x: (doubleCount / safeSimulations) * 100,
    equityCurves: { best, worst, median, p25, p75 },
  };
}

// ============================================
// SVG EQUITY CURVE CHART
// ============================================

function EquityCurveChart({
  curves,
  startBalance,
}: {
  curves: SimulationResult["equityCurves"];
  startBalance: number;
}) {
  const width = 800;
  const height = 350;
  const padding = { top: 20, right: 20, bottom: 30, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find min/max across all curves
  const allValues = [
    ...curves.best,
    ...curves.worst,
    ...curves.median,
    ...curves.p25,
    ...curves.p75,
  ];
  const minVal = Math.max(0, Math.min(...allValues) * 0.95);
  const maxVal = Math.max(...allValues) * 1.05;
  const numPoints = curves.median.length;

  function toX(i: number): number {
    return padding.left + (i / (numPoints - 1)) * chartW;
  }

  function toY(val: number): number {
    return padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  }

  function toPath(data: number[]): string {
    return data
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      .join(" ");
  }

  // Band path between two curves
  function toBandPath(upper: number[], lower: number[]): string {
    const forward = upper
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      .join(" ");
    const backward = [...lower]
      .reverse()
      .map((v, i) => {
        const idx = lower.length - 1 - i;
        return `L${toX(idx).toFixed(1)},${toY(v).toFixed(1)}`;
      })
      .join(" ");
    return `${forward} ${backward} Z`;
  }

  // Y-axis labels
  const yTicks = 5;
  const yLabels: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    yLabels.push(minVal + (maxVal - minVal) * (i / yTicks));
  }

  function formatBalance(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[800px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yLabels.map((val, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={toY(val)}
              x2={width - padding.right}
              y2={toY(val)}
              stroke="rgba(79, 70, 229, 0.1)"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={toY(val) + 4}
              textAnchor="end"
              fill="#7C8DB0"
              fontSize={10}
              fontFamily="monospace"
            >
              {formatBalance(val)}
            </text>
          </g>
        ))}

        {/* Starting balance reference line */}
        <line
          x1={padding.left}
          y1={toY(startBalance)}
          x2={width - padding.right}
          y2={toY(startBalance)}
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* 5th-95th percentile band */}
        <path d={toBandPath(curves.best, curves.worst)} fill="rgba(79, 70, 229, 0.08)" />

        {/* 25th-75th percentile band */}
        <path d={toBandPath(curves.p75, curves.p25)} fill="rgba(79, 70, 229, 0.15)" />

        {/* Worst path (5th percentile) */}
        <path
          d={toPath(curves.worst)}
          fill="none"
          stroke="#EF4444"
          strokeWidth={1.5}
          opacity={0.6}
        />

        {/* 25th percentile */}
        <path d={toPath(curves.p25)} fill="none" stroke="#F59E0B" strokeWidth={1} opacity={0.5} />

        {/* Median path */}
        <path d={toPath(curves.median)} fill="none" stroke="#22D3EE" strokeWidth={2} />

        {/* 75th percentile */}
        <path d={toPath(curves.p75)} fill="none" stroke="#10B981" strokeWidth={1} opacity={0.5} />

        {/* Best path (95th percentile) */}
        <path
          d={toPath(curves.best)}
          fill="none"
          stroke="#10B981"
          strokeWidth={1.5}
          opacity={0.6}
        />

        {/* X-axis label */}
        <text x={width / 2} y={height - 4} textAnchor="middle" fill="#7C8DB0" fontSize={11}>
          Trades
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-2 text-xs text-[#7C8DB0]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#22D3EE] inline-block" /> Median
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#10B981] inline-block opacity-60" /> 75th / 95th
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#EF4444] inline-block opacity-60" /> 5th percentile
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#F59E0B] inline-block opacity-50" /> 25th percentile
        </span>
      </div>
    </div>
  );
}

// ============================================
// INPUT COMPONENT
// ============================================

function ParamInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8DB0] text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) onChange(Math.max(min, Math.min(max, val)));
          }}
          min={min}
          max={max}
          step={step}
          className={`w-full py-2.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200 ${
            prefix ? "pl-7 pr-4" : suffix ? "pl-4 pr-8" : "px-4"
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C8DB0] text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// RESULT CARD
// ============================================

function ResultCard({
  label,
  value,
  subValue,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: "green" | "red" | "cyan" | "amber";
}) {
  const colorMap = {
    green: "text-[#10B981]",
    red: "text-[#EF4444]",
    cyan: "text-[#22D3EE]",
    amber: "text-[#F59E0B]",
  };
  const valueColor = color ? colorMap[color] : "text-white";

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
      <div className="text-xs text-[#7C8DB0] mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      {subValue && <div className="text-xs text-[#7C8DB0] mt-0.5">{subValue}</div>}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RiskCalculator() {
  const [params, setParams] = useState<SimulationParams>({
    winRate: 55,
    rrRatio: 2,
    riskPerTrade: 1,
    numTrades: 500,
    numSimulations: 1000,
    startBalance: 10000,
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(() => {
    setRunning(true);
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const simResult = runMonteCarlo(params);
      setResult(simResult);
      setRunning(false);
    }, 50);
  }, [params]);

  function updateParam<K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function formatCurrency(val: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  }

  return (
    <div className="space-y-8">
      {/* Input Parameters */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Simulation Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ParamInput
            label="Win Rate"
            value={params.winRate}
            onChange={(v) => updateParam("winRate", v)}
            min={1}
            max={99}
            step={1}
            suffix="%"
          />
          <ParamInput
            label="Risk:Reward Ratio"
            value={params.rrRatio}
            onChange={(v) => updateParam("rrRatio", v)}
            min={0.1}
            max={20}
            step={0.1}
          />
          <ParamInput
            label="Risk per Trade"
            value={params.riskPerTrade}
            onChange={(v) => updateParam("riskPerTrade", v)}
            min={0.1}
            max={20}
            step={0.1}
            suffix="%"
          />
          <ParamInput
            label="Number of Trades"
            value={params.numTrades}
            onChange={(v) => updateParam("numTrades", v)}
            min={10}
            max={5000}
            step={10}
          />
          <ParamInput
            label="Number of Simulations"
            value={params.numSimulations}
            onChange={(v) => updateParam("numSimulations", v)}
            min={100}
            max={10000}
            step={100}
          />
          <ParamInput
            label="Starting Balance"
            value={params.startBalance}
            onChange={(v) => updateParam("startBalance", v)}
            min={100}
            max={10000000}
            step={1000}
            prefix="$"
          />
        </div>

        <div className="mt-6">
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {running ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Running {params.numSimulations.toLocaleString()} simulations...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Run Simulation
              </>
            )}
          </button>

          {/* Expected value info */}
          <p className="text-xs text-[#7C8DB0] mt-3">
            Expected edge per trade:{" "}
            <span className="text-[#CBD5E1]">
              {((params.winRate / 100) * params.rrRatio - (1 - params.winRate / 100)).toFixed(3)}R
            </span>{" "}
            (
            {(params.winRate / 100) * params.rrRatio - (1 - params.winRate / 100) > 0
              ? "positive edge"
              : "negative edge"}
            )
          </p>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ResultCard
              label="Median Final Balance"
              value={formatCurrency(result.medianFinalBalance)}
              subValue={`25th: ${formatCurrency(result.p25FinalBalance)} / 75th: ${formatCurrency(result.p75FinalBalance)}`}
              color="cyan"
            />
            <ResultCard
              label="Median Max Drawdown"
              value={`${result.medianMaxDrawdown.toFixed(1)}%`}
              subValue={`Worst (95th): ${result.worstMaxDrawdown.toFixed(1)}%`}
              color="amber"
            />
            <ResultCard
              label="Probability of Ruin"
              value={`${result.probabilityOfRuin.toFixed(1)}%`}
              subValue="Balance reaches $0"
              color={result.probabilityOfRuin > 5 ? "red" : "green"}
            />
            <ResultCard
              label="Probability of 2x"
              value={`${result.probabilityOf2x.toFixed(1)}%`}
              subValue={`Reaching ${formatCurrency(params.startBalance * 2)}`}
              color={result.probabilityOf2x > 50 ? "green" : "amber"}
            />
          </div>

          {/* Equity Curve Chart */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Equity Curve Bands</h2>
            <p className="text-xs text-[#7C8DB0] mb-4">
              Shows the range of outcomes across {params.numSimulations.toLocaleString()}{" "}
              simulations. The cyan line is the median path, green shows favorable outcomes
              (75th/95th percentile), and red shows worst-case (5th percentile).
            </p>
            <EquityCurveChart curves={result.equityCurves} startBalance={params.startBalance} />
          </div>
        </>
      )}
    </div>
  );
}
