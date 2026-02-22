import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AlgoStudio Verified Track Record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let data: Record<string, unknown> | null = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/embed/${token}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      data = await res.json();
    }
  } catch {
    // Fall through to default
  }

  const eaName = (data?.eaName as string) || "Strategy";
  const returnPct = (data?.returnPct as number) ?? 0;
  const maxDD = (data?.maxDrawdownPct as number) ?? 0;
  const winRate = data?.winRate as number | null;
  const trades = (data?.totalTrades as number) ?? 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#0A0118",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          width: 1000,
          padding: "48px 60px",
          background: "#1A0626",
          borderRadius: 24,
          border: "2px solid #4F46E5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 20, color: "#10B981", fontWeight: 700 }}>
            Verified by AlgoStudio
          </div>
        </div>

        <div style={{ fontSize: 36, fontWeight: 800, color: "#FFFFFF", marginBottom: 32 }}>
          {eaName}
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: returnPct >= 0 ? "#10B981" : "#EF4444",
              }}
            >
              {returnPct >= 0 ? "+" : ""}
              {returnPct.toFixed(1)}%
            </div>
            <div style={{ fontSize: 18, color: "#7C8DB0" }}>Return</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#EF4444" }}>
              -{maxDD.toFixed(1)}%
            </div>
            <div style={{ fontSize: 18, color: "#7C8DB0" }}>Max Drawdown</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#CBD5E1" }}>
              {winRate !== null ? `${winRate.toFixed(1)}%` : "---"}
            </div>
            <div style={{ fontSize: 18, color: "#7C8DB0" }}>Win Rate</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#CBD5E1" }}>{trades}</div>
            <div style={{ fontSize: 18, color: "#7C8DB0" }}>Trades</div>
          </div>
        </div>
      </div>
    </div>,
    { ...size }
  );
}
