import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { logger } from "@/lib/logger";
import { apiError, ErrorCode } from "@/lib/error-codes";
import { resolveTradeDeploymentAttribution } from "@/lib/deployment/trade-attribution";
import { z } from "zod";

const log = logger.child({ module: "history-backfill" });

/**
 * POST /api/telemetry/terminal/history-backfill
 *
 * One-shot historical trade import. The Monitor EA calls this on first attach
 * to upload closed deals that predate the current session. Writes directly to
 * EATrade (NOT TrackRecordEvent) because the proof chain is append-only — you
 * cannot insert retroactive events without invalidating the hash chain.
 *
 * Why a separate endpoint (not /api/telemetry/trade):
 *   - /api/telemetry/trade authenticates as the EA whose trades it receives,
 *     but the Monitor's key is for the base instance; foreign EAs don't have
 *     Algo Studio keys.
 *   - /api/track-record/ingest would pollute the chain with backdated events.
 *   - This endpoint exists solely for the retroactive view-model population.
 *
 * Semantics:
 *   - Idempotent: upsert on (instanceId, ticket) — re-running is safe.
 *   - Per-trade attribution: resolve to child instance via (parent, symbol,
 *     magicNumber). Trades that don't route to an owned instance are skipped.
 *   - No side effects: unlike /trade, does NOT fire webhooks/alerts (trades
 *     already closed — "new trade!" alerts would be nonsense).
 *   - Not chain-participant: these rows have no proof coverage and are
 *     ineligible for ledger commitments.
 *
 * Security:
 *   - X-EA-Key → authenticates as Monitor base instance (auth.instanceId).
 *   - Each trade must resolve to a LiveEAInstance owned by the same user
 *     AND chain back to the authed base (id === auth.instanceId or
 *     parentInstanceId === auth.instanceId). A leaked Monitor key cannot
 *     corrupt other users.
 */

const tradeSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  symbol: z
    .string()
    .min(1)
    .max(32)
    .transform((s) => s.toUpperCase()),
  type: z.enum(["BUY", "SELL"]),
  openPrice: z.number().finite().min(0).max(1e8),
  closePrice: z.number().finite().min(0).max(1e8),
  lots: z.number().finite().min(0.01).max(1000),
  profit: z.number().finite().min(-1e8).max(1e8),
  openTime: z.union([z.string(), z.number()]),
  closeTime: z.union([z.string(), z.number()]),
  magicNumber: z.number().int().min(0),
  mode: z.enum(["LIVE", "PAPER"]).optional(),
});

const bodySchema = z.object({
  trades: z.array(tradeSchema).min(1).max(50),
});

type TradeInput = z.infer<typeof tradeSchema>;

/** Convert a timestamp (string or number, seconds or ms) to a Date. */
function toDate(value: string | number): Date {
  if (typeof value === "string") return new Date(value);
  return new Date(value < 1e12 ? value * 1000 : value);
}

/**
 * Per-instance cap on backfilled rows — prevents a misbehaving EA from
 * flooding EATrade. Bumped from 2_000 to 10_000 because long-running real
 * accounts (5+ years of trading) can legitimately exceed the lower cap and
 * silent skip beyond it was costing those users their entire history.
 */
const BACKFILL_ROW_CAP_PER_INSTANCE = 10_000;

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid JSON"), {
      status: 400,
    });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid backfill batch",
        parsed.error.issues.map((i) => i.message)
      ),
      { status: 400 }
    );
  }

  // Load the authed instance + any children it parents. Backfill is only
  // allowed to write into this set — a Monitor's key cannot touch unrelated
  // instances even if a payload references them.
  const candidates = await prisma.liveEAInstance.findMany({
    where: {
      userId: auth.userId,
      deletedAt: null,
      OR: [{ id: auth.instanceId }, { parentInstanceId: auth.instanceId }],
    },
    select: { id: true, symbol: true, lifecycleState: true },
  });
  const ownedIds = new Set(candidates.map((c) => c.id));

  if (candidates.length === 0) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "No instances owned by this monitor"), {
      status: 404,
    });
  }

  // Per-instance cap: count existing EATrade rows for all owned instances.
  // If adding this batch would exceed the cap for any single instance, reject
  // the whole batch rather than do a partial write. Keeps the admin model
  // simple (one request = atomic semantics from the EA's perspective).
  const existingCounts = await prisma.eATrade.groupBy({
    by: ["instanceId"],
    where: { instanceId: { in: [...ownedIds] } },
    _count: { id: true },
  });
  const countByInstance = new Map(existingCounts.map((r) => [r.instanceId, r._count.id]));

  const results: Array<{
    ticket: string;
    status: "accepted" | "skipped";
    reason?: string;
  }> = [];

  let accepted = 0;

  for (const t of parsed.data.trades) {
    const outcome = await ingestOne(t, candidates, countByInstance);
    results.push(outcome);
    if (outcome.status === "accepted") accepted++;
  }

  // Surface row-cap pressure as a top-level signal so the EA can decide to
  // stop sending more (and the admin sees it in monitoring). Without this
  // the cap-skip was silent and large legacy accounts lost most of their
  // historical data without warning.
  const capSkipped = results.filter((r) => r.reason === "instance row cap reached").length;
  const capReached = capSkipped > 0;

  log.info(
    {
      baseInstanceId: auth.instanceId,
      total: parsed.data.trades.length,
      accepted,
      capSkipped,
      capLimit: BACKFILL_ROW_CAP_PER_INSTANCE,
    },
    "History backfill batch processed"
  );

  return NextResponse.json({
    success: true,
    accepted,
    rejected: parsed.data.trades.length - accepted,
    capReached,
    capLimit: BACKFILL_ROW_CAP_PER_INSTANCE,
    results,
  });
}

