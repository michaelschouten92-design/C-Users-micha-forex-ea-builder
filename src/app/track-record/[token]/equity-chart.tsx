"use client";

import { useState, useMemo } from "react";

interface EquityPoint {
  equity: number;
  balance: number;
  createdAt: string;
}

type ChartView = "balance" | "growth" | "drawdown";

export function EquityChart({ data }: { data: EquityPoint[] }) {
  const [view, setView] = useState<ChartView>("growth");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [data]
  );

  const chartValues = useMemo(() => {
    if (sorted.length < 2) return null;
    const start = sorted[0].equity;

    if (view === "balance") return sorted.map((p) => p.equity);
    if (view === "growth")
      return sorted.map((p) => (start > 0 ? ((p.equity - start) / start) * 100 : 0));

    // drawdown
    let peak = sorted[0].equity;
    return sorted.map((p) => {
      if (p.equity > peak) peak = p.equity;
      return peak > 0 ? -((peak - p.equity) / peak) * 100 : 0;
    });
  }, [sorted, view]);

  if (!chartValues || sorted.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#64748B]">
        Not enough data for chart
      </div>
    );
  }

  // SVG dimensions
  const w = 900;
  const h = 280;
  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const min = Math.min(...chartValues);
  const max = Math.max(...chartValues);
  const range = max - min || 1;

  const pts = chartValues.map((v, i) => ({
    x: pad.left + (i / (chartValues.length - 1)) * cw,
    y: pad.top + (1 - (v - min) / range) * ch,
    v,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = [
    `${pts[0].x},${pad.top + ch}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${pad.top + ch}`,
  ].join(" ");

  const lastVal = chartValues[chartValues.length - 1];
  const isPositive =
    view === "drawdown" ? false : view === "growth" ? lastVal >= 0 : lastVal >= chartValues[0];
  const lineColor = view === "drawdown" ? "#EF4444" : isPositive ? "#10B981" : "#EF4444";
  const fillColor =
    view === "drawdown"
      ? "rgba(239,68,68,0.06)"
      : isPositive
        ? "rgba(16,185,129,0.06)"
        : "rgba(239,68,68,0.06)";

  // Y-axis: 5 ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = min + (range * i) / 4;
    return { v, y: pad.top + (1 - (v - min) / range) * ch };
  });

  // X-axis: ~5 dates
  const xCount = Math.min(5, sorted.length);
  const xTicks = Array.from({ length: xCount }, (_, i) => {
    const idx = Math.round((i / (xCount - 1)) * (sorted.length - 1));
    return {
      x: pad.left + (idx / (sorted.length - 1)) * cw,
      label: new Date(sorted[idx].createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    };
  });

  const fmtVal = (v: number) =>
    view === "balance"
      ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${v.toFixed(2)}%`;

  const hovered = hoverIdx !== null ? pts[hoverIdx] : null;

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3">
        {(["balance", "growth", "drawdown"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              view === v
                ? v === "drawdown"
                  ? "bg-[#EF4444]/15 text-[#EF4444]"
                  : "bg-[#10B981]/15 text-[#10B981]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative bg-[#0A0118]/30 rounded-lg border border-[#1E293B]/30 p-2">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full"
          style={{ height: "auto", maxHeight: "300px" }}
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const xRatio = (e.clientX - rect.left) / rect.width;
            const rawIdx = xRatio * (chartValues.length - 1);
            const idx = Math.max(0, Math.min(chartValues.length - 1, Math.round(rawIdx)));
            setHoverIdx(idx);
          }}
        >
          {/* Grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={pad.left}
                y1={t.y}
                x2={w - pad.right}
                y2={t.y}
                stroke="#1E293B"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
              <text
                x={pad.left - 6}
                y={t.y + 3}
                textAnchor="end"
                fill="#475569"
                fontSize="9"
                fontFamily="ui-monospace, monospace"
              >
                {fmtVal(t.v)}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={h - 4}
              textAnchor="middle"
              fill="#475569"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
            >
              {t.label}
            </text>
          ))}

          {/* Zero line */}
          {(view === "growth" || view === "drawdown") && min < 0 && max > 0 && (
            <line
              x1={pad.left}
              y1={pad.top + (1 - (0 - min) / range) * ch}
              x2={w - pad.right}
              y2={pad.top + (1 - (0 - min) / range) * ch}
              stroke="#475569"
              strokeWidth="0.5"
            />
          )}

          {/* Area + line */}
          <polygon points={area} fill={fillColor} />
          <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="1.5" />

          {/* Hover */}
          {hovered && hoverIdx !== null && (
            <>
              <line
                x1={hovered.x}
                y1={pad.top}
                x2={hovered.x}
                y2={pad.top + ch}
                stroke="#475569"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r={3.5}
                fill={lineColor}
                stroke="#0A0118"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hovered && hoverIdx !== null && (
          <div
            className="absolute bg-[#1A0626] border border-[#334155] rounded-lg px-3 py-2 text-[10px] pointer-events-none shadow-lg z-10"
            style={{
              left: `${(hovered.x / w) * 100}%`,
              top: "12px",
              transform:
                hoverIdx > chartValues.length * 0.7 ? "translateX(-100%)" : "translateX(0)",
            }}
          >
            <p className="text-[#64748B]">
              {new Date(sorted[hoverIdx].createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="font-semibold tabular-nums" style={{ color: lineColor }}>
              {fmtVal(chartValues[hoverIdx])}
            </p>
            <p className="text-[#94A3B8] tabular-nums">
              Equity: $
              {sorted[hoverIdx].equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
