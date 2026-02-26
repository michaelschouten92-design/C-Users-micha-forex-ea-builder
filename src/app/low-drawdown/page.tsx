import type { Metadata } from "next";
import { HubView } from "../hub/hub-view";

export const metadata: Metadata = {
  title: "Low Drawdown Strategies | AlgoStudio",
  description:
    "Find low-drawdown algorithmic trading strategies on AlgoStudio. Strategies with the tightest risk control and minimal peak-to-trough declines.",
  openGraph: {
    title: "Low Drawdown Strategies | AlgoStudio",
    description: "Find low-drawdown algorithmic trading strategies on AlgoStudio.",
    siteName: "AlgoStudio",
  },
};

export default function LowDrawdownPage() {
  return (
    <HubView
      type="low-drawdown"
      title="Low Drawdown Strategies"
      description="Strategies with the tightest risk control. Ranked by lowest maximum drawdown percentage."
    />
  );
}
