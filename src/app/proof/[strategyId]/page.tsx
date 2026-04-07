import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProofPageView } from "./proof-page-view";
import { LADDER_META } from "@/lib/proof/ladder";
import type { LadderLevel } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ strategyId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { strategyId } = await params;
  const sid = strategyId.toUpperCase();

  const identity = await prisma.strategyIdentity.findUnique({
    where: { strategyId: sid },
    include: {
      project: {
        select: {
          name: true,
          backtestUploads: {
            where: { projectId: { not: undefined } },
            orderBy: { createdAt: "desc" as const },
            take: 1,
            select: {
              runs: {
                take: 1,
                select: {
                  totalTrades: true,
                  profitFactor: true,
                  validationResult: true,
                },
              },
            },
          },
        },
      },
      publicPage: { select: { isPublic: true, ladderLevel: true, pinnedInstanceId: true } },
    },
  });

  if (!identity || !identity.publicPage?.isPublic) {
    return { title: "Strategy Not Found | Algo Studio" };
  }

  // Gather available proof signals
  const levelMeta = LADDER_META[identity.publicPage.ladderLevel as LadderLevel];
  const name = identity.project?.name ?? "Strategy";

  const backtestRun = identity.project?.backtestUploads?.[0]?.runs?.[0] ?? null;
  const backtestTrades = backtestRun?.totalTrades ?? null;
  const profitFactor = backtestRun?.profitFactor ?? null;

  // Extract Monte Carlo survival from validationResult JSON
  let mcSurvivalPct: number | null = null;
  if (backtestRun?.validationResult && typeof backtestRun.validationResult === "object") {
    const vr = backtestRun.validationResult as Record<string, unknown>;
    if (typeof vr.survivalRate === "number") {
      mcSurvivalPct = Math.round(vr.survivalRate * 100);
    }
  }

  // Live trade count from pinned instance (if available)
  let liveTrades: number | null = null;
  if (identity.publicPage.pinnedInstanceId) {
    const trackState = await prisma.trackRecordState.findUnique({
      where: { instanceId: identity.publicPage.pinnedInstanceId },
      select: { totalTrades: true },
    });
    liveTrades = trackState?.totalTrades ?? null;
  }

  // Build title: "{Name} — {Level} Strategy | Algo Studio"
  const title = `${name} — ${levelMeta.label} Strategy | Algo Studio`;

  // Build description from available signals
  const description = buildProofDescription(name, levelMeta.label, {
    backtestTrades,
    liveTrades,
    profitFactor,
    mcSurvivalPct,
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://algo-studio.com"}/proof/${sid}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Algo Studio",
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

/** Build a factual, concise proof description from available signals. */
function buildProofDescription(
  name: string,
  levelLabel: string,
  signals: {
    backtestTrades: number | null;
    liveTrades: number | null;
    profitFactor: number | null;
    mcSurvivalPct: number | null;
  }
): string {
  const { backtestTrades, liveTrades, profitFactor, mcSurvivalPct } = signals;

  // Collect factual stat fragments
  const parts: string[] = [];

  if (liveTrades && liveTrades > 0) {
    parts.push(`${liveTrades.toLocaleString("en-US")} live trades verified`);
  } else if (backtestTrades && backtestTrades > 0) {
    parts.push(`${backtestTrades.toLocaleString("en-US")} backtest trades evaluated`);
  }

  if (profitFactor && profitFactor > 0 && isFinite(profitFactor)) {
    parts.push(`profit factor ${profitFactor.toFixed(2)}`);
  }

  if (mcSurvivalPct !== null) {
    parts.push(`Monte Carlo survival ${mcSurvivalPct}%`);
  }

  // If we have specific stats, build a data-rich description
  if (parts.length > 0) {
    return `${levelLabel} strategy proof for ${name}. ${parts.join(". ")}. Public proof report with tamper-evident audit chain by Algo Studio.`;
  }

  // Fallback: strong generic description
  return `${levelLabel} strategy proof for ${name}. Public proof report with verification ladder, tamper-evident audit chain, and live monitoring by Algo Studio.`;
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
