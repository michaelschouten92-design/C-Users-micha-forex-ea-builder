"use client";

import { useState, useMemo } from "react";

// ============================================
// TYPES
// ============================================

interface PositionSizingInputs {
  accountBalance: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  slDistance: number;
  pipValue: number;
  riskPercent: number;
}

interface SizingResults {
  kelly: { fraction: number; lots: number; warning: boolean };
  fixedFractional: { lots: number };
  optimalF: { fraction: number; lots: number };
}

// ============================================
// CALCULATION ENGINE
// ============================================

function calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
  const W = winRate / 100;
  const L = 1 - W;
  const R = avgLoss > 0 ? avgWin / avgLoss : 0;
  if (R <= 0) return 0;
  const f = (W * R - L) / R;
  return Math.max(0, f);
}

function calculateFixedFractional(
  balance: number,
  riskPercent: number,
  slPips: number,
  pipValue: number
): number {
  if (slPips <= 0 || pipValue <= 0) return 0;
  return (balance * (riskPercent / 100)) / (slPips * pipValue);
}

function calculateOptimalF(winRate: number, avgWin: number, avgLoss: number): number {
  // Iterative search for the fraction that maximizes geometric growth
  // Using the formula: TWR = product of (1 + f * (-trade_i / worst_loss))
  // We simulate with representative outcomes based on win rate and avg win/loss
  const W = winRate / 100;
  const L = 1 - W;

  if (avgLoss <= 0 || avgWin <= 0) return 0;

  let bestF = 0;
  let bestGrowth = 0;

  for (let f = 0.01; f <= 1.0; f += 0.01) {
    // Geometric mean return per trade
    const winReturn = 1 + f * (avgWin / avgLoss);
    const lossReturn = 1 - f;

    if (lossReturn <= 0) break;

    // Geometric mean: G = winReturn^W * lossReturn^L
    const G = Math.pow(winReturn, W) * Math.pow(lossReturn, L);

    if (G > bestGrowth) {
      bestGrowth = G;
      bestF = f;
    }
  }

  return bestGrowth > 1 ? bestF : 0;
}

function computeResults(inputs: PositionSizingInputs): SizingResults {
  const { accountBalance, winRate, avgWin, avgLoss, slDistance, pipValue, riskPercent } = inputs;

  const kellyFraction = calculateKellyCriterion(winRate, avgWin, avgLoss);
  const kellyLots =
    slDistance > 0 && pipValue > 0 ? (accountBalance * kellyFraction) / (slDistance * pipValue) : 0;

  const fixedLots = calculateFixedFractional(accountBalance, riskPercent, slDistance, pipValue);

  const optimalFraction = calculateOptimalF(winRate, avgWin, avgLoss);
  const optimalFLots =
    slDistance > 0 && pipValue > 0
      ? (accountBalance * optimalFraction) / (slDistance * pipValue)
      : 0;

  return {
    kelly: {
      fraction: kellyFraction * 100,
      lots: Math.max(0, Math.round(kellyLots * 100) / 100),
      warning: kellyFraction > 0.05,
    },
    fixedFractional: {
      lots: Math.max(0, Math.round(fixedLots * 100) / 100),
    },
    optimalF: {
      fraction: optimalFraction * 100,
      lots: Math.max(0, Math.round(optimalFLots * 100) / 100),
    },
  };
}

// ============================================
// INPUT COMPONENT
// ============================================

function SizingInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  prefix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  prefix?: string;
  hint?: string;
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
      {hint && <p className="text-[10px] text-[#7C8DB0] mt-1">{hint}</p>}
    </div>
  );
}

// ============================================
// BAR CHART COMPONENT
// ============================================

