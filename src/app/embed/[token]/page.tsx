import type { Metadata } from "next";
import { EmbedWidget } from "./embed-widget";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface EmbedPageProps {
  params: Promise<{ token: string }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { token } = await params;
  return <EmbedWidget token={token} />;
}
