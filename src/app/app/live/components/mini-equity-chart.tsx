"use client";

export function MiniEquityChart({
  heartbeats,
}: {
  heartbeats: { equity: number; createdAt: string }[];
}) {
  if (heartbeats.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-[#7C8DB0]">No data</div>
    );
  }

  const sorted = [...heartbeats].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const width = 200;
  const height = 60;
  const padding = 4;

  const equities = sorted.map((h) => h.equity);
  const minEq = Math.min(...equities);
  const maxEq = Math.max(...equities);
  const range = maxEq - minEq || 1;

  const points = sorted.map((h, i) => {
    const x = padding + (i / (sorted.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (h.equity - minEq) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isPositive = sorted[sorted.length - 1].equity >= sorted[0].equity;
  const lineColor = isPositive ? "#10B981" : "#EF4444";
  const fillColor = isPositive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      <polygon points={areaPoints} fill={fillColor} />
      <polyline points={points.join(" ")} fill="none" stroke={lineColor} strokeWidth="1.5" />
    </svg>
  );
}
