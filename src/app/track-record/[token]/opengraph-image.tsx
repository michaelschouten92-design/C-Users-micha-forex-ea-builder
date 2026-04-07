import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Algo Studio Verified Trading Record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function fmt(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "+";
  if (v === 0) return "$0.00";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtBalance(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default async function OGImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let data: Record<string, unknown> | null = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
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
          backgroundColor: "#0B0E11",
          color: "#64748B",
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
  const displayName = broker && maskedAccount ? `${broker} · ${maskedAccount}` : eaName;
  const balance = Number(account.balance ?? 0);
  const totalProfit = Number(perf.totalProfit ?? 0);
  const totalTrades = Number(perf.totalTrades ?? 0);
  const maxDD = Number(perf.maxDrawdownPct ?? 0);
  const winRate = Number(perf.winRate ?? 0);

  // Growth %
  let growthPct = 0;
  if (curve.length >= 2) {
    const first = curve[0].equity;
    const last = curve[curve.length - 1].equity;
    growthPct = first > 0 ? ((last - first) / first) * 100 : 0;
  }

  // Build sparkline path (full width)
  let sparkPath = "";
  let sparkAreaPath = "";
  const chartW = 1080;
  const chartH = 200;
  if (curve.length > 1) {
    const values = curve.map((p) => p.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = chartW / (values.length - 1);
    const pts = values.map((v, i) => ({
      x: i * step,
      y: chartH - ((v - min) / range) * (chartH - 16) - 8,
    }));
    sparkPath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    sparkAreaPath = `${sparkPath} L${pts[pts.length - 1].x.toFixed(1)},${chartH} L0,${chartH} Z`;
  }

  const isProfit = totalProfit >= 0;
  const lineColor = isProfit ? "#10B981" : "#EF4444";
  const fillColor = isProfit ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0B0E11",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top gradient accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, #4F46E5, #818CF8, #4F46E5)",
        }}
      />

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", padding: "40px 60px 0" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#818CF8",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  padding: "4px 10px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(79,70,229,0.15)",
                  border: "1px solid rgba(79,70,229,0.3)",
                }}
              >
                Verified
              </div>
              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.05em" }}>
                TRADING RECORD
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#FAFAFA" }}>{displayName}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: "4px" }}>BALANCE</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#FAFAFA" }}>
              {fmtBalance(balance)}
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: "flex", gap: "48px", marginBottom: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 11,
                color: "#64748B",
                marginBottom: "4px",
                letterSpacing: "0.08em",
              }}
            >
              TOTAL P&L
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: lineColor }}>
              {fmt(totalProfit)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 11,
                color: "#64748B",
                marginBottom: "4px",
                letterSpacing: "0.08em",
              }}
            >
              GROWTH
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: lineColor }}>
              {growthPct >= 0 ? "+" : ""}
              {growthPct.toFixed(2)}%
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 11,
                color: "#64748B",
                marginBottom: "4px",
                letterSpacing: "0.08em",
              }}
            >
              WIN RATE
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#FAFAFA" }}>
              {winRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 11,
                color: "#64748B",
                marginBottom: "4px",
                letterSpacing: "0.08em",
              }}
            >
              TRADES
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#FAFAFA" }}>
              {totalTrades.toLocaleString()}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 11,
                color: "#64748B",
                marginBottom: "4px",
                letterSpacing: "0.08em",
              }}
            >
              MAX DD
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#EF4444" }}>
              {maxDD.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Full-width chart area */}
      {sparkPath && (
        <div style={{ display: "flex", flexGrow: 1, padding: "0 60px" }}>
          <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
            <path d={sparkAreaPath} fill={fillColor} />
            <path d={sparkPath} fill="none" stroke={lineColor} strokeWidth="2.5" />
          </svg>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 60px 24px",
          borderTop: "1px solid rgba(30,41,59,0.5)",
          marginTop: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#4F46E5",
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8" }}>Algo Studio</div>
        </div>
        <div style={{ fontSize: 12, color: "#475569" }}>algo-studio.com</div>
      </div>
    </div>,
    { ...size }
  );
}
