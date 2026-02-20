"use client";

import { useState, useMemo } from "react";

// ============================================
// CRISIS SCENARIOS
// ============================================

interface CrisisScenario {
  id: string;
  name: string;
  date: string;
  description: string;
  pipeMove: number;
  duration: string;
  spreadMultiplier: number;
  gapRisk: boolean;
  volatilityMultiplier: number;
  slippagePips: number;
  fillDelay: string;
}

const CRISIS_SCENARIOS: CrisisScenario[] = [
  {
    id: "flash-crash-2010",
    name: "Flash Crash",
    date: "May 6, 2010",
    description:
      "A 1,000-pip move in the Dow Jones in approximately 5 minutes, triggered by algorithmic selling. Currency pairs like USDJPY experienced 300+ pip swings. Spreads widened to 50+ pips.",
    pipeMove: 1000,
    duration: "5 minutes",
    spreadMultiplier: 10,
    gapRisk: false,
    volatilityMultiplier: 20,
    slippagePips: 50,
    fillDelay: "30-60 seconds",
  },
  {
    id: "snb-shock-2015",
    name: "SNB Shock (EURCHF)",
    date: "Jan 15, 2015",
    description:
      "The Swiss National Bank removed the EURCHF floor at 1.2000, causing a 3,000-pip instant gap. Brokers could not fill orders for up to 30 minutes. Many retail traders and brokers went bankrupt.",
    pipeMove: 3000,
    duration: "Instant gap",
    spreadMultiplier: 100,
    gapRisk: true,
    volatilityMultiplier: 50,
    slippagePips: 500,
    fillDelay: "No fills for 30 min",
  },
  {
    id: "covid-crash-2020",
    name: "COVID Crash",
    date: "Mar 2020",
    description:
      "Sustained extreme volatility over weeks as global markets collapsed. Forex spreads were 5-10x normal for extended periods. GBPUSD dropped 1,200 pips in 10 days. VIX hit 82.",
    pipeMove: 1200,
    duration: "2-3 weeks",
    spreadMultiplier: 7,
    gapRisk: false,
    volatilityMultiplier: 5,
    slippagePips: 20,
    fillDelay: "1-5 seconds",
  },
  {
    id: "brexit-vote-2016",
    name: "Brexit Vote",
    date: "Jun 23, 2016",
    description:
      "GBPUSD fell 1,500 pips from 1.5000 to 1.3500 in 24 hours as the Leave vote won. Spreads on GBP pairs widened to 20-40 pips. Weekend gaps and erratic liquidity.",
    pipeMove: 1500,
    duration: "24 hours",
    spreadMultiplier: 5,
    gapRisk: true,
    volatilityMultiplier: 8,
    slippagePips: 30,
    fillDelay: "5-15 seconds",
  },
];

// ============================================
// STRATEGY PARAMS (user inputs)
// ============================================

interface StrategyParams {
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  accountBalance: number;
  lotSize: number;
  maxPositions: number;
  normalSpread: number;
}

// ============================================
// ANALYSIS RESULT
// ============================================

interface ScenarioAnalysis {
  scenario: CrisisScenario;
  maxPotentialLoss: number;
  maxLossPercent: number;
  slWouldFill: boolean;
  slSlippageLoss: number;
  spreadCostImpact: number;
  riskManagementProtects: boolean;
  severity: "low" | "moderate" | "high" | "catastrophic";
  recommendations: string[];
}

