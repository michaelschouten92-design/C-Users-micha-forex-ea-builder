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
  SUBMITTED: "#71717A",
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
    <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-wider text-[#71717A] mb-4">Verification Level</p>

      {/* Step progression */}
      <div className="flex items-center">
        {LEVELS.map((level, i) => {
          const rank = LEVEL_RANK[level.key];
          const isCompleted = rank < currentRank;
          const isCurrent = level.key === currentLevel;
          const isReached = rank <= currentRank;
          const color = LEVEL_COLORS[level.key] ?? "#71717A";

          return (
            <div key={level.key} className="flex items-center flex-1 last:flex-none">
              {/* Dot + label column */}
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: isReached ? color : "transparent",
                    border: isReached ? "none" : "2px solid rgba(255,255,255,0.15)",
                  }}
                />
                <span
                  className="text-[10px] font-medium text-center leading-tight"
                  style={{ color: isCurrent ? color : isCompleted ? "#FAFAFA" : "#71717A" }}
                >
                  {level.label}
                </span>
              </div>

              {/* Connector line */}
              {i < LEVELS.length - 1 && (
                <div
                  className="flex-1 h-px mx-1.5 sm:mx-3"
                  style={{
                    backgroundColor: rank < currentRank ? `${color}60` : "rgba(255,255,255,0.10)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current level description */}
      {description && <p className="text-xs text-[#A1A1AA] mt-3">{description}</p>}
    </div>
  );
}
