import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Free Account | AlgoStudio",
  description:
    "Create a free AlgoStudio account and start building MetaTrader 5 Expert Advisors with our visual strategy builder. No credit card required.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
