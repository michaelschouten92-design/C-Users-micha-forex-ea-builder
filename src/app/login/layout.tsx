import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Algo Studio",
  description:
    "Sign in to your Algo Studio account. Monitor your MT5 Expert Advisors, detect strategy drift, and manage verified track records.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
