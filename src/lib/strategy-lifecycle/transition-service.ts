import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { appendProofEventInTx } from "@/lib/proof/events";
import { transitionLifecycle, type StrategyLifecycleState } from "./transitions";

const log = logger.child({ module: "strategy-lifecycle" });

/**
 * Transitions prohibited for automated monitoring.
 *
 * Monitoring must not skip EDGE_AT_RISK and jump directly from
 * LIVE_MONITORING → INVALIDATED. That path remains open for
 * operator overrides (manual retirement).
 */
const MONITORING_PROHIBITED_TRANSITIONS: ReadonlySet<string> = new Set([
  "LIVE_MONITORING->INVALIDATED",
]);

export type TransitionSource = "monitoring" | "operator" | "verification" | "system";

/** Minimal tx client shape needed for lifecycle mutations. */
type LifecycleTxClient = Pick<typeof prisma, "liveEAInstance">;

/**
 * Validate, persist, and log a lifecycle state transition using
 * the provided transaction client. Does NOT create its own transaction —
 * the caller controls the tx boundary.
 *
 * Throws on invalid transitions (no DB write occurs).
 * When `source` is "monitoring", additional prohibitions apply.
 */
export async function performLifecycleTransitionInTx(
  tx: LifecycleTxClient,
  instanceId: string,
  from: StrategyLifecycleState,
  to: StrategyLifecycleState,
  reason: string,
  source?: TransitionSource
): Promise<void> {
  transitionLifecycle(from, to); // throws on invalid — no DB write

  if (source === "monitoring" && MONITORING_PROHIBITED_TRANSITIONS.has(`${from}->${to}`)) {
    throw new Error(`Monitoring cannot transition ${from} → ${to}: must pass through EDGE_AT_RISK`);
  }

  await tx.liveEAInstance.update({
    where: { id: instanceId },
    data: { lifecycleState: to },
  });
  log.info({ instanceId, from, to, reason, source }, "Lifecycle state transition");
}

/**
 * Validate, persist, and log a lifecycle state transition.
 * Uses the global prisma client — for callers that don't need
 * to participate in an outer transaction.
 *
 * Throws on invalid transitions (no DB write occurs).
 * When `source` is "monitoring", additional prohibitions apply.
 */
export async function performLifecycleTransition(
  instanceId: string,
  from: StrategyLifecycleState,
  to: StrategyLifecycleState,
  reason: string,
  source?: TransitionSource
): Promise<void> {
  return performLifecycleTransitionInTx(prisma, instanceId, from, to, reason, source);
}

// ── Operator Hold ────────────────────────────────────────

export type OperatorHoldResult = { ok: true } | { ok: false; code: string };

/**
 * Set operator hold for a live instance. Governance boundary:
 * - Verifies instance ownership (userId)
 * - Validates state transition (NONE↔HALTED only)
 * - Idempotent (setting same value is ok)
 * - Proof-first: writes audit event before mutation in serializable tx
 * - Never throws across boundary; returns structured error codes
 */
export async function setOperatorHold({
  userId,
  instanceId,
  hold,
}: {
  userId: string;
  instanceId: string;
  hold: "HALTED" | "NONE";
}): Promise<OperatorHoldResult> {
  // 1) Ownership check — include strategyId for proof chain
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId, deletedAt: null },
    select: {
      id: true,
      operatorHold: true,
      lifecycleState: true,
      strategyVersion: {
        select: { strategyIdentity: { select: { strategyId: true } } },
      },
    },
  });

  if (!instance) {
    return { ok: false, code: "NOT_OWNER" };
  }

  // 2) Idempotency — already in desired state
  if (instance.operatorHold === hold) {
    return { ok: true };
  }

  // 3) Validate transition direction
  //    HALT:    only from NONE (not from OVERRIDE_PENDING)
  //    RELEASE: from HALTED or OVERRIDE_PENDING (unstick after failed override flow)
  if (hold === "HALTED" && instance.operatorHold !== "NONE") {
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  if (hold === "NONE" && instance.operatorHold !== "HALTED" && instance.operatorHold !== "OVERRIDE_PENDING") {
    return { ok: false, code: "INVALID_TRANSITION" };
  }

  // 4) Proof-first mutation in serializable transaction
  const proofEvent = hold === "HALTED" ? "OPERATOR_HALT_APPLIED" : "OPERATOR_HALT_RELEASED";
  const recordId = randomUUID();
  const strategyId = instance.strategyVersion?.strategyIdentity?.strategyId ?? instanceId;

  try {
    await prisma.$transaction(
      async (tx) => {
        await appendProofEventInTx(tx, strategyId, proofEvent, {
          eventType: proofEvent,
          recordId,
          instanceId,
          previousHold: instance.operatorHold,
          newHold: hold,
          requestedBy: userId,
          lifecycleState: instance.lifecycleState,
          timestamp: new Date().toISOString(),
        });

        await tx.liveEAInstance.update({
          where: { id: instance.id },
          data: { operatorHold: hold },
        });
      },
      { isolationLevel: "Serializable" }
    );

    log.info(
      { instanceId, previousHold: instance.operatorHold, newHold: hold, userId },
      "Operator hold changed"
    );

    return { ok: true };
  } catch (err) {
    log.error({ err, instanceId, hold }, "Failed to set operator hold");
    return { ok: false, code: "MUTATION_FAILED" };
  }
}
