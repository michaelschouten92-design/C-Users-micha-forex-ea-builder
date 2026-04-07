import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in or create an Algo Studio account. Monitor, govern, and verify your MetaTrader 5 trading strategies.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
