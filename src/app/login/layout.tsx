import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in or create an AlgoStudio account. Build MetaTrader 5 & 4 Expert Advisors with our visual strategy builder.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
