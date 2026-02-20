import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerifiedStrategyView } from "./verified-strategy-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.verifiedStrategyPage.findUnique({
    where: { slug },
    include: {
      strategyIdentity: {
        include: {
          project: { select: { name: true, description: true } },
        },
      },
    },
  });

  if (!page || !page.isPublic) {
    return { title: "Strategy Not Found" };
  }

  return {
    title: `${page.strategyIdentity.project.name} | AlgoStudio Verified Strategy`,
    description:
      page.strategyIdentity.project.description ||
      `Verified trading strategy ${page.strategyIdentity.strategyId} on AlgoStudio`,
  };
}

export default async function VerifiedStrategyPage({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.verifiedStrategyPage.findUnique({
    where: { slug },
    select: { isPublic: true },
  });

  if (!page || !page.isPublic) {
    notFound();
  }

  return <VerifiedStrategyView slug={slug} />;
}
