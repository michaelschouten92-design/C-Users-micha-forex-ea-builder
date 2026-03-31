"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "./utils";

type Period = "7D" | "30D" | "90D";

export function EquityCurveChart({ dailyPnl }: { dailyPnl: { date: string; pnl: number }[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("30D");

  const periodDays: Record<Period, number> = { "7D": 7, "30D": 30, "90D": 90 };

  // Filter dailyPnl by selected period
  const filteredPnl = useMemo(() => {
    const days = periodDays[period];
    if (dailyPnl.length <= days) return dailyPnl;
    return dailyPnl.slice(-days);
  }, [dailyPnl, period]);

  if (filteredPnl.length < 2) {
    return (
      <div className="relative">
        {/* Period tabs */}
        <div className="flex justify-end gap-1 mb-2">
          {(["7D", "30D", "90D"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors ${
                period === p ? "bg-[#4F46E5] text-white" : "text-[#475569] hover:text-[#A1A1AA]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="h-60 flex items-center justify-center text-xs text-[#475569]">
          {dailyPnl.length < 2
            ? "Equity curve appears after 2+ trading days"
            : "No data available for the selected period"}
        </div>
      </div>
    );
  }

  // Build cumulative P&L series from filtered data
  const cumulative: number[] = [];
  let running = 0;
  for (const d of filteredPnl) {
    running += d.pnl;
    cumulative.push(running);
  }

  // Guard against corrupted data
  if (cumulative.some((v) => !isFinite(v))) {
    return (
      <div className="h-60 flex items-center justify-center text-xs text-[#475569]">
        Chart data contains invalid values
      </div>
    );
  }

  const width = 600;
  const height = 240;
  const padX = 40;
  const padTop = 48;
  const padBottom = 24;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  const minVal = Math.min(0, ...cumulative);
  const maxVal = Math.max(0, ...cumulative);
  const range = maxVal - minVal || 1;

  const points = cumulative.map((val, i) => {
    const x = padX + (i / (cumulative.length - 1)) * chartW;
    const y = padTop + (1 - (val - minVal) / range) * chartH;
    return { x, y, val, date: filteredPnl[i].date, dayPnl: filteredPnl[i].pnl };
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
  const firstVal = cumulative[0];
  const isPositive = lastVal >= 0;
  const lineColor = isPositive ? "#10B981" : "#EF4444";

  // Percentage change from first day
  const pctChange = firstVal !== 0 ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100 : null;

  // Grid lines: 3-4 horizontal lines evenly spaced across value range
  const gridLineCount = 4;
  const gridLines: number[] = [];
  for (let i = 0; i <= gridLineCount; i++) {
    const val = minVal + (range * i) / gridLineCount;
    gridLines.push(val);
  }

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

  // Hover percentage change from start
  const hoverPctFromStart =
    hoverPoint && firstVal !== 0 ? ((hoverPoint.val - firstVal) / Math.abs(firstVal)) * 100 : null;

  return (
    <div className="relative">
      {/* Header row: current value (left) + period tabs (right) */}
      <div className="flex items-start justify-between mb-2">
        {/* Current value display */}
        <div>
          <p
            className={`text-xl font-bold tabular-nums ${
              isPositive ? "text-[#10B981]" : "text-[#EF4444]"
            }`}
          >
            {lastVal >= 0 ? "+" : ""}
            {formatCurrency(lastVal)}
          </p>
          {pctChange !== null && (
            <p
              className={`text-xs tabular-nums ${
                pctChange >= 0 ? "text-[#10B981]/70" : "text-[#EF4444]/70"
              }`}
            >
              {pctChange >= 0 ? "+" : ""}
              {pctChange.toFixed(1)}% vs first day
            </p>
          )}
        </div>

        {/* Period selector tabs */}
        <div className="flex gap-1">
          {(["7D", "30D", "90D"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors ${
                period === p ? "bg-[#4F46E5] text-white" : "text-[#475569] hover:text-[#A1A1AA]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-60"
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
        <defs>
          {isPositive ? (
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(16,185,129,0.25)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>
          ) : (
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(239,68,68,0.25)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </linearGradient>
          )}
        </defs>

        {/* Horizontal grid lines */}
        {gridLines.map((val, i) => {
          const y = padTop + (1 - (val - minVal) / range) * chartH;
          return (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

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

        {/* Area fill with gradient */}
        <polygon points={areaPath} fill="url(#equityFill)" />

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
          className="absolute top-12 pointer-events-none bg-[#1E1B2E] border border-[#1E293B] rounded px-2 py-1 text-[10px] shadow-lg z-10"
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
          {hoverPctFromStart !== null && (
            <p
              className={`tabular-nums ${
                hoverPctFromStart >= 0 ? "text-[#10B981]/70" : "text-[#EF4444]/70"
              }`}
            >
              {hoverPctFromStart >= 0 ? "+" : ""}
              {hoverPctFromStart.toFixed(1)}% from start
            </p>
          )}
        </div>
      )}
    </div>
  );
}
