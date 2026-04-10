/**
 * TradingDisclaimerBanner — legal disclaimer shown on all public track record
 * and verified strategy pages.
 *
 * Purpose: makes clear that displayed trading data is historical/verified only
 * and does not constitute financial advice. Reduces liability exposure from
 * users who share these pages as investment "proof".
 *
 * Always visible (non-dismissible) — this is a legal disclaimer, not a cookie
 * banner. Sticky at top so it remains visible when scrolling.
 *
 * Three variants:
 *   - "sticky"  (default) — full-width amber banner fixed to top of viewport
 *   - "inline"  — non-sticky banner suitable for embed widgets / small iframes
 *   - "compact" — single-line note for very space-constrained contexts
 */

type Variant = "sticky" | "inline" | "compact";

interface Props {
  variant?: Variant;
}

export function TradingDisclaimerBanner({ variant = "sticky" }: Props) {
  const message =
    "Verified track records are cryptographically signed records of past trading activity. Past performance does not guarantee future results. This is not financial advice or a recommendation to trade.";

  if (variant === "compact") {
    return (
      <p className="text-[11px] text-[#F59E0B]/80 leading-relaxed text-center px-3 py-2 border-t border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.05)]">
        Past performance does not guarantee future results. Not financial advice.
      </p>
    );
  }

  const base =
    "w-full border-b border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] backdrop-blur text-[#F59E0B] text-xs sm:text-sm px-4 py-2.5";
  const positional = variant === "sticky" ? "sticky top-0 z-40" : "";

  return (
    <div role="note" aria-label="Trading risk disclaimer" className={`${base} ${positional}`}>
      <p className="max-w-5xl mx-auto leading-relaxed">
        <span className="font-semibold">Risk disclaimer — </span>
        {message}
      </p>
    </div>
  );
}
