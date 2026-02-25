"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ============================================
// Types
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

interface BacktestData {
  id: string;
  metadata: {
    eaName: string | null;
    symbol: string;
    timeframe: string;
    period: string;
    initialDeposit: number;
  };
  metrics: {
    totalNetProfit: number;
    profitFactor: number;
    maxDrawdownPct: number;
    expectedPayoff: number;
    totalTrades: number;
    winRate: number;
    sharpeRatio: number | null;
  };
  healthScore: number;
  healthStatus: string;
}

// ============================================
// Seedable PRNG (mulberry32) for reproducible Monte Carlo results
// ============================================

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to a 32-bit integer seed. */
function hashToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

// ============================================
// Monte Carlo Engine (seeded for reproducibility)
// ============================================

function runMonteCarlo(params: SimulationParams, seed: string): SimulationResult {
  const { winRate, rrRatio, riskPerTrade, numTrades, numSimulations, startBalance } = params;
  const winProb = winRate / 100;
  const risk = riskPerTrade / 100;

  // Validate inputs — guard against NaN/Infinity propagation
  if (!Number.isFinite(winProb) || !Number.isFinite(risk) || !Number.isFinite(rrRatio)) {
    return {
      medianFinalBalance: startBalance,
      p25FinalBalance: startBalance,
      p75FinalBalance: startBalance,
      medianMaxDrawdown: 0,
      worstMaxDrawdown: 0,
      probabilityOfRuin: 0,
      probabilityOf2x: 0,
      equityCurves: {
        best: [startBalance],
        worst: [startBalance],
        median: [startBalance],
        p25: [startBalance],
        p75: [startBalance],
      },
    };
  }

  const random = mulberry32(hashToSeed(seed));
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
      const win = random() < winProb;
      const pnl = win ? balance * risk * rrRatio : -balance * risk;
      balance += pnl;

      if (balance <= 0) {
        balance = 0;
        for (let r = t + 1; r <= numTrades; r++) curve.push(0);
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

  const sortedBalances = [...allFinalBalances].sort((a, b) => a - b);
  const sortedDrawdowns = [...allMaxDrawdowns].sort((a, b) => a - b);

  const percentile = (arr: number[], p: number) => {
    const idx = Math.floor(arr.length * p);
    return arr[Math.min(idx, arr.length - 1)];
  };

  const samplePoints = Math.min(numTrades + 1, 100);
  const step = Math.max(1, Math.floor(numTrades / (samplePoints - 1)));
  const sampleIndices: number[] = [];
  for (let i = 0; i <= numTrades; i += step) sampleIndices.push(i);
  if (sampleIndices[sampleIndices.length - 1] !== numTrades) sampleIndices.push(numTrades);

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
    probabilityOfRuin: (ruinCount / numSimulations) * 100,
    probabilityOf2x: (doubleCount / numSimulations) * 100,
    equityCurves: { best, worst, median, p25, p75 },
  };
}

// ============================================
// Helpers
// ============================================

