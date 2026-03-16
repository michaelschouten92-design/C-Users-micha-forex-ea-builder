import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Free Account | AlgoStudio",
  description:
    "Create a free AlgoStudio account and start monitoring your MetaTrader 5 strategies with governance, drift detection, and verified track records. No credit card required.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
