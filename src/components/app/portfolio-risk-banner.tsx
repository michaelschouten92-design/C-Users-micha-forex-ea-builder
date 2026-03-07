/**
 * PortfolioRiskBanner — one-line portfolio-level decision summary.
 *
 * Priority: INVALIDATED > AT_RISK > awaiting data > healthy.
 */

type BannerLevel = "critical" | "attention" | "awaiting" | "healthy";

interface BannerConfig {
  color: string;
  headline: string;
  subtext: string;
}

function deriveBanner(summary: PortfolioRiskBannerProps["summary"]): BannerConfig {
  let level: BannerLevel = "healthy";

  if (summary.invalidated > 0) level = "critical";
  else if (summary.atRisk > 0) level = "attention";
  else if (summary.awaitingData > 0) level = "awaiting";

  switch (level) {
    case "critical":
      return {
        color: "#EF4444",
        headline:
          summary.invalidated === 1
            ? "1 strategy invalidated \u2014 immediate review recommended"
            : `${summary.invalidated} strategies invalidated \u2014 immediate review recommended`,
        subtext: "A live strategy no longer satisfies governance conditions.",
      };
    case "attention":
      return {
        color: "#F59E0B",
        headline:
          summary.atRisk === 1
            ? "1 strategy requires attention"
            : `${summary.atRisk} strategies require attention`,
        subtext: "Monitoring signals indicate degradation in a live strategy.",
      };
    case "awaiting":
      return {
        color: "#7C8DB0",
        headline:
          summary.awaitingData === 1
            ? "1 strategy is still collecting data"
            : `${summary.awaitingData} strategies are still collecting data`,
        subtext: "Health assessment will appear after sufficient activity.",
      };
    case "healthy":
      return {
        color: "#10B981",
        headline: "All strategies operating within expected range",
        subtext: "No active incidents or invalidations detected.",
      };
  }
}

interface PortfolioRiskBannerProps {
  summary: {
    invalidated: number;
    atRisk: number;
    awaitingData: number;
  };
}

export function PortfolioRiskBanner({ summary }: PortfolioRiskBannerProps) {
  const banner = deriveBanner(summary);

  return (
    <div
      className="rounded-xl bg-[#1A0626] px-5 py-4"
      style={{
        border: `1px solid ${banner.color}25`,
        borderLeft: `3px solid ${banner.color}`,
      }}
    >
      <p className="text-sm font-semibold tracking-tight" style={{ color: banner.color }}>
        {banner.headline}
      </p>
      <p className="text-xs text-[#7C8DB0] mt-1">{banner.subtext}</p>
    </div>
  );
}
