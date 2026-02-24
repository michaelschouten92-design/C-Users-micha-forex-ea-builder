"use client";

import { useState, useEffect } from "react";

interface WidgetData {
  eaName: string;
  symbol: string | null;
  timeframe: string | null;
  broker: string | null;
  returnPct: number;
  maxDrawdownPct: number;
  winRate: number | null;
  totalTrades: number;
  sharpeRatio: number | null;
  period: string | null;
  verified: boolean;
}

export function EmbedWidget({ token }: { token: string }) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/embed/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Track record not available"));
  }, [token]);

  if (error) {
    return (
      <div
        style={{
          width: 320,
          height: 200,
          background: "#1A0626",
          borderRadius: 12,
          border: "1px solid #4F46E5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#7C8DB0",
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          width: 320,
          height: 200,
          background: "#1A0626",
          borderRadius: 12,
          border: "1px solid #4F46E5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid #4F46E5",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${appUrl}/verify/${token}`;

  return (
    <a
      href={verifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        width: 320,
        height: 200,
        background: "#1A0626",
        borderRadius: 12,
        border: "1px solid #4F46E5",
        padding: "16px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textDecoration: "none",
        color: "inherit",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10B981"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>
          Tracked by AlgoStudio
        </span>
      </div>

      {/* Strategy Name */}
      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#FFFFFF",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.eaName}
        </div>
        <div style={{ fontSize: 11, color: "#7C8DB0", marginTop: 2 }}>
          {[data.symbol, data.timeframe, data.broker].filter(Boolean).join(" · ")}
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8,
          marginTop: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: data.returnPct >= 0 ? "#10B981" : "#EF4444",
            }}
          >
            {data.returnPct >= 0 ? "+" : ""}
            {data.returnPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: "#7C8DB0", marginTop: 2 }}>Return</div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#EF4444" }}>
            -{data.maxDrawdownPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: "#7C8DB0", marginTop: 2 }}>Max DD</div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#CBD5E1" }}>
            {data.winRate !== null ? `${data.winRate.toFixed(1)}%` : "---"}
          </div>
          <div style={{ fontSize: 10, color: "#7C8DB0", marginTop: 2 }}>Win Rate</div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#CBD5E1" }}>{data.totalTrades}</div>
          <div style={{ fontSize: 10, color: "#7C8DB0", marginTop: 2 }}>Trades</div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          fontSize: 10,
          color: "#7C8DB0",
        }}
      >
        <span>
          {data.sharpeRatio !== null ? `Sharpe: ${data.sharpeRatio.toFixed(2)}` : ""}
          {data.sharpeRatio !== null && data.period ? " | " : ""}
          {data.period ?? ""}
        </span>
      </div>
    </a>
  );
}
