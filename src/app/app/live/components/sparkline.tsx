"use client";

export function Sparkline({ data, color }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;

  const w = 80;
  const h = 28;
  const pad = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const isPositive = data[data.length - 1] >= data[0];
  const strokeColor = color ?? (isPositive ? "#10B981" : "#EF4444");
  const fill = isPositive ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)";

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const areaPts = [`${pad},${h - pad}`, ...pts, `${w - pad},${h - pad}`].join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-7 flex-shrink-0">
      <polygon points={areaPts} fill={fill} />
      <polyline points={pts.join(" ")} fill="none" stroke={strokeColor} strokeWidth="1" />
    </svg>
  );
}
