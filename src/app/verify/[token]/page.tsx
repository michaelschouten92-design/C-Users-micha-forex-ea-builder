import type { Metadata } from "next";
import { ProofViewer } from "./proof-viewer";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Verify Track Record — AlgoStudio`,
    description: `Independent verification of a trading track record. Token: ${token.slice(0, 8)}...`,
    robots: "noindex",
  };
}

export default async function VerifyTokenPage({ params }: Props) {
  const { token } = await params;
  return <ProofViewer token={token} />;
}
