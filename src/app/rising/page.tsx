import type { Metadata } from "next";
import { HubView } from "../hub/hub-view";

export const metadata: Metadata = {
  title: "Rising Strategies | AlgoStudio",
  description:
    "Explore rising algorithmic trading strategies gaining momentum on AlgoStudio. Fresh strategies with growing track records.",
  openGraph: {
    title: "Rising Strategies | AlgoStudio",
    description: "Explore rising algorithmic trading strategies gaining momentum on AlgoStudio.",
    siteName: "AlgoStudio",
  },
};

export default function RisingPage() {
  return (
    <HubView
      type="rising"
      title="Rising Strategies"
      description="Recently promoted strategies gaining momentum. New entrants showing strong early performance."
    />
  );
}
