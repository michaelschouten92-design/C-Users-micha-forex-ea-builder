import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Free Account — MT5 EA Monitoring | Algo Studio",
  description:
    "Create a free Algo Studio account. Monitor your MT5 Expert Advisors, detect strategy drift, and get verified track records. All features included — no credit card required.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