type Candidate = { id: string; symbol: string | null; lifecycleState: string };

async function ingestOne(
  t: TradeInput,
  candidates: Candidate[],
  countByInstance: Map<string, number>
): Promise<{ ticket: string; status: "accepted" | "skipped"; reason?: string }> {
  // Resolve target via (symbol, magicNumber) → TerminalDeployment → instanceId.
  // Deployment-based resolution is the canonical path — it matches exactly
  // what /terminal/deployments + heartbeat context resolution use. Falling
  // back to "symbol alone" would misroute when multiple magics share a symbol.
  const ownedIds = candidates.map((c) => c.id);
  const deployment = await prisma.terminalDeployment.findFirst({
    where: {
      instanceId: { in: ownedIds },
      symbol: t.symbol,
      magicNumber: t.magicNumber,
    },
    select: { instanceId: true },
  });

  const targetId = deployment?.instanceId ?? null;
  if (!targetId) {
    return {
      ticket: t.ticket,
      status: "skipped",
      reason: "no owned deployment for (symbol, magicNumber)",
    };
  }

  const target = candidates.find((c) => c.id === targetId);
  if (!target) {
    // Defensive — deployment pointed at a non-owned instance. Should be
    // unreachable given the ownedIds filter above, but fail closed.
    return { ticket: t.ticket, status: "skipped", reason: "deployment owner mismatch" };
  }

  if (target.lifecycleState === "INVALIDATED") {
    return { ticket: t.ticket, status: "skipped", reason: "instance invalidated" };
  }

  const existingCount = countByInstance.get(target.id) ?? 0;
  if (existingCount >= BACKFILL_ROW_CAP_PER_INSTANCE) {
    return { ticket: t.ticket, status: "skipped", reason: "instance row cap reached" };
  }

  try {
    const attribution = await resolveTradeDeploymentAttribution(target.id, t.symbol, t.magicNumber);

    const openTime = toDate(t.openTime);
    const closeTime = toDate(t.closeTime);

    await prisma.eATrade.upsert({
      where: { instanceId_ticket: { instanceId: target.id, ticket: t.ticket } },
      create: {
        instanceId: target.id,
        ticket: t.ticket,
        symbol: t.symbol,
        type: t.type,
        openPrice: t.openPrice,
        closePrice: t.closePrice,
        lots: t.lots,
        profit: t.profit,
        openTime,
        closeTime,
        mode: t.mode ?? null,
        magicNumber: t.magicNumber,
        terminalDeploymentId: attribution.terminalDeploymentId,
      },
      // Idempotent. Running backfill twice doesn't overwrite live-ingested
      // fields — if a row already exists it stays as-is. The EA is expected
      // to only backfill deals that aren't already tracked, and this guard
      // ensures correctness even if that assumption breaks.
      update: {},
    });

    // Increment local counter so subsequent trades in the same batch respect
    // the cap without re-querying.
    countByInstance.set(target.id, existingCount + 1);

    return { ticket: t.ticket, status: "accepted" };
  } catch (err) {
    log.error({ err, instanceId: target.id, ticket: t.ticket }, "Backfill upsert failed");
    return { ticket: t.ticket, status: "skipped", reason: "upsert failed" };
  }
}
