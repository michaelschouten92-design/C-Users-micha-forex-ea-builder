import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Algo Studio Verified Strategy Proof";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ── Level colors (matches proof page) ────────────────────

const LEVEL_COLORS: Record<string, string> = {
  SUBMITTED: "#71717A",
  VALIDATED: "#6366F1",
  VERIFIED: "#10B981",
  PROVEN: "#F59E0B",
  INSTITUTIONAL: "#818CF8",
};

const LEVEL_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  VALIDATED: "Validated",
  VERIFIED: "Verified",
  PROVEN: "Proven",
  INSTITUTIONAL: "Institutional",
};

// ── Verdict derivation (same logic as proof page hero) ───

function deriveVerdict(level: string, driftDetected: boolean): { text: string; color: string } {
  if (driftDetected) {
    return { text: "Edge drift detected — monitoring signals active", color: "#F59E0B" };
  }
  switch (level) {
    case "PROVEN":
      return { text: "Proven track record with sustained live performance", color: "#10B981" };
    case "VERIFIED":
      return { text: "Live trades cryptographically verified on-chain", color: "#10B981" };
    case "VALIDATED":
      return { text: "Passed health evaluation and Monte Carlo stress test", color: "#6366F1" };
    default:
      return { text: "Strategy submitted — verification in progress", color: "#71717A" };
  }
}

// ── Stat selection (same priority as proof page hero) ────

interface ProofStats {
  label: string;
  value: string;
}

function pickStats(data: Record<string, unknown>): ProofStats[] {
  const stats: ProofStats[] = [];

  const trackRecord = data.trackRecord as Record<string, unknown> | null;
  const backtestHealth = data.backtestHealth as Record<string, unknown> | null;
  const backtestStats = backtestHealth?.stats as Record<string, unknown> | null;
  const monteCarlo = data.monteCarlo as Record<string, unknown> | null;
  const liveMetrics = data.liveMetrics as Record<string, unknown> | null;

  // 1. Trade count (prefer live)
  if (trackRecord && (trackRecord.totalTrades as number) > 0) {
    stats.push({
      label: "Live Trades",
      value: (trackRecord.totalTrades as number).toLocaleString("en-US"),
    });
  } else if (backtestStats && (backtestStats.totalTrades as number) > 0) {
    stats.push({
      label: "Backtest Trades",
      value: (backtestStats.totalTrades as number).toLocaleString("en-US"),
    });
  }

  // 2. Profit factor (prefer live)
  const livePF = liveMetrics?.profitFactor as number | undefined;
  if (livePF && livePF > 0 && isFinite(livePF)) {
    stats.push({ label: "Profit Factor", value: livePF.toFixed(2) });
  } else if (backtestStats?.profitFactor) {
    stats.push({
      label: "Profit Factor",
      value: (backtestStats.profitFactor as number).toFixed(2),
    });
  }

  // 3. MC survival or win rate
  if (monteCarlo?.survivalRate !== undefined) {
    stats.push({
      label: "MC Survival",
      value: `${((monteCarlo.survivalRate as number) * 100).toFixed(0)}%`,
    });
  } else if (backtestStats?.winRate) {
    stats.push({
      label: "Win Rate",
      value: `${(backtestStats.winRate as number).toFixed(1)}%`,
    });
  }

  return stats.slice(0, 3);
}

// ── Image generation ─────────────────────────────────────

export default async function Image({ params }: { params: Promise<{ strategyId: string }> }) {
  const { strategyId } = await params;

  let data: Record<string, unknown> | null = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const res = await fetch(`${baseUrl}/api/proof/${strategyId.toUpperCase()}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      data = await res.json();
    }
  } catch {
    // Fall through to defaults
  }

  // Extract signals
  const strategy = (data?.strategy as Record<string, unknown>) ?? {};
  const ladder = (data?.ladder as Record<string, unknown>) ?? {};
  const liveHealth = data?.liveHealth as Record<string, unknown> | null;

  const name = (strategy.name as string) || "Strategy";
  const level = (ladder.level as string) || "SUBMITTED";
  const levelColor = LEVEL_COLORS[level] || "#71717A";
  const levelLabel = LEVEL_LABELS[level] || "Submitted";
  const driftDetected = (liveHealth?.driftDetected as boolean) || false;

  const verdict = deriveVerdict(level, driftDetected);
  const stats = data ? pickStats(data) : [];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090B",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Card */}
      <div
        style={{
          width: 1060,
          padding: "48px 56px",
          background: "#111114",
          borderRadius: 24,
          border: "2px solid rgba(255,255,255,0.10)",
          borderLeft: `4px solid ${levelColor}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top row: Algo Studio badge + ladder level */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
              fontWeight: 700,
              color: "#818CF8",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#818CF8"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Verified by Algo Studio
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 700,
              color: levelColor,
              border: `1.5px solid ${levelColor}50`,
              background: `${levelColor}12`,
            }}
          >
            {levelLabel}
          </div>
        </div>

        {/* Strategy name */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-0.5px",
            marginBottom: 16,
            lineClamp: 2,
            overflow: "hidden",
          }}
        >
          {name.length > 50 ? name.slice(0, 47) + "..." : name}
        </div>

        {/* Verdict */}
        <div
          style={{
            display: "flex",
            padding: "10px 20px",
            borderRadius: 12,
            background: `${verdict.color}10`,
            border: `1px solid ${verdict.color}20`,
            marginBottom: 32,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: verdict.color }}>{verdict.text}</div>
        </div>

        {/* Stats row */}
        {stats.length > 0 && (
          <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  padding: "20px 16px",
                  borderRadius: 12,
                  background: "rgba(24,24,27,0.6)",
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    marginBottom: 4,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#71717A",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 16,
            color: "#71717A",
            fontWeight: 500,
          }}
        >
          algo-studio.com
        </div>
      </div>
    </div>,
    { ...size }
  );
}