function estimateRRRatio(metrics: BacktestData["metrics"]): number {
  // R:R ≈ (PF × lossRate) / winRate
  // Simplified: if PF = grossProfit/grossLoss and WR known,
  // then avgWin/avgLoss = PF × (1 - WR/100) / (WR/100)
  const wr = metrics.winRate / 100;
  if (wr <= 0 || wr >= 1 || metrics.profitFactor <= 0) return 1.5;
  const rr = (metrics.profitFactor * (1 - wr)) / wr;
  return Math.max(0.1, Math.min(20, Math.round(rr * 100) / 100));
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function getSurvivalColor(prob: number): string {
  if (prob >= 90) return "#22C55E";
  if (prob >= 70) return "#F59E0B";
  return "#EF4444";
}

function getSurvivalLabel(prob: number): string {
  if (prob >= 90) return "Ready for Live Trading";
  if (prob >= 70) return "Proceed with Caution";
  return "Not Recommended for Live";
}

// ============================================
// SVG Equity Curve Chart
// ============================================

function EquityCurveChart({
  curves,
  startBalance,
}: {
  curves: SimulationResult["equityCurves"];
  startBalance: number;
}) {
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 30, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

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

  const toX = (i: number) => padding.left + (i / (numPoints - 1)) * chartW;
  const toY = (val: number) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  const toPath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const toBandPath = (upper: number[], lower: number[]) => {
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
  };

  const yTicks = 5;
  const yLabels: number[] = [];
  for (let i = 0; i <= yTicks; i++) yLabels.push(minVal + (maxVal - minVal) * (i / yTicks));

  const fmtBal = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[800px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {yLabels.map((val, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={toY(val)}
              x2={width - padding.right}
              y2={toY(val)}
              stroke="rgba(79,70,229,0.1)"
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
              {fmtBal(val)}
            </text>
          </g>
        ))}
        <line
          x1={padding.left}
          y1={toY(startBalance)}
          x2={width - padding.right}
          y2={toY(startBalance)}
          stroke="rgba(148,163,184,0.3)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <path d={toBandPath(curves.best, curves.worst)} fill="rgba(79,70,229,0.08)" />
        <path d={toBandPath(curves.p75, curves.p25)} fill="rgba(79,70,229,0.15)" />
        <path
          d={toPath(curves.worst)}
          fill="none"
          stroke="#EF4444"
          strokeWidth={1.5}
          opacity={0.6}
        />
        <path d={toPath(curves.p25)} fill="none" stroke="#F59E0B" strokeWidth={1} opacity={0.5} />
        <path d={toPath(curves.median)} fill="none" stroke="#22D3EE" strokeWidth={2} />
        <path d={toPath(curves.p75)} fill="none" stroke="#10B981" strokeWidth={1} opacity={0.5} />
        <path
          d={toPath(curves.best)}
          fill="none"
          stroke="#10B981"
          strokeWidth={1.5}
          opacity={0.6}
        />
      </svg>
      <div className="flex flex-wrap gap-4 justify-center mt-2 text-xs text-[#7C8DB0]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#22D3EE] inline-block" /> Median
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#10B981] inline-block opacity-60" /> 75th / 95th
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#EF4444] inline-block opacity-60" /> 5th pctile
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#F59E0B] inline-block opacity-50" /> 25th pctile
        </span>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function ValidatePage() {
  const params = useParams();
  const id = params.id as string;

  const [backtest, setBacktest] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [simParams, setSimParams] = useState<SimulationParams | null>(null);

  // Fetch backtest data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/backtest/${id}`);
        if (!res.ok) {
          setError("Backtest not found");
          return;
        }
        const data = await res.json();
        setBacktest(data);

        // Auto-fill simulation params from backtest data
        const rr = estimateRRRatio(data.metrics);
        setSimParams({
          winRate: Math.round(data.metrics.winRate * 10) / 10,
          rrRatio: rr,
          riskPerTrade: 1, // Default 1% risk per trade (conservative)
          numTrades: Math.min(Math.max(data.metrics.totalTrades, 100), 2000),
          numSimulations: 1000,
          startBalance: data.metadata.initialDeposit || 10000,
        });
      } catch {
        setError("Failed to load backtest data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Auto-run simulation when params are ready
  useEffect(() => {
    if (simParams && !simResult && !running) {
      handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simParams]);

  const handleRun = useCallback(() => {
    if (!simParams) return;
    setRunning(true);
    setTimeout(() => {
      const result = runMonteCarlo(simParams, id);
      setSimResult(result);
      setRunning(false);
    }, 50);
  }, [simParams, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !backtest) {
    return (
      <div className="min-h-screen bg-[#0A0118]">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-[#EF4444] mb-4">{error || "Backtest not found"}</p>
          <Link href="/app/evaluate" className="text-sm text-[#A78BFA] hover:text-[#22D3EE]">
            &larr; Back to Backtests
          </Link>
        </div>
      </div>
    );
  }

  const survivalProb = simResult ? 100 - simResult.probabilityOfRuin : 0;

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app/evaluate"
            className="text-sm text-[#7C8DB0] hover:text-[#A78BFA] transition-colors mb-4 inline-block"
          >
            &larr; Back to Backtests
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Strategy Validation</h1>
          <p className="text-[#7C8DB0] mt-2">
            Monte Carlo simulation using your backtest parameters —{" "}
            {backtest.metadata.eaName || backtest.metadata.symbol}
          </p>
        </div>

        {/* Pre-filled Parameters Summary */}
        {simParams && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Parameters (from backtest)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-[#64748b]">Win Rate</span>
                <p className="text-[#CBD5E1] font-medium">{simParams.winRate}%</p>
              </div>
              <div>
                <span className="text-[#64748b]">R:R Ratio</span>
                <p className="text-[#CBD5E1] font-medium">{simParams.rrRatio.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[#64748b]">Risk/Trade</span>
                <p className="text-[#CBD5E1] font-medium">{simParams.riskPerTrade}%</p>
              </div>
              <div>
                <span className="text-[#64748b]">Trades</span>
                <p className="text-[#CBD5E1] font-medium">{simParams.numTrades}</p>
              </div>
              <div>
                <span className="text-[#64748b]">Simulations</span>
                <p className="text-[#CBD5E1] font-medium">
                  {simParams.numSimulations.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[#64748b]">Start Balance</span>
                <p className="text-[#CBD5E1] font-medium">
                  {formatCurrency(simParams.startBalance)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Running State */}
        {running && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white font-medium">Running 1,000 simulations...</p>
              <p className="text-xs text-[#7C8DB0] mt-1">This takes a few seconds</p>
            </div>
          </div>
        )}

        {/* Survival Probability Hero */}
        {simResult && !running && (
          <>
            <div
              className="rounded-2xl p-8 sm:p-10 border mb-6 text-center"
              style={{
                background: `${getSurvivalColor(survivalProb)}08`,
                borderColor: `${getSurvivalColor(survivalProb)}33`,
              }}
            >
              <p className="text-sm text-[#7C8DB0] mb-2">Survival Probability</p>
              <div
                className="text-6xl sm:text-7xl font-bold mb-3"
                style={{ color: getSurvivalColor(survivalProb) }}
              >
                {survivalProb.toFixed(1)}%
              </div>
              <p className="text-lg font-medium" style={{ color: getSurvivalColor(survivalProb) }}>
                {getSurvivalLabel(survivalProb)}
              </p>
              <p className="text-xs text-[#7C8DB0] mt-3 max-w-md mx-auto">
                Based on {simParams?.numSimulations.toLocaleString()} simulations of{" "}
                {simParams?.numTrades} trades using your backtest&apos;s win rate and risk:reward
                ratio. Results are deterministic for this backtest.
              </p>
              <p className="text-[10px] text-[#64748b] mt-2 max-w-lg mx-auto">
                This simulation assumes each trade is independent (IID). Real trading exhibits
                serial correlation — trend-following strategies may face clustered losses that this
                model underestimates. Results do not account for spreads, slippage, or commission
                costs.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
                <div className="text-xs text-[#7C8DB0] mb-1">Median Final</div>
                <div className="text-lg font-bold text-[#22D3EE]">
                  {formatCurrency(simResult.medianFinalBalance)}
                </div>
              </div>
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
                <div className="text-xs text-[#7C8DB0] mb-1">Max Drawdown</div>
                <div className="text-lg font-bold text-[#F59E0B]">
                  {simResult.medianMaxDrawdown.toFixed(1)}%
                </div>
                <div className="text-[10px] text-[#64748b]">
                  Worst: {simResult.worstMaxDrawdown.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
                <div className="text-xs text-[#7C8DB0] mb-1">Prob of Ruin</div>
                <div
                  className="text-lg font-bold"
                  style={{ color: simResult.probabilityOfRuin > 5 ? "#EF4444" : "#22C55E" }}
                >
                  {simResult.probabilityOfRuin.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
                <div className="text-xs text-[#7C8DB0] mb-1">Prob of 2x</div>
                <div
                  className="text-lg font-bold"
                  style={{ color: simResult.probabilityOf2x > 50 ? "#22C55E" : "#F59E0B" }}
                >
                  {simResult.probabilityOf2x.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Expandable Full Details */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[rgba(79,70,229,0.05)] transition-colors"
              >
                <span className="text-sm font-medium text-white">
                  Equity Curve &amp; Full Monte Carlo Output
                </span>
                <svg
                  className={`w-4 h-4 text-[#7C8DB0] transition-transform ${showDetails ? "rotate-180" : ""}`}
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

              {showDetails && (
                <div className="px-6 pb-6">
                  <p className="text-xs text-[#7C8DB0] mb-4">
                    Equity curve bands across {simParams?.numSimulations.toLocaleString()}{" "}
                    simulations. Cyan = median, green = favorable (75th/95th), red = worst case (5th
                    percentile).
                  </p>
                  <EquityCurveChart
                    curves={simResult.equityCurves}
                    startBalance={simParams?.startBalance || 10000}
                  />

                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#64748b]">25th Percentile Final</span>
                      <p className="text-[#CBD5E1] font-medium">
                        {formatCurrency(simResult.p25FinalBalance)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">75th Percentile Final</span>
                      <p className="text-[#CBD5E1] font-medium">
                        {formatCurrency(simResult.p75FinalBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Re-run with different params */}
            <div className="text-center">
              <Link
                href="/app/risk"
                className="text-xs text-[#7C8DB0] hover:text-[#A78BFA] transition-colors"
              >
                Want to adjust parameters? Use the full Monte Carlo calculator &rarr;
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
