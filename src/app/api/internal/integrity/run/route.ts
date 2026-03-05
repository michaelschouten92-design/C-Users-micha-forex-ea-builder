import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalIntegrityCheckRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { verifyProofChain, type StoredProofEvent } from "@/lib/proof/chain";
import { appendProofEvent } from "@/lib/proof/events";
import { buildTradeSnapshot } from "@/domain/trade-ingest";

const log = logger.child({ route: "/api/internal/integrity/run" });

const LIVE_SNAPSHOT_INITIAL_BALANCE = 10000;

const integritySchema = z.object({
  recordIdLimit: z.number().int().min(1).max(200).optional(),
  snapshotSampleSize: z.number().int().min(0).max(20).optional(),
});

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

export async function POST(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(
    internalIntegrityCheckRateLimiter,
    `internal-integrity-check:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  // Parse optional body
  let recordIdLimit = 50;
  let snapshotSampleSize = 5;
  try {
    const text = await request.text();
    if (text.trim()) {
      const body = JSON.parse(text);
      const validation = integritySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid request body"), {
          status: 400,
        });
      }
      recordIdLimit = validation.data.recordIdLimit ?? recordIdLimit;
      snapshotSampleSize = validation.data.snapshotSampleSize ?? snapshotSampleSize;
    }
  } catch {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid JSON"), {
      status: 400,
    });
  }

  let chainsChecked = 0;
  let chainsValid = 0;
  let snapshotsChecked = 0;
  let snapshotsValid = 0;
  const failures: string[] = [];
  const now = new Date();

  // ── Proof chain verification ─────────────────────────────────────
  // Fetch last N completed MonitoringRuns with proof events
  const recentRuns = await prisma.monitoringRun.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: recordIdLimit,
    select: { recordId: true, strategyId: true },
  });

  for (const run of recentRuns) {
    try {
      const events = await prisma.proofEventLog.findMany({
        where: { sessionId: run.recordId, sequence: { not: null } },
        orderBy: { sequence: "asc" },
        select: {
          sequence: true,
          strategyId: true,
          type: true,
          sessionId: true,
          eventHash: true,
          prevEventHash: true,
          meta: true,
          createdAt: true,
        },
      });

      chainsChecked++;

      const result = verifyProofChain(events as StoredProofEvent[]);
      if (result.valid) {
        chainsValid++;
      } else {
        const msg = `chain_broken:${run.recordId}: ${result.error}`;
        failures.push(msg);
        log.error({ recordId: run.recordId, result }, "Proof chain verification failed");

        // Enqueue alert for chain failure
        await prisma.alertOutbox
          .create({
            data: {
              eventType: "integrity_check_failed",
              dedupeKey: `integrity_failed:${run.recordId}`,
              payload: {
                type: "integrity_check_failed",
                checkType: "proof_chain",
                recordId: run.recordId,
                strategyId: run.strategyId,
                error: result.error,
                breakAtSequence: result.breakAtSequence,
              },
            },
          })
          .catch((err) => {
            // P2002 = duplicate dedupeKey (already alerted) — safe to ignore
            if (err?.code !== "P2002") {
              log.error({ err, recordId: run.recordId }, "Failed to enqueue integrity alert");
            }
          });
      }
    } catch (err) {
      const msg = `chain_error:${run.recordId}: ${err instanceof Error ? err.message : String(err)}`;
      failures.push(msg);
      log.error({ err, recordId: run.recordId }, "Error during proof chain verification");
    }
  }

  // ── Snapshot hash sampling ───────────────────────────────────────
  // Sample K distinct strategies with recent completed MonitoringRuns
  if (snapshotSampleSize > 0) {
    const sampleRuns = await prisma.monitoringRun.findMany({
      where: {
        status: "COMPLETED",
        tradeSnapshotHash: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: snapshotSampleSize * 3, // over-fetch to get distinct strategies
      select: {
        recordId: true,
        strategyId: true,
        tradeSnapshotHash: true,
      },
      distinct: ["strategyId"],
    });

    const sampled = sampleRuns.slice(0, snapshotSampleSize);

    for (const run of sampled) {
      try {
        const liveFacts = await prisma.tradeFact.findMany({
          where: { strategyId: run.strategyId, source: "LIVE" },
          orderBy: [{ executedAt: "asc" }, { id: "asc" }],
          select: { id: true, profit: true, executedAt: true, source: true },
        });

        snapshotsChecked++;

        if (liveFacts.length === 0) {
          // No facts — hash should be null; if stored hash exists, that's a mismatch
          if (run.tradeSnapshotHash) {
            const msg = `snapshot_mismatch:${run.recordId}: no live facts but stored hash exists`;
            failures.push(msg);
          } else {
            snapshotsValid++;
          }
          continue;
        }

        const rebuilt = buildTradeSnapshot(liveFacts, LIVE_SNAPSHOT_INITIAL_BALANCE);

        if (rebuilt.snapshotHash === run.tradeSnapshotHash) {
          snapshotsValid++;
        } else {
          const msg = `snapshot_mismatch:${run.recordId}: computed=${rebuilt.snapshotHash} stored=${run.tradeSnapshotHash}`;
          failures.push(msg);
          log.error(
            {
              recordId: run.recordId,
              computed: rebuilt.snapshotHash,
              stored: run.tradeSnapshotHash,
            },
            "Snapshot hash mismatch"
          );

          await prisma.alertOutbox
            .create({
              data: {
                eventType: "integrity_check_failed",
                dedupeKey: `integrity_failed:${run.recordId}`,
                payload: {
                  type: "integrity_check_failed",
                  checkType: "snapshot_hash",
                  recordId: run.recordId,
                  strategyId: run.strategyId,
                  computedHash: rebuilt.snapshotHash,
                  storedHash: run.tradeSnapshotHash,
                },
              },
            })
            .catch((err) => {
              if (err?.code !== "P2002") {
                log.error({ err, recordId: run.recordId }, "Failed to enqueue integrity alert");
              }
            });
        }
      } catch (err) {
        const msg = `snapshot_error:${run.recordId}: ${err instanceof Error ? err.message : String(err)}`;
        failures.push(msg);
        log.error({ err, recordId: run.recordId }, "Error during snapshot hash verification");
      }
    }
  }

  // ── Write summary proof event ────────────────────────────────────
  const integrityRecordId = `integrity_${now.getTime()}`;
  try {
    await appendProofEvent("__system__", "INTEGRITY_CHECK_COMPLETED", {
      eventType: "INTEGRITY_CHECK_COMPLETED",
      recordId: integrityRecordId,
      chainsChecked,
      chainsValid,
      snapshotsChecked,
      snapshotsValid,
      failureCount: failures.length,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    log.error({ err }, "Failed to write INTEGRITY_CHECK_COMPLETED proof event");
  }

  return NextResponse.json({
    chainsChecked,
    chainsValid,
    snapshotsChecked,
    snapshotsValid,
    failures,
  });
}