function ComparisonBars({ results }: { results: SizingResults }) {
  const methods = [
    { label: "Kelly Criterion", lots: results.kelly.lots, color: "#4F46E5" },
    { label: "Fixed Fractional", lots: results.fixedFractional.lots, color: "#22D3EE" },
    { label: "Optimal-f", lots: results.optimalF.lots, color: "#10B981" },
  ];

  const maxLots = Math.max(...methods.map((m) => m.lots), 0.01);

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const widthPct = maxLots > 0 ? (method.lots / maxLots) * 100 : 0;
        return (
          <div key={method.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-[#CBD5E1]">{method.label}</span>
              <span className="text-xs font-semibold text-white">
                {method.lots.toFixed(2)} lots
              </span>
            </div>
            <div className="w-full bg-[#0A0118] rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(widthPct, 2)}%`,
                  backgroundColor: method.color,
                }}
              >
                {widthPct > 15 && (
                  <span className="text-[10px] font-medium text-white/80">
                    {method.lots.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PositionSizing() {
  const [inputs, setInputs] = useState<PositionSizingInputs>({
    accountBalance: 10000,
    winRate: 55,
    avgWin: 150,
    avgLoss: 100,
    slDistance: 30,
    pipValue: 10,
    riskPercent: 1,
  });

  function updateInput<K extends keyof PositionSizingInputs>(
    key: K,
    value: PositionSizingInputs[K]
  ) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  const results = useMemo(() => computeResults(inputs), [inputs]);

  return (
    <div className="space-y-6">
      {/* Input Parameters */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Position Sizing Calculator</h2>
        <p className="text-xs text-[#7C8DB0] mb-4">
          Compare three methods to determine optimal lot size for your next trade.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SizingInput
            label="Account Balance"
            value={inputs.accountBalance}
            onChange={(v) => updateInput("accountBalance", v)}
            min={100}
            max={10000000}
            step={1000}
            prefix="$"
          />
          <SizingInput
            label="Win Rate"
            value={inputs.winRate}
            onChange={(v) => updateInput("winRate", v)}
            min={1}
            max={99}
            step={1}
            suffix="%"
          />
          <SizingInput
            label="Average Win"
            value={inputs.avgWin}
            onChange={(v) => updateInput("avgWin", v)}
            min={1}
            max={100000}
            step={10}
            prefix="$"
          />
          <SizingInput
            label="Average Loss"
            value={inputs.avgLoss}
            onChange={(v) => updateInput("avgLoss", v)}
            min={1}
            max={100000}
            step={10}
            prefix="$"
          />
          <SizingInput
            label="Stop Loss Distance"
            value={inputs.slDistance}
            onChange={(v) => updateInput("slDistance", v)}
            min={1}
            max={5000}
            step={1}
            suffix="pips"
          />
          <SizingInput
            label="Pip Value"
            value={inputs.pipValue}
            onChange={(v) => updateInput("pipValue", v)}
            min={0.01}
            max={100}
            step={0.1}
            prefix="$"
            hint="Per standard lot. $10 for most majors, $1 for micro lots."
          />
          <SizingInput
            label="Fixed Risk %"
            value={inputs.riskPercent}
            onChange={(v) => updateInput("riskPercent", v)}
            min={0.1}
            max={20}
            step={0.1}
            suffix="%"
            hint="Used only for Fixed Fractional method."
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kelly Criterion */}
        <div
          className={`bg-[#1A0626] border rounded-xl p-5 ${
            results.kelly.warning ? "border-[#F59E0B]/40" : "border-[rgba(79,70,229,0.2)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            <h3 className="text-sm font-semibold text-white">Kelly Criterion</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {results.kelly.lots.toFixed(2)} <span className="text-sm text-[#7C8DB0]">lots</span>
          </p>
          <p className="text-xs text-[#7C8DB0]">
            Risk fraction: {results.kelly.fraction.toFixed(2)}%
          </p>
          <p className="text-[10px] text-[#7C8DB0] mt-2">f* = (W x R - L) / R</p>
          {results.kelly.warning && (
            <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              <svg
                className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-[10px] text-[#F59E0B]">
                Kelly suggests risking {results.kelly.fraction.toFixed(1)}% per trade, which exceeds
                5%. Most traders use half-Kelly or less to reduce volatility.
              </p>
            </div>
          )}
        </div>

        {/* Fixed Fractional */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22D3EE]" />
            <h3 className="text-sm font-semibold text-white">Fixed Fractional</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {results.fixedFractional.lots.toFixed(2)}{" "}
            <span className="text-sm text-[#7C8DB0]">lots</span>
          </p>
          <p className="text-xs text-[#7C8DB0]">
            Risking {inputs.riskPercent}% = $
            {((inputs.accountBalance * inputs.riskPercent) / 100).toFixed(2)}
          </p>
          <p className="text-[10px] text-[#7C8DB0] mt-2">
            lots = (balance x risk%) / (SL x pipValue)
          </p>
        </div>

        {/* Optimal-f */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <h3 className="text-sm font-semibold text-white">Optimal-f</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {results.optimalF.lots.toFixed(2)} <span className="text-sm text-[#7C8DB0]">lots</span>
          </p>
          <p className="text-xs text-[#7C8DB0]">
            Optimal fraction: {results.optimalF.fraction.toFixed(2)}%
          </p>
          <p className="text-[10px] text-[#7C8DB0] mt-2">Iterative geometric growth maximization</p>
        </div>
      </div>

      {/* Visual Comparison */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Lot Size Comparison</h3>
        <ComparisonBars results={results} />
        <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
          <p className="text-[10px] text-[#7C8DB0]">
            <strong className="text-[#CBD5E1]">Kelly Criterion</strong> maximizes long-term growth
            but is aggressive. <strong className="text-[#CBD5E1]">Fixed Fractional</strong> is the
            most conservative and commonly used.{" "}
            <strong className="text-[#CBD5E1]">Optimal-f</strong> finds the fraction that maximizes
            geometric return but can produce large drawdowns.
          </p>
        </div>
      </div>
    </div>
  );
}
