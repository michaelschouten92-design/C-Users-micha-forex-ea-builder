/**
 * VerificationLadder — horizontal progression showing strategy trust maturity.
 *
 * SUBMITTED → VALIDATED → VERIFIED → PROVEN
 * Each step fills as the strategy progresses through the verification pipeline.
 */

const LEVELS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "VALIDATED", label: "Validated" },
  { key: "VERIFIED", label: "Verified" },
  { key: "PROVEN", label: "Proven" },
] as const;

const LEVEL_RANK: Record<string, number> = {
  SUBMITTED: 0,
  VALIDATED: 1,
  VERIFIED: 2,
  PROVEN: 3,
  INSTITUTIONAL: 4,
};

const LEVEL_COLORS: Record<string, string> = {
  SUBMITTED: "#7C8DB0",
  VALIDATED: "#6366F1",
  VERIFIED: "#10B981",
  PROVEN: "#F59E0B",
};

interface VerificationLadderProps {
  currentLevel: string;
  description?: string;
}

export function VerificationLadder({ currentLevel, description }: VerificationLadderProps) {
  const currentRank = LEVEL_RANK[currentLevel] ?? 0;

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-4">Verification Level</p>

      {/* Step progression */}
      <div className="flex items-center">
        {LEVELS.map((level, i) => {
          const rank = LEVEL_RANK[level.key];
          const isCompleted = rank < currentRank;
          const isCurrent = level.key === currentLevel;
          const isReached = rank <= currentRank;
          const color = LEVEL_COLORS[level.key] ?? "#7C8DB0";

          return (
            <div key={level.key} className="flex items-center flex-1 last:flex-none">
              {/* Dot + label column */}
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: isReached ? color : "transparent",
                    border: isReached ? "none" : "2px solid rgba(124,141,176,0.3)",
                    boxShadow: isCurrent ? `0 0 8px ${color}40` : "none",
                  }}
                />
                <span
                  className="text-[10px] font-medium text-center leading-tight"
                  style={{ color: isCurrent ? color : isCompleted ? "#CBD5E1" : "#7C8DB0" }}
                >
                  {level.label}
                </span>
              </div>

              {/* Connector line */}
              {i < LEVELS.length - 1 && (
                <div
                  className="flex-1 h-px mx-1.5 sm:mx-3"
                  style={{
                    backgroundColor: rank < currentRank ? `${color}60` : "rgba(124,141,176,0.2)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current level description */}
      {description && <p className="text-xs text-[#94A3B8] mt-3">{description}</p>}
    </div>
  );
}
