"use client";

/* ─────────────────────────────────────────────
   Static demo data — no API calls
   ───────────────────────────────────────────── */

const DEMO = {
  strategy: { name: "EMA Crossover — EURUSD H1", id: "AS-1042", version: 7 },
  instance: {
    symbol: "EURUSD",
    timeframe: "H1",
    broker: "ICMarkets",
    mode: "Live",
    runningSince: "2025-09-14",
  },
  trackRecord: {
    totalTrades: 847,
    winRate: 58.3,
    maxDrawdownPct: 8.2,
    netProfit: 4_218.6,
    balance: 14_218.6,
    equity: 14_340.2,
  },
  health: {
    status: "HEALTHY" as const,
    overallScore: 0.78,
    returnScore: 0.82,
    drawdownScore: 0.85,
    winRateScore: 0.71,
    volatilityScore: 0.74,
    tradeFrequencyScore: 0.76,
    confidenceLower: 0.72,
    confidenceUpper: 0.84,
    driftDetected: false,
    driftSeverity: 0.18,
    primaryDriver: "Return score driving overall health",
    scoreTrend: "stable" as const,
    expectancy: 0.042,
    tradesSampled: 847,
    windowDays: 164,
    liveReturnPct: 42.2,
    liveMaxDrawdownPct: 8.2,
    liveWinRate: 58.3,
    liveTradesPerDay: 5.16,
    baselineReturnPct: 38.7,
    baselineMaxDDPct: 9.4,
    baselineWinRate: 56.1,
    baselineTradesPerDay: 4.8,
  },
  metrics: {
    sharpeRatio: 1.42,
    sortinoRatio: 2.18,
    calmarRatio: 5.15,
    profitFactor: 1.64,
    maxDDDuration: "12d 4h",
  },
  lifecycle: { phase: "PROVEN" as const, provenAt: "2025-12-01" },
  chain: { length: 2_941, checkpointCount: 49, lastCheckpoint: "2026-02-23" },
  brokerVerification: { evidenceCount: 24, matchedCount: 24, mismatchedCount: 0 },
  scoreHistory: [
    0.62, 0.65, 0.68, 0.7, 0.71, 0.73, 0.72, 0.74, 0.76, 0.75, 0.77, 0.78, 0.76, 0.78, 0.79, 0.78,
  ],
  equityCurve: [
    10000, 10120, 10080, 10260, 10340, 10290, 10480, 10560, 10620, 10540, 10710, 10890, 10980,
    11120, 11060, 11240, 11380, 11320, 11490, 11620, 11580, 11740, 11860, 11940, 12080, 12160,
    12100, 12280, 12420, 12540, 12480, 12640, 12780, 12920, 12860, 13040, 13180, 13260, 13340,
    13480, 13560, 13640, 13720, 13860, 13940, 14020, 14100, 14220,
  ],
};

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

const STATUS_COLORS = {
  HEALTHY: { color: "#10B981", label: "Healthy" },
  WARNING: { color: "#F59E0B", label: "Warning" },
  DEGRADED: { color: "#EF4444", label: "Degraded" },
} as const;

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#7C8DB0]">{label}</span>
        <span className="text-white font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#0A0118] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-[#7C8DB0] mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricRow({ label, live, baseline }: { label: string; live: string; baseline: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5">
      <span className="text-[#7C8DB0]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-white font-medium">{live}</span>
        <span className="text-[#7C8DB0] text-[10px]">vs {baseline}</span>
      </div>
    </div>
  );
}

