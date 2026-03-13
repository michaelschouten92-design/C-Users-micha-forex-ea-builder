interface OnboardingStepProps {
  label: string;
  description: string;
  completed: boolean;
  active: boolean;
  stepNumber: number;
}

export function OnboardingStep({
  label,
  description,
  completed,
  active,
  stepNumber,
}: OnboardingStepProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        active
          ? "bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.25)]"
          : "border border-transparent"
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {completed ? (
          <div className="w-6 h-6 rounded-full bg-[#10B981]/15 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-[#10B981]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : active ? (
          <div className="w-6 h-6 rounded-full bg-[rgba(79,70,229,0.2)] border border-[rgba(79,70,229,0.4)] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#818CF8]">{stepNumber}</span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
            <span className="text-[10px] font-medium text-[#4A4A5A]">{stepNumber}</span>
          </div>
        )}
      </div>
      <div>
        <p
          className={`text-sm font-medium ${
            completed ? "text-[#52525B] line-through" : active ? "text-white" : "text-[#52525B]"
          }`}
        >
          {label}
        </p>
        <p className={`text-xs mt-0.5 ${active ? "text-[#94A3B8]" : "text-[#3F3F46]"}`}>
          {completed ? "" : description}
        </p>
      </div>
    </div>
  );
}
