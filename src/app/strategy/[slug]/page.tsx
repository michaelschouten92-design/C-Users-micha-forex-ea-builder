import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerifiedStrategyView } from "./verified-strategy-view";

interface Props {
  params: Promise<{ slug: string }>;
}

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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
    return { title: "Strategy Not Found", robots: { index: false, follow: false } };
  }

  const title = `${page.strategyIdentity.project?.name ?? "Strategy"} | Algo Studio Verified Strategy`;
  const description =
    page.strategyIdentity.project?.description ||
    `Verified trading strategy ${page.strategyIdentity.strategyId} on Algo Studio`;
  const url = `${baseUrl}/strategy/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: ["/opengraph-image"],
    },
    twitter: { card: "summary_large_image", title, description },
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