function MiniEquityCurve({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 600;
  const H = 160;
  const pad = 4;

  const path = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (W - 2 * pad);
      const y = H - pad - ((p - min) / range) * (H - 2 * pad);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const fillPath = `${path} L${W - pad},${H} L${pad},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="demoEquityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#demoEquityGrad)" />
      <path d={path} fill="none" stroke="#10B981" strokeWidth="2" />
    </svg>
  );
}

function HealthSparkline({ scores }: { scores: number[] }) {
  const W = 200;
  const H = 32;
  const pad = 1;

  const path = scores
    .map((s, i) => {
      const x = pad + (i / Math.max(scores.length - 1, 1)) * (W - 2 * pad);
      const y = H - pad - s * (H - 2 * pad);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join("");

  const latest = scores[scores.length - 1];
  const stroke = latest >= 0.7 ? "#10B981" : latest >= 0.4 ? "#F59E0B" : "#EF4444";
  const warningY = H - pad - 0.7 * (H - 2 * pad);
  const degradedY = H - pad - 0.4 * (H - 2 * pad);

  return (
    <div className="pt-3 border-t border-[rgba(79,70,229,0.1)]">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Score History</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
        <rect x={0} y={pad} width={W} height={warningY - pad} fill="#EF4444" opacity={0.05} />
        <rect
          x={0}
          y={warningY}
          width={W}
          height={degradedY - warningY}
          fill="#F59E0B"
          opacity={0.05}
        />
        <rect
          x={0}
          y={degradedY}
          width={W}
          height={H - pad - degradedY}
          fill="#10B981"
          opacity={0.05}
        />
        <line
          x1={0}
          y1={warningY}
          x2={W}
          y2={warningY}
          stroke="#7C8DB0"
          strokeWidth={0.3}
          strokeDasharray="2,2"
        />
        <line
          x1={0}
          y1={degradedY}
          x2={W}
          y2={degradedY}
          stroke="#7C8DB0"
          strokeWidth={0.3}
          strokeDasharray="2,2"
        />
        <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main demo component
   ───────────────────────────────────────────── */

export function SampleEvaluationDemo() {
  const d = DEMO;
  const h = d.health;
  const cfg = STATUS_COLORS[h.status];
  const scorePct = Math.round(h.overallScore * 100);
  const ciLower = Math.round(h.confidenceLower * 100);
  const ciUpper = Math.round(h.confidenceUpper * 100);

  return (
    <div className="bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-2xl overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{d.strategy.name}</h2>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#4F46E5]/10 border border-[#4F46E5]/20 text-xs font-mono font-medium text-[#A78BFA]">
              {d.strategy.id}
            </span>
            <span className="text-xs text-[#7C8DB0] bg-[#1A0626] px-2 py-0.5 rounded">
              v{d.strategy.version}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Strategy Status Badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border"
              style={{
                backgroundColor: "#10B98115",
                color: "#10B981",
                borderColor: "#10B98125",
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Consistent
            </span>

            {/* Lifecycle Badge */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border"
              style={{
                backgroundColor: "#10B98115",
                color: "#10B981",
                borderColor: "#10B98125",
              }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Established
            </span>

            {/* Verification Badge — L1 */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
              style={{
                backgroundColor: "#3B82F610",
                color: "#3B82F6",
                borderColor: "#3B82F620",
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Ledger Verified
            </span>

            {/* Broker Verified */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Broker Verified
            </span>

            <span className="text-xs text-[#7C8DB0]">
              {d.instance.symbol} {d.instance.timeframe} @ {d.instance.broker}
            </span>
          </div>
        </div>

        {/* ── Risk Disclaimer ── */}
        <div className="bg-[#1A0626]/50 border border-[#F59E0B]/20 rounded-lg px-4 py-3 mb-6">
          <p className="text-[11px] text-[#F59E0B]/80 leading-relaxed">
            Sample data for demonstration. Past results do not guarantee future returns. All trading
            involves risk.
          </p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Trades" value={d.trackRecord.totalTrades.toLocaleString()} />
          <StatCard label="Win Rate" value={`${d.trackRecord.winRate}%`} />
          <StatCard label="Max Drawdown" value={`${d.trackRecord.maxDrawdownPct}%`} />
          <StatCard label="Net Profit" value={`$${d.trackRecord.netProfit.toLocaleString()}`} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Balance" value={`$${d.trackRecord.balance.toLocaleString()}`} />
          <StatCard label="Equity" value={`$${d.trackRecord.equity.toLocaleString()}`} />
          <StatCard label="Status" value="Running" sub={`Live Mode @ ${d.instance.broker}`} />
          <StatCard
            label="Running Since"
            value={new Date(d.instance.runningSince).toLocaleDateString()}
            sub={d.instance.mode + " Mode"}
          />
        </div>

        {/* ── Risk Metrics ── */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Risk Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Sharpe Ratio", value: d.metrics.sharpeRatio.toFixed(2) },
              { label: "Sortino Ratio", value: d.metrics.sortinoRatio.toFixed(2) },
              { label: "Calmar Ratio", value: d.metrics.calmarRatio.toFixed(2) },
              { label: "Profit Factor", value: d.metrics.profitFactor.toFixed(2) },
              { label: "Max DD Duration", value: d.metrics.maxDDDuration },
            ].map((m) => (
              <div key={m.label} className="bg-[#0A0118]/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                  {m.label}
                </p>
                <p className="text-sm font-medium text-white">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Broker Verification ── */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Broker Verification</h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-[#7C8DB0]">Evidence Count</p>
              <p className="text-white font-medium">{d.brokerVerification.evidenceCount}</p>
            </div>
            <div>
              <p className="text-[#7C8DB0]">Matched</p>
              <p className="text-[#10B981] font-medium">{d.brokerVerification.matchedCount}</p>
            </div>
            <div>
              <p className="text-[#7C8DB0]">Mismatches</p>
              <p className="text-[#10B981] font-medium">{d.brokerVerification.mismatchedCount}</p>
            </div>
          </div>
        </div>

        {/* ── Equity Curve ── */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Equity Curve</h3>
          <MiniEquityCurve points={d.equityCurve} />
        </div>

        {/* ── Health Score ── */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-white mb-4">Strategy Health Score</h3>

          <div className="p-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border"
                  style={{
                    backgroundColor: `${cfg.color}20`,
                    color: cfg.color,
                    borderColor: `${cfg.color}30`,
                  }}
                >
                  {cfg.label}
                </span>
                <span className="text-xs text-[#7C8DB0]">
                  {scorePct}%
                  <span className="text-[10px] ml-1 opacity-70">
                    ({ciLower}–{ciUpper}%)
                  </span>
                </span>
              </div>
              <span className="text-[10px] text-[#7C8DB0]">
                {h.tradesSampled} trades / {h.windowDays}d window
              </span>
            </div>

            {/* Driver + Trend + Expectancy */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#7C8DB0]">
              <span>{h.primaryDriver}</span>
              <span className="flex items-center gap-0.5">
                <span className="text-[#7C8DB0]">&#9654;</span> {h.scoreTrend}
              </span>
              <span>Exp: +{h.expectancy.toFixed(3)}%/trade</span>
            </div>

            {/* Score Bars */}
            <div className="space-y-2.5">
              <ScoreBar score={h.returnScore} label="Return" />
              <ScoreBar score={h.drawdownScore} label="Drawdown" />
              <ScoreBar score={h.winRateScore} label="Win Rate" />
              <ScoreBar score={h.volatilityScore} label="Volatility" />
              <ScoreBar score={h.tradeFrequencyScore} label="Trade Frequency" />
            </div>

            {/* Live vs Baseline */}
            <div className="pt-3 border-t border-[rgba(79,70,229,0.1)]">
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-2">
                Live vs Baseline
              </p>
              <MetricRow
                label="Return"
                live={`${h.liveReturnPct}%`}
                baseline={`${h.baselineReturnPct}%`}
              />
              <MetricRow
                label="Max Drawdown"
                live={`${h.liveMaxDrawdownPct}%`}
                baseline={`${h.baselineMaxDDPct}%`}
              />
              <MetricRow
                label="Win Rate"
                live={`${h.liveWinRate}%`}
                baseline={`${h.baselineWinRate}%`}
              />
              <MetricRow
                label="Trades/Day"
                live={h.liveTradesPerDay.toFixed(2)}
                baseline={h.baselineTradesPerDay.toFixed(2)}
              />
            </div>

            {/* Score History Sparkline */}
            <HealthSparkline scores={d.scoreHistory} />
          </div>
        </div>

        {/* ── Chain Integrity ── */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Chain Integrity</h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-[#7C8DB0]">Chain Length</p>
              <p className="text-white font-medium">{d.chain.length.toLocaleString()} events</p>
            </div>
            <div>
              <p className="text-[#7C8DB0]">Checkpoints</p>
              <p className="text-white font-medium">{d.chain.checkpointCount}</p>
            </div>
            <div>
              <p className="text-[#7C8DB0]">Last Checkpoint</p>
              <p className="text-white font-medium">
                {new Date(d.chain.lastCheckpoint).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
