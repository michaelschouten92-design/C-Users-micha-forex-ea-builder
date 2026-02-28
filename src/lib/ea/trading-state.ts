import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "ea-trading-state" });

export type EATradingState = "TRADING" | "PAUSED";
export type EAAlertState = "ACTIVE" | "DISABLED";

const VALID_TRADING_TRANSITIONS: Record<EATradingState, readonly EATradingState[]> = {
  TRADING: ["PAUSED"],
  PAUSED: ["TRADING"],
};

const VALID_ALERT_TRANSITIONS: Record<EAAlertState, readonly EAAlertState[]> = {
  ACTIVE: ["DISABLED"],
  DISABLED: ["ACTIVE"],
};

/**
 * Transition a LiveEAInstance trading state.
 * Validates the transition, updates the DB, and logs.
 * Warns (never blocks) on unexpected transitions.
 */
export async function transitionTradingState(
  instanceId: string,
  from: EATradingState,
  to: EATradingState,
  reason: string
): Promise<void> {
  const allowed = VALID_TRADING_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    log.warn({ instanceId, from, to, reason }, "Unexpected trading state transition");
  }
  await prisma.liveEAInstance.update({
    where: { id: instanceId },
    data: { tradingState: to },
  });
  log.info({ instanceId, from, to, reason }, "Trading state transition");
}

/**
 * Transition an EAAlertConfig state.
 * Validates the transition, updates the DB, and logs.
 * Warns (never blocks) on unexpected transitions.
 */
export async function transitionAlertState(
  configId: string,
  from: EAAlertState,
  to: EAAlertState,
  reason: string
): Promise<void> {
  const allowed = VALID_ALERT_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    log.warn({ configId, from, to, reason }, "Unexpected alert state transition");
  }
  await prisma.eAAlertConfig.update({
    where: { id: configId },
    data: { state: to },
  });
  log.info({ configId, from, to, reason }, "Alert state transition");
}
