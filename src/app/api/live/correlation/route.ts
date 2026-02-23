import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      { error: "Live EA monitoring requires a Pro or Elite subscription" },
      { status: 403 }
    );
  }

  const instances = await prisma.liveEAInstance.findMany({
    where: { userId: session.user.id, deletedAt: null },
    take: 10,
    orderBy: { updatedAt: "desc" },
    include: {
      heartbeats: {
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { equity: true, createdAt: true },
      },
    },
  });

  if (instances.length < 2) {
    return NextResponse.json({ matrix: [], labels: [] });
  }

  // Build equity return series for each instance
  const series: { id: string; name: string; returns: number[] }[] = [];
  for (const inst of instances) {
    if (inst.heartbeats.length < 5) continue;
    const returns: number[] = [];
    for (let i = 1; i < inst.heartbeats.length; i++) {
      const prev = inst.heartbeats[i - 1].equity;
      const curr = inst.heartbeats[i].equity;
      returns.push(prev > 0 ? (curr - prev) / prev : 0);
    }
    series.push({ id: inst.id, name: inst.eaName, returns });
  }

  // Pearson correlation matrix
  const n = series.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const labels = series.map((s) => s.name);

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const corr = pearsonCorrelation(series[i].returns, series[j].returns);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return NextResponse.json({ matrix, labels });
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const len = Math.min(x.length, y.length);
  if (len < 3) return 0;

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < len; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const denomSq = (len * sumX2 - sumX * sumX) * (len * sumY2 - sumY * sumY);
  const denom = Math.sqrt(Math.max(0, denomSq));
  if (denom === 0) return 0;
  const r = (len * sumXY - sumX * sumY) / denom;
  // Clamp to [-1, 1] to guard against floating-point drift
  return Math.max(-1, Math.min(1, r));
}
