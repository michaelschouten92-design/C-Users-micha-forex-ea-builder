import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AlgoStudio Verified Track Record",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-transparent">{children}</div>;
}
