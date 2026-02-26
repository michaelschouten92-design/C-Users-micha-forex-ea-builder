import type { Metadata } from "next";
import { HubView } from "../hub/hub-view";

export const metadata: Metadata = {
  title: "Newest Verified Strategies | AlgoStudio",
  description:
    "Browse the newest verified algorithmic trading strategies on AlgoStudio. All strategies are validated with real metrics and chain-verified trade history.",
  openGraph: {
    title: "Newest Verified Strategies | AlgoStudio",
    description: "Browse the newest verified algorithmic trading strategies on AlgoStudio.",
    siteName: "AlgoStudio",
  },
};

export default function VerifiedPage() {
  return (
    <HubView
      type="verified"
      title="Newest Verified Strategies"
      description="Recently verified strategies with validated performance metrics and chain-verified trade history."
    />
  );
}
