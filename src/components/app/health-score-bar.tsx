/**
 * HealthScoreBar — compact horizontal bar showing health score (0–100%).
 *
 * Color thresholds: 70+ green, 40+ amber, <40 red.
 * Shows "Collecting..." when score is null (insufficient data).
 */

interface HealthScoreBarProps {
  score: number | null;
}

export function HealthScoreBar({ score }: HealthScoreBarProps) {
  if (score === null) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#71717A]">Health</span>
          <span className="text-[#71717A] text-[10px]">Collecting...</span>
        </div>
        <div className="h-1.5 bg-[#09090B] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#71717A] animate-pulse"
            style={{ width: "30%" }}
          />
        </div>
      </div>
    );
  }

  const color = score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#71717A]">Health</span>
        <span className="font-medium" style={{ color }}>
          {score}%
        </span>
      </div>
      <div className="h-1.5 bg-[#09090B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
