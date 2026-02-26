import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ handle: string; slug: string }>;
}

/**
 * /@handle/slug → redirect to canonical /proof/[strategyId]
 */
export default async function ProofByHandlePage({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.verifiedStrategyPage.findUnique({
    where: { slug },
    include: {
      strategyIdentity: { select: { strategyId: true } },
    },
  });

  if (!page || !page.isPublic) notFound();

  redirect(`/proof/${page.strategyIdentity.strategyId}`);
}
