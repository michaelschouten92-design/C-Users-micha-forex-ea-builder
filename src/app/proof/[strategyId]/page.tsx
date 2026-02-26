import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProofPageView } from "./proof-page-view";
import { LADDER_META } from "@/lib/proof/ladder";
import type { LadderLevel } from "@prisma/client";

interface Props {
  params: Promise<{ strategyId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { strategyId } = await params;

  const identity = await prisma.strategyIdentity.findUnique({
    where: { strategyId: strategyId.toUpperCase() },
    include: {
      project: { select: { name: true, description: true } },
      publicPage: { select: { isPublic: true, ladderLevel: true } },
    },
  });

  if (!identity || !identity.publicPage?.isPublic) {
    return { title: "Strategy Not Found | AlgoStudio" };
  }

  const levelMeta = LADDER_META[identity.publicPage.ladderLevel as LadderLevel];
  const title = `${identity.project.name} — ${levelMeta.label} Strategy | AlgoStudio`;
  const description =
    identity.project.description ||
    `${levelMeta.label} trading strategy ${strategyId} with cryptographically verified performance on AlgoStudio.`;
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://algo-studio.com"}/proof/${strategyId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "AlgoStudio",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ProofPage({ params }: Props) {
  const { strategyId } = await params;

  const identity = await prisma.strategyIdentity.findUnique({
    where: { strategyId: strategyId.toUpperCase() },
    include: {
      publicPage: { select: { isPublic: true } },
    },
  });

  if (!identity || !identity.publicPage?.isPublic) {
    notFound();
  }

  return <ProofPageView strategyId={strategyId.toUpperCase()} />;
}