function analyzeScenario(scenario: CrisisScenario, params: StrategyParams): ScenarioAnalysis {
  const pipValue = 10; // USD per pip for 1 standard lot (major pairs)
  const totalExposureLots = params.lotSize * params.maxPositions;

  // Spread cost during crisis
  const crisisSpread = params.normalSpread * scenario.spreadMultiplier;
  const spreadCostImpact = crisisSpread * pipValue * totalExposureLots;

  // Check if SL would fill
  const slWouldFill = !scenario.gapRisk;

  // Slippage beyond SL
  const effectiveSlippage = scenario.gapRisk
    ? Math.min(scenario.pipeMove, scenario.slippagePips)
    : Math.min(scenario.slippagePips, params.stopLoss * 0.5);

  const slSlippageLoss = effectiveSlippage * pipValue * totalExposureLots;

  // Maximum potential loss
  let maxPotentialLoss: number;
  if (scenario.gapRisk) {
    // In a gap scenario, SL may not protect at all
    maxPotentialLoss =
      Math.min(scenario.pipeMove, scenario.slippagePips + params.stopLoss) *
      pipValue *
      totalExposureLots;
  } else {
    // SL fills but with slippage
    maxPotentialLoss =
      (params.stopLoss + effectiveSlippage) * pipValue * totalExposureLots + spreadCostImpact;
  }

  maxPotentialLoss = Math.min(maxPotentialLoss, params.accountBalance);

  const maxLossPercent = (maxPotentialLoss / params.accountBalance) * 100;

  // Risk management assessment
  const intendedRiskAmount =
    params.accountBalance * (params.riskPercent / 100) * params.maxPositions;
  const riskManagementProtects = maxPotentialLoss <= intendedRiskAmount * 1.5;

  // Severity
  let severity: ScenarioAnalysis["severity"];
  if (maxLossPercent <= 5) severity = "low";
  else if (maxLossPercent <= 20) severity = "moderate";
  else if (maxLossPercent <= 50) severity = "high";
  else severity = "catastrophic";

  // Recommendations
  const recommendations: string[] = [];

  if (scenario.gapRisk) {
    recommendations.push(
      "Use guaranteed stop-loss orders (GSLO) if your broker offers them, especially before major news events."
    );
  }

  if (maxLossPercent > 20) {
    recommendations.push(
      `Reduce lot size to ${(params.lotSize * 0.5).toFixed(2)} or fewer to limit exposure during extreme events.`
    );
  }

  if (params.maxPositions > 1) {
    recommendations.push(
      "Consider reducing max simultaneous positions to 1 during high-risk periods."
    );
  }

  if (scenario.spreadMultiplier > 5) {
    recommendations.push(
      "Avoid trading during extreme volatility events. Implement a volatility filter (e.g., ATR threshold)."
    );
  }

  if (scenario.volatilityMultiplier > 10) {
    recommendations.push(
      "Consider implementing a daily loss limit (circuit breaker) to automatically stop trading after a threshold loss."
    );
  }

  if (params.riskPercent > 2) {
    recommendations.push(
      "Risk per trade above 2% amplifies damage in crisis scenarios. Consider reducing to 1-2%."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Your risk parameters appear reasonable for this scenario. Continue monitoring during live trading."
    );
  }

  return {
    scenario,
    maxPotentialLoss,
    maxLossPercent,
    slWouldFill,
    slSlippageLoss,
    spreadCostImpact,
    riskManagementProtects,
    severity,
    recommendations,
  };
}

// ============================================
// SEVERITY BADGE
// ============================================

