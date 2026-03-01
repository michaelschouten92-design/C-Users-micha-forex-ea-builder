import { transitionLifecycle, type StrategyLifecycleState } from "./transitions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "strategy-lifecycle" });

export function applyLifecycleTransition(
  strategyId: string,
  from: StrategyLifecycleState,
  to: StrategyLifecycleState,
  reason: string,
  strategyVersion?: number
): StrategyLifecycleState {
  transitionLifecycle(from, to); // throws on invalid
  log.info({ strategyId, strategyVersion, from, to, reason }, "Lifecycle state transition");
  return to;
}
