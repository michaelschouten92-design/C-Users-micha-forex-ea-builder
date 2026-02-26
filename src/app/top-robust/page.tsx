import type { Metadata } from "next";
import { HubView } from "../hub/hub-view";

export const metadata: Metadata = {
  title: "Top Robust Strategies | AlgoStudio",
  description:
    "Discover the most robust algorithmic trading strategies ranked by health score. Proven performance with verified metrics on AlgoStudio.",
  openGraph: {
    title: "Top Robust Strategies | AlgoStudio",
    description: "Discover the most robust algorithmic trading strategies ranked by health score.",
    siteName: "AlgoStudio",
  },
};

export default function TopRobustPage() {
  return (
    <HubView
      type="top-robust"
      title="Top Robust Strategies"
      description="Highest health scores with proven consistency. Ranked by overall robustness across multiple metrics."
    />
  );
}