function SeverityBadge({ severity }: { severity: ScenarioAnalysis["severity"] }) {
  const config = {
    low: {
      label: "Low Risk",
      bg: "bg-[#10B981]/15",
      text: "text-[#10B981]",
      border: "border-[#10B981]/30",
    },
    moderate: {
      label: "Moderate",
      bg: "bg-[#F59E0B]/15",
      text: "text-[#F59E0B]",
      border: "border-[#F59E0B]/30",
    },
    high: {
      label: "High Risk",
      bg: "bg-[#EF4444]/15",
      text: "text-[#EF4444]",
      border: "border-[#EF4444]/30",
    },
    catastrophic: {
      label: "Catastrophic",
      bg: "bg-[#DC2626]/20",
      text: "text-[#DC2626]",
      border: "border-[#DC2626]/40",
    },
  };

  const c = config[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${c.bg} ${c.text} border ${c.border}`}
    >
      {c.label}
    </span>
  );
}

// ============================================
// SCENARIO CARD
// ============================================

function ScenarioCard({ analysis }: { analysis: ScenarioAnalysis }) {
  const [expanded, setExpanded] = useState(false);
  const s = analysis.scenario;

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden hover:border-[rgba(79,70,229,0.4)] transition-all duration-200">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-semibold text-white">{s.name}</h3>
            <span className="text-[10px] text-[#7C8DB0]">{s.date}</span>
            <SeverityBadge severity={analysis.severity} />
          </div>
          <p className="text-xs text-[#7C8DB0] line-clamp-1">{s.description}</p>
        </div>
        <div className="flex items-center gap-4 ml-4 shrink-0">
          <div className="text-right">
            <p
              className={`text-sm font-bold ${analysis.maxLossPercent > 20 ? "text-[#EF4444]" : analysis.maxLossPercent > 5 ? "text-[#F59E0B]" : "text-[#10B981]"}`}
            >
              -{analysis.maxLossPercent.toFixed(1)}%
            </p>
            <p className="text-[10px] text-[#7C8DB0]">max loss</p>
          </div>
          <svg
            className={`w-4 h-4 text-[#7C8DB0] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[rgba(79,70,229,0.1)]">
          <div className="pt-4">
            <p className="text-xs text-[#94A3B8]">{s.description}</p>
          </div>

          {/* Scenario Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                Price Move
              </p>
              <p className="text-sm font-medium text-white">{s.pipeMove} pips</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Duration</p>
              <p className="text-sm font-medium text-white">{s.duration}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Spread x</p>
              <p className="text-sm font-medium text-white">{s.spreadMultiplier}x normal</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Slippage</p>
              <p className="text-sm font-medium text-white">{s.slippagePips} pips</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Gap Risk</p>
              <p
                className={`text-sm font-medium ${s.gapRisk ? "text-[#EF4444]" : "text-[#10B981]"}`}
              >
                {s.gapRisk ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                Fill Delay
              </p>
              <p className="text-sm font-medium text-white">{s.fillDelay}</p>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-[#0A0118] rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">
              Impact on Your Strategy
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#7C8DB0]">Max Potential Loss</span>
                <span
                  className={`font-medium ${analysis.maxLossPercent > 20 ? "text-[#EF4444]" : "text-[#F59E0B]"}`}
                >
                  {formatCurrency(analysis.maxPotentialLoss)} ({analysis.maxLossPercent.toFixed(1)}
                  %)
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#7C8DB0]">Spread Cost Impact</span>
                <span className="text-[#F59E0B] font-medium">
                  {formatCurrency(analysis.spreadCostImpact)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#7C8DB0]">Stop-Loss Would Fill</span>
                <span
                  className={`font-medium ${analysis.slWouldFill ? "text-[#10B981]" : "text-[#EF4444]"}`}
                >
                  {analysis.slWouldFill ? "Likely (with slippage)" : "Unlikely (gap risk)"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#7C8DB0]">Slippage Loss</span>
                <span className="text-[#EF4444] font-medium">
                  {formatCurrency(analysis.slSlippageLoss)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm sm:col-span-2">
                <span className="text-[#7C8DB0]">Risk Management Protects?</span>
                <span
                  className={`font-medium ${analysis.riskManagementProtects ? "text-[#10B981]" : "text-[#EF4444]"}`}
                >
                  {analysis.riskManagementProtects
                    ? "Yes, within acceptable range"
                    : "No, potential for outsized loss"}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-2">
              Recommendations
            </h4>
            <ul className="space-y-1.5">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#94A3B8]">
                  <span className="text-[#4F46E5] mt-0.5 shrink-0">-</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StressTesting() {
  const [params, setParams] = useState<StrategyParams>({
    stopLoss: 30,
    takeProfit: 60,
    riskPercent: 1,
    accountBalance: 10000,
    lotSize: 0.1,
    maxPositions: 1,
    normalSpread: 1.5,
  });

  function updateParam<K extends keyof StrategyParams>(key: K, value: StrategyParams[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  const analyses = useMemo(() => CRISIS_SCENARIOS.map((s) => analyzeScenario(s, params)), [params]);

  const worstCase = analyses.reduce((worst, a) =>
    a.maxLossPercent > worst.maxLossPercent ? a : worst
  );

  return (
    <div className="space-y-6">
      {/* Strategy Parameters */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Crisis Stress Testing</h3>
        <p className="text-xs text-[#7C8DB0] mb-4">
          Test how your strategy parameters would perform during historical market crises. Enter
          your risk settings below.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">Account Balance</label>
            <input
              type="number"
              value={params.accountBalance}
              onChange={(e) => updateParam("accountBalance", parseFloat(e.target.value) || 10000)}
              min={100}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Stop Loss (pips)
            </label>
            <input
              type="number"
              value={params.stopLoss}
              onChange={(e) => updateParam("stopLoss", parseFloat(e.target.value) || 30)}
              min={1}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Take Profit (pips)
            </label>
            <input
              type="number"
              value={params.takeProfit}
              onChange={(e) => updateParam("takeProfit", parseFloat(e.target.value) || 60)}
              min={1}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Risk per Trade (%)
            </label>
            <input
              type="number"
              value={params.riskPercent}
              onChange={(e) => updateParam("riskPercent", parseFloat(e.target.value) || 1)}
              min={0.1}
              max={20}
              step={0.1}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">Lot Size</label>
            <input
              type="number"
              value={params.lotSize}
              onChange={(e) => updateParam("lotSize", parseFloat(e.target.value) || 0.1)}
              min={0.01}
              step={0.01}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">Max Positions</label>
            <input
              type="number"
              value={params.maxPositions}
              onChange={(e) => updateParam("maxPositions", parseInt(e.target.value) || 1)}
              min={1}
              max={20}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Normal Spread (pips)
            </label>
            <input
              type="number"
              value={params.normalSpread}
              onChange={(e) => updateParam("normalSpread", parseFloat(e.target.value) || 1.5)}
              min={0}
              step={0.1}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div
        className={`rounded-xl p-4 border ${
          worstCase.maxLossPercent > 50
            ? "bg-[#DC2626]/10 border-[#DC2626]/30"
            : worstCase.maxLossPercent > 20
              ? "bg-[#EF4444]/10 border-[#EF4444]/30"
              : worstCase.maxLossPercent > 5
                ? "bg-[#F59E0B]/10 border-[#F59E0B]/30"
                : "bg-[#10B981]/10 border-[#10B981]/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-[#F59E0B] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <p className="text-sm text-[#CBD5E1]">
            <span className="font-semibold text-white">Worst-case scenario:</span>{" "}
            {worstCase.scenario.name} could cause a{" "}
            <span
              className={`font-bold ${worstCase.maxLossPercent > 20 ? "text-[#EF4444]" : "text-[#F59E0B]"}`}
            >
              {worstCase.maxLossPercent.toFixed(1)}% drawdown
            </span>{" "}
            on your account with current settings.
          </p>
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="space-y-3">
        {analyses.map((analysis) => (
          <ScenarioCard key={analysis.scenario.id} analysis={analysis} />
        ))}
      </div>
    </div>
  );
}
