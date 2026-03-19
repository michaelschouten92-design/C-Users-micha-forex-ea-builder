import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AlgoStudio Verified Trading Record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function fmt(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export default async function OGImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Fetch from the public API (same data the page uses)
  let data: Record<string, unknown> | null = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/track-record/${token}`, { next: { revalidate: 300 } });
    if (res.ok) data = await res.json();
  } catch {
    // Fall through to fallback
  }

  if (!data) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0118",
          color: "#7C8DB0",
          fontSize: 24,
        }}
      >
        Track Record Not Found
      </div>,
      { ...size }
    );
  }

  const account = (data.account ?? {}) as Record<string, unknown>;
  const perf = (data.performance ?? {}) as Record<string, unknown>;
  const curve = (data.equityCurve ?? []) as Array<{ equity: number }>;

  const eaName = (account.eaName as string) || "Account";
  const broker = (account.broker as string) || "";
  const maskedAccount = (account.accountNumberMasked as string) || "";
  const displayName = broker && maskedAccount ? `${broker} Account ${maskedAccount}` : eaName;
  const totalProfit = Number(perf.totalProfit ?? 0);
  const totalTrades = Number(perf.totalTrades ?? 0);
  const maxDD = Number(perf.maxDrawdownPct ?? 0);
  const winRate = Number(perf.winRate ?? 0);
  const strategyCount = Number(perf.strategyCount ?? 0);

  // Build sparkline SVG path
  let sparkline = "";
  if (curve.length > 1) {
    const values = curve.map((p) => p.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 460;
    const h = 120;
    const step = w / (values.length - 1);
    sparkline = values
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * (h - 10) - 5;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const pnlColor = totalProfit >= 0 ? "#10B981" : "#EF4444";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0A0118",
        padding: "48px 56px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Badge */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#818CF8",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          marginBottom: "8px",
        }}
      >
        Verified Trading Record
      </div>

      {/* Account identity */}
      <div style={{ fontSize: 28, fontWeight: 700, color: "#FAFAFA", marginBottom: "4px" }}>
        {displayName}
      </div>
      {broker && maskedAccount && (
        <div style={{ fontSize: 13, color: "#7C8DB0", marginBottom: "32px" }}>
          Monitored by AlgoStudio
        </div>
      )}
      {!(broker && maskedAccount) && broker && (
        <div style={{ fontSize: 13, color: "#7C8DB0", marginBottom: "32px" }}>{broker}</div>
      )}

      {/* Metrics */}
      <div style={{ display: "flex", gap: "40px", marginBottom: "36px" }}>
        {[
          { label: "Total P&L", value: fmt(totalProfit), color: pnlColor },
          { label: "Trades", value: totalTrades.toLocaleString(), color: "#CBD5E1" },
          { label: "Max Drawdown", value: `${maxDD.toFixed(1)}%`, color: "#CBD5E1" },
          { label: "Win Rate", value: `${winRate.toFixed(1)}%`, color: "#CBD5E1" },
          { label: "Strategies", value: String(strategyCount), color: "#CBD5E1" },
        ].map((m) => (
          <div key={m.label} style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#7C8DB0",
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: "4px",
              }}
            >
              {m.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      {sparkline && (
        <div style={{ display: "flex", flexGrow: 1 }}>
          <svg width="460" height="120" viewBox="0 0 460 120">
            <path d={sparkline} fill="none" stroke="#818CF8" strokeWidth="2" />
          </svg>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: "auto",
        }}
      >
        <div style={{ fontSize: 13, color: "#64748B" }}>Monitored by AlgoStudio</div>
        <div style={{ fontSize: 13, color: "#64748B" }}>algo-studio.com</div>
      </div>
    </div>,
    { ...size }
  );
}
