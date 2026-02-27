import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "subscription-transitions" });

// ---------------------------------------------------------------------------
// Prisma transaction client type (works with both `prisma` and `tx`)
// ---------------------------------------------------------------------------
export type TransactionClient = {
  subscription: {
    update: (args: {
      where: { userId: string } | { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
};

// ---------------------------------------------------------------------------
// Valid status transitions — warn (never block) on unexpected ones
// ---------------------------------------------------------------------------
const VALID_STATUS_TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  active: ["past_due", "cancelled", "paused", "unpaid"],
  trialing: ["active", "past_due", "cancelled"],
  past_due: ["active", "cancelled", "unpaid"],
  cancelled: ["active", "trialing"],
  incomplete: ["active", "expired", "cancelled"],
  incomplete_expired: [],
  expired: ["active"],
  unpaid: ["active", "cancelled"],
  paused: ["active", "cancelled"],
};

// ---------------------------------------------------------------------------
// Map Stripe subscription status → internal SubscriptionStatus
// ---------------------------------------------------------------------------
const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "active",
  canceled: "cancelled",
  incomplete: "incomplete",
  incomplete_expired: "expired",
  past_due: "past_due",
  paused: "paused",
  trialing: "trialing",
  unpaid: "unpaid",
};

export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  return STRIPE_STATUS_MAP[stripeStatus] ?? "active";
}

// ---------------------------------------------------------------------------
// Structured transition log (shared by both functions)
// ---------------------------------------------------------------------------
function emitTransitionLog(
  userId: string,
  from: { status?: SubscriptionStatus; tier?: PlanTier },
  to: { status?: SubscriptionStatus; tier?: PlanTier },
  reason: string
): void {
  log.info(
    {
      userId,
      fromStatus: from.status,
      toStatus: to.status,
      fromTier: from.tier,
      toTier: to.tier,
      reason,
    },
    "Subscription state transition"
  );
}

// ---------------------------------------------------------------------------
// Core transition function — DB update + validation + structured log
// ---------------------------------------------------------------------------
export async function transitionSubscription(
  db: TransactionClient,
  userId: string,
  from: { status: SubscriptionStatus; tier: PlanTier },
  to: { status?: SubscriptionStatus; tier?: PlanTier },
  reason: string,
  extraData?: Record<string, unknown>
): Promise<void> {
  // Validate transition (warn only — Stripe is source of truth)
  if (to.status && to.status !== from.status) {
    const isForceFree = to.status === "cancelled" && to.tier === "FREE";
    const allowed = VALID_STATUS_TRANSITIONS[from.status];
    if (!isForceFree && !allowed.includes(to.status)) {
      log.warn(
        {
          userId,
          fromStatus: from.status,
          toStatus: to.status,
          reason,
        },
        "Unexpected subscription status transition"
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (to.status !== undefined) data.status = to.status;
  if (to.tier !== undefined) data.tier = to.tier;
  Object.assign(data, extraData);

  await db.subscription.update({
    where: { userId },
    data,
  });

  emitTransitionLog(userId, from, to, reason);
}

// ---------------------------------------------------------------------------
// Log-only variant — for upserts/updateMany where DB write already happened
// ---------------------------------------------------------------------------
export function logSubscriptionTransition(
  userId: string,
  from: { status?: SubscriptionStatus; tier?: PlanTier },
  to: { status?: SubscriptionStatus; tier?: PlanTier },
  reason: string
): void {
  emitTransitionLog(userId, from, to, reason);
}
