import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TraderProfileView } from "./trader-profile-view";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { handle: true },
  });

  if (!user) return { title: "Trader Not Found | AlgoStudio" };

  const title = `@${user.handle} — Trader Profile | AlgoStudio`;
  const description = `View ${user.handle}'s verified trading strategies and performance proof on AlgoStudio.`;
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://algo-studio.com"}/@${user.handle}`;

  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "AlgoStudio", type: "profile" },
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
  return <TraderProfileView handle={handle.toLowerCase()} />;
}
