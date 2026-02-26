import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { sendWeeklyEdgeReport } from "@/lib/email";

const log = logger.child({ route: "/api/cron/weekly-report" });

/**
 * POST /api/cron/weekly-report — Send weekly edge reports to all users
 *
 * Designed to run every Monday via Vercel Cron or external scheduler.
 * Protected by CRON_SECRET bearer token.
 *
 * For each user with at least one public strategy:
 * - Gather health score changes over the past week
 * - Gather new alerts triggered
 * - Gather monitoring status changes
 * - Send summary email with CTA links
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  // Timeout guard: stop processing 5s before Vercel's 60s limit
  const deadline = Date.now() + 55_000;

  // Find users with live instances or public proofs
  const users = await prisma.user.findMany({
    where: {
      suspended: false,
      OR: [
        { liveEAs: { some: { deletedAt: null } } },
        {
          projects: {
            some: {
              deletedAt: null,
              strategyIdentity: { publicPage: { isPublic: true } },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      handle: true,
    },
    take: 500,
  });

  log.info({ userCount: users.length }, "Starting weekly edge reports");

  // Pre-load all instances for these users (avoids N+1)
  const allInstances = await prisma.liveEAInstance.findMany({
    where: { userId: { in: users.map((u) => u.id) }, deletedAt: null },
    select: { id: true, userId: true, eaName: true, status: true },
  });
  const instancesByUser = new Map<string, typeof allInstances>();
  for (const inst of allInstances) {
    const list = instancesByUser.get(inst.userId) ?? [];
    list.push(inst);
    instancesByUser.set(inst.userId, list);
  }

  // Pre-load latest + week-ago health snapshots for all instances (avoids N+1)
  const allInstanceIds = allInstances.map((i) => i.id);
  const [latestSnapshots, previousSnapshots] = await Promise.all([
    prisma.healthSnapshot.findMany({
      where: { instanceId: { in: allInstanceIds } },
      distinct: ["instanceId"],
      orderBy: { createdAt: "desc" },
      select: { instanceId: true, overallScore: true, status: true },
    }),
    prisma.healthSnapshot.findMany({
      where: { instanceId: { in: allInstanceIds }, createdAt: { lte: oneWeekAgo } },
      distinct: ["instanceId"],
      orderBy: { createdAt: "desc" },
      select: { instanceId: true, overallScore: true, status: true },
    }),
  ]);

  const latestMap = new Map(latestSnapshots.map((s) => [s.instanceId, s]));
  const previousMap = new Map(previousSnapshots.map((s) => [s.instanceId, s]));

  for (const user of users) {
    if (Date.now() > deadline) {
      log.warn({ sent, skipped, errors }, "Weekly report deadline reached, stopping");
      break;
    }

    try {
      const instances = instancesByUser.get(user.id) ?? [];

      const healthChanges: Array<{
        eaName: string;
        currentScore: number;
        previousScore: number | null;
        change: number;
      }> = [];

      const statusChanges: Array<{
        eaName: string;
        currentStatus: string;
        previousStatus: string;
      }> = [];

      for (const inst of instances) {
        const latest = latestMap.get(inst.id);
        const previous = previousMap.get(inst.id);

        if (latest) {
          const currentScore = Math.round(latest.overallScore * 100);
          const previousScore = previous ? Math.round(previous.overallScore * 100) : null;
          const change = previousScore !== null ? currentScore - previousScore : 0;

          if (Math.abs(change) >= 5 || previousScore === null) {
            healthChanges.push({
              eaName: inst.eaName,
              currentScore,
              previousScore,
              change,
            });
          }

          if (previous && latest.status !== previous.status) {
            statusChanges.push({
              eaName: inst.eaName,
              currentStatus: latest.status,
              previousStatus: previous.status,
            });
          }
        }
      }

      // Skip if nothing to report
      if (healthChanges.length === 0 && statusChanges.length === 0) {
        skipped++;
        continue;
      }

      // Send email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://algo-studio.com";
      const result = await sendWeeklyEdgeReport(user.email, {
        healthChanges,
        statusChanges,
        monitorUrl: `${appUrl}/app/monitor`,
        proofUrl: user.handle ? `${appUrl}/@${user.handle}` : `${appUrl}/app`,
      });

      if (result.error) {
        errors++;
        log.error({ err: result.error, userId: user.id }, "Failed to send weekly report");
      } else {
        sent++;
      }
    } catch (err) {
      errors++;
      log.error({ err, userId: user.id }, "Error processing weekly report for user");
    }
  }

  log.info({ sent, skipped, errors, total: users.length }, "Weekly edge reports complete");

  return NextResponse.json({ sent, skipped, errors, total: users.length });
}
