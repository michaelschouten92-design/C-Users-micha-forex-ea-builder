"use client";

import { useState } from "react";
import { formatCurrency } from "./utils";

export function EquityCurveChart({ dailyPnl }: { dailyPnl: { date: string; pnl: number }[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (dailyPnl.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-[#475569]">
        Equity curve appears after 2+ trading days
      </div>
    );
  }

  // Build cumulative P&L series
  const cumulative: number[] = [];
  let running = 0;
  for (const d of dailyPnl) {
    running += d.pnl;
    cumulative.push(running);
  }

  const width = 600;
  const height = 160;
  const padX = 40;
  const padTop = 16;
  const padBottom = 24;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  const minVal = Math.min(0, ...cumulative);
  const maxVal = Math.max(0, ...cumulative);
  const range = maxVal - minVal || 1;

  const points = cumulative.map((val, i) => {
    const x = padX + (i / (cumulative.length - 1)) * chartW;
    const y = padTop + (1 - (val - minVal) / range) * chartH;
    return { x, y, val, date: dailyPnl[i].date, dayPnl: dailyPnl[i].pnl };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Zero line Y position
  const zeroY = padTop + (1 - (0 - minVal) / range) * chartH;

  // Area fill from zero line
  const areaPath = [
    `${points[0].x},${zeroY}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${zeroY}`,
  ].join(" ");

  const lastVal = cumulative[cumulative.length - 1];
  const isPositive = lastVal >= 0;
  const lineColor = isPositive ? "#10B981" : "#EF4444";
  const fillColor = isPositive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";

  // Y-axis labels (3 ticks)
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal];

  // X-axis labels (up to 4 month markers)
  const monthLabels: { x: number; label: string }[] = [];
  const seen = new Set<string>();
  for (const p of points) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      monthLabels.push({
        x: p.x,
        label: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
  }
  // Keep max 4 labels evenly spaced
  const step = Math.max(1, Math.floor(monthLabels.length / 4));
  const xLabels = monthLabels.filter((_, i) => i % step === 0);

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-40"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = ((e.clientX - rect.left) / rect.width) * width;
          // Find closest point
          let closest = 0;
          let closestDist = Infinity;
          for (let i = 0; i < points.length; i++) {
            const dist = Math.abs(points[i].x - mouseX);
            if (dist < closestDist) {
              closestDist = dist;
              closest = i;
            }
          }
          setHoverIndex(closest);
        }}
      >
        {/* Zero line */}
        <line
          x1={padX}
          y1={zeroY}
          x2={width - padX}
          y2={zeroY}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => {
          const y = padTop + (1 - (tick - minVal) / range) * chartH;
          return (
            <text
              key={i}
              x={padX - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-[#475569] text-[8px]"
            >
              {tick >= 0 ? "" : ""}
              {Math.abs(tick) >= 1000 ? `$${(tick / 1000).toFixed(1)}k` : `$${tick.toFixed(0)}`}
            </text>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={height - 4}
            textAnchor="middle"
            className="fill-[#475569] text-[8px]"
          >
            {l.label}
          </text>
        ))}

        {/* Area fill */}
        <polygon points={areaPath} fill={fillColor} />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="1.5" />

        {/* Hover vertical line + dot */}
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              y1={padTop}
              x2={hoverPoint.x}
              y2={height - padBottom}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3" fill={lineColor} />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverPoint && (
        <div
          className="absolute top-0 pointer-events-none bg-[#1E1B2E] border border-[#1E293B] rounded px-2 py-1 text-[10px] shadow-lg z-10"
          style={{
            left: `${(hoverPoint.x / width) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-[#A1A1AA]">
            {new Date(hoverPoint.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
          <p
            className={`font-semibold tabular-nums ${hoverPoint.val >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {formatCurrency(hoverPoint.val)}
          </p>
          <p className="text-[#475569]">
            Day: {hoverPoint.dayPnl >= 0 ? "+" : ""}
            {formatCurrency(hoverPoint.dayPnl)}
          </p>
        </div>
      )}
    </div>
  );
}
