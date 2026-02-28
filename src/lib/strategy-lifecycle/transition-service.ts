import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { transitionLifecycle, type StrategyLifecycleState } from "./transitions";

const log = logger.child({ module: "strategy-lifecycle" });

/**
 * Validate, persist, and log a lifecycle state transition.
 * Throws on invalid transitions (no DB write occurs).
 */
export async function performLifecycleTransition(
  instanceId: string,
  from: StrategyLifecycleState,
  to: StrategyLifecycleState,
  reason: string
): Promise<void> {
  transitionLifecycle(from, to); // throws on invalid — no DB write
  await prisma.liveEAInstance.update({
    where: { id: instanceId },
    data: { lifecycleState: to },
  });
  log.info({ instanceId, from, to, reason }, "Lifecycle state transition");
}
