import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProofShortUrl({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Direct passthrough for strategy IDs (AS-xxxxxxxx format)
  if (code.toUpperCase().startsWith("AS-")) {
    redirect(`/proof/${code.toUpperCase()}`);
  }

  // Slug lookup: find the strategy ID from the VerifiedStrategyPage slug
  const page = await prisma.verifiedStrategyPage.findUnique({
    where: { slug: code },
    select: {
      isPublic: true,
      strategyIdentity: { select: { strategyId: true } },
    },
  });

  if (!page?.isPublic) {
    notFound();
  }

  redirect(`/proof/${page.strategyIdentity.strategyId}`);
}
