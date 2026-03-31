"use client";

export function WinRateDonut({
  winRate,
  wins,
  losses,
  size = 80,
}: {
  winRate: number;
  wins: number;
  losses: number;
  size?: number;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedRate = Math.min(Math.max(winRate, 0), 100);
  const offset = circumference - (clampedRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Unfilled track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10B981"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Centered percentage text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#CBD5E1"
          fontSize={size * 0.22}
          fontWeight="bold"
          fontFamily="ui-monospace, monospace"
        >
          {clampedRate.toFixed(1)}%
        </text>
      </svg>
      <span className="text-[9px] text-[#475569] tabular-nums">
        W: {wins} / L: {losses}
      </span>
    </div>
  );
}
