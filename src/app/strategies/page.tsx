import type { Metadata } from "next";
import { StrategiesView } from "./strategies-view";

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export const metadata: Metadata = {
  title: "Verified Strategies | AlgoStudio",
  description:
    "Browse curated, independently verified algorithmic trading strategies with cryptographic proof of performance.",
  alternates: { canonical: `${baseUrl}/strategies` },
  openGraph: {
    title: "Verified Strategies | AlgoStudio",
    description:
      "Browse curated, independently verified algorithmic trading strategies with cryptographic proof of performance.",
    url: `${baseUrl}/strategies`,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function StrategiesPage() {
  return <StrategiesView />;
}
