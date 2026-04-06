/**
 * Reusable info tooltip — small (i) icon that shows explanatory text on hover.
 * Designed for beginners who don't know trading terminology.
 */

export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex ml-1 cursor-help">
      <svg
        className="w-3 h-3 text-[#7C8DB0] opacity-50 group-hover:opacity-100 transition-opacity"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-[10px] leading-relaxed text-white bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-lg w-56 z-50 pointer-events-none text-center">
        {text}
      </span>
    </span>
  );
}
