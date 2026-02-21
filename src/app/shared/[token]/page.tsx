import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import type { Metadata } from "next";
import { SharedStrategyView } from "./shared-strategy-view";
import type { BuildJsonSchema } from "@/types/builder";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;

  const share = await prisma.projectShare.findUnique({
    where: { shareToken: token },
    include: {
      project: { select: { name: true, description: true } },
    },
  });

  if (!share) {
    return { title: "Shared Strategy | AlgoStudio" };
  }

  return {
    title: `${share.project.name} — Shared Strategy | AlgoStudio`,
    description:
      share.project.description ?? "View this shared trading strategy built with AlgoStudio.",
  };
}

export default async function SharedProjectPage({ params }: Props) {
  const { token } = await params;

  const share = await prisma.projectShare.findUnique({
    where: { shareToken: token },
    include: {
      project: {
        include: {
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1,
            select: { buildJson: true, versionNo: true },
          },
        },
      },
    },
  });

  if (!share) {
    notFound();
  }

  // Check expiry
  if (share.expiresAt && share.expiresAt < new Date()) {
    notFound();
  }

  // Check project not soft-deleted
  if (share.project.deletedAt) {
    notFound();
  }

  const latestVersion = share.project.versions[0] ?? null;
  const buildJson = latestVersion?.buildJson as BuildJsonSchema | null;

  // Extract strategy info from nodes
  const nodes = buildJson?.nodes ?? [];
  const nodeCount = nodes.length;

  const categories: Record<string, number> = {};
  for (const node of nodes) {
    const category = (node.data as { category?: string })?.category ?? "unknown";
    categories[category] = (categories[category] ?? 0) + 1;
  }

  // Determine strategy type from nodes
  const indicatorNode = nodes.find(
    (n) => (n.data as { indicatorType?: string })?.indicatorType !== undefined
  );
  const strategyType = indicatorNode
    ? String((indicatorNode.data as { indicatorType: string }).indicatorType)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Custom";

  return (
    <div className="min-h-screen bg-[#0D0117]">
      <SiteNav />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[#A78BFA] bg-[rgba(167,139,250,0.15)] px-2.5 py-1 rounded-full font-medium">
                Shared Strategy
              </span>
              {latestVersion && (
                <span className="text-xs text-[#7C8DB0]">Version {latestVersion.versionNo}</span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{share.project.name}</h1>
            {share.project.description && (
              <p className="text-[#94A3B8] text-lg">{share.project.description}</p>
            )}
          </div>

          {/* Strategy Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
              <div className="text-sm text-[#7C8DB0] mb-1">Strategy Type</div>
              <div className="text-lg font-semibold text-white">{strategyType}</div>
            </div>
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
              <div className="text-sm text-[#7C8DB0] mb-1">Total Blocks</div>
              <div className="text-lg font-semibold text-white">{nodeCount}</div>
            </div>
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5">
              <div className="text-sm text-[#7C8DB0] mb-1">Categories Used</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(categories).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="text-xs bg-[rgba(79,70,229,0.15)] text-[#CBD5E1] px-2 py-0.5 rounded"
                  >
                    {cat.replace("trademanagement", "Trade Mgmt")} ({count})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Node list and read-only canvas */}
          {buildJson && nodes.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Strategy Blocks</h2>
              <SharedStrategyView buildJson={buildJson} />
            </div>
          ) : (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-12 text-center mb-8">
              <p className="text-[#7C8DB0]">This strategy has no blocks yet.</p>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-r from-[#4F46E5]/20 to-[#A78BFA]/20 border border-[rgba(79,70,229,0.3)] rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Build Your Own EA</h2>
            <p className="text-[#94A3B8] mb-6 max-w-lg mx-auto">
              Create your own Expert Advisor with our visual strategy builder. No coding required.
              Start with a template and customize to your style.
            </p>
            <Link
              href="/login?mode=register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Start Building Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
