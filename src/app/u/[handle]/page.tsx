import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TraderProfileView } from "./trader-profile-view";
import { TradingDisclaimerBanner } from "@/components/marketing/trading-disclaimer-banner";
import { env } from "@/lib/env";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { handle: true },
  });

  if (!user) return { title: "Trader Not Found | Algo Studio" };

  const title = `@${user.handle} — Trader Profile | Algo Studio`;
  const description = `View ${user.handle}'s verified trading strategies and performance proof on Algo Studio.`;
  const url = `${env.NEXT_PUBLIC_APP_URL || env.AUTH_URL}/@${user.handle}`;

  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "Algo Studio", type: "profile" },
    twitter: { card: "summary", title, description },
    alternates: { canonical: url },
  };
}

export default async function TraderProfilePage({ params }: Props) {
  const { handle } = await params;
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true },
  });
  if (!user) notFound();
  return (
    <>
      <TradingDisclaimerBanner />
      <TraderProfileView handle={handle.toLowerCase()} />
    </>
  );
}
