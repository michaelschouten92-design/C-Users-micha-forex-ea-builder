import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
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

/**
 * Validate, persist, and log a lifecycle state transition.
 * Throws on invalid transitions (no DB write occurs).
 *
 * When `source` is "monitoring", additional prohibitions apply
 * beyond the generic state-machine rules.
 */
export async function performLifecycleTransition(
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

  await prisma.liveEAInstance.update({
    where: { id: instanceId },
    data: { lifecycleState: to },
  });
  log.info({ instanceId, from, to, reason, source }, "Lifecycle state transition");
}
