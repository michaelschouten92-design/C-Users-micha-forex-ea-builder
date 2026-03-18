"use client";

import { useRef, useState } from "react";

interface EquityPoint {
  equity: number;
  balance: number;
  createdAt: string;
}

function formatCurrency(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function EquityChart({ data }: { data: EquityPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; point: EquityPoint } | null>(null);

  const eqValues = data.map((p) => p.equity);
  const eqMin = Math.min(...eqValues);
  const eqMax = Math.max(...eqValues);
  const eqRange = eqMax - eqMin || 1;

  function toY(equity: number): number {
    return 100 - ((equity - eqMin) / eqRange) * 90 - 5;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(xPct * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setHover({ x: clamped, point: data[clamped] });
  }

  const lastPoint = data[data.length - 1];
  const lastX = data.length - 1;
  const lastY = toY(lastPoint.equity);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${data.length} 100`}
        className="w-full h-32 cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <polyline
          fill="none"
          stroke="#818CF8"
          strokeWidth="0.5"
          points={data.map((p, i) => `${i},${toY(p.equity)}`).join(" ")}
        />
        {/* Current equity marker */}
        <circle cx={lastX} cy={lastY} r="1.5" fill="#818CF8" />
        {/* Hover crosshair */}
        {hover && (
          <line
            x1={hover.x}
            y1="0"
            x2={hover.x}
            y2="100"
            stroke="#7C8DB0"
            strokeWidth="0.3"
            strokeDasharray="1,1"
          />
        )}
      </svg>
      {/* Tooltip */}
      {hover && (
        <div
          className="absolute top-0 pointer-events-none bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1.5 text-[10px] z-10"
          style={{
            left: `${(hover.x / (data.length - 1)) * 100}%`,
            transform: hover.x > data.length * 0.7 ? "translateX(-100%)" : "translateX(0)",
          }}
        >
          <p className="text-[#7C8DB0]">{new Date(hover.point.createdAt).toLocaleDateString()}</p>
          <p className="text-[#CBD5E1]">Equity: {formatCurrency(hover.point.equity)}</p>
          <p className="text-[#CBD5E1]">Balance: {formatCurrency(hover.point.balance)}</p>
        </div>
      )}
      {/* Date axis */}
      <div className="flex justify-between text-[9px] text-[#64748B] mt-1">
        <span>{new Date(data[0].createdAt).toLocaleDateString()}</span>
        <span>{new Date(lastPoint.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
