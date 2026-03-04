"use server";

import { auth } from "@/lib/auth";
import {
  setOperatorHold,
  type OperatorHoldResult,
} from "@/lib/strategy-lifecycle/transition-service";

const VALID_HOLDS = new Set(["HALTED", "NONE"]);

export async function updateOperatorHold(
  instanceId: string,
  hold: string
): Promise<OperatorHoldResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  if (typeof instanceId !== "string" || instanceId.length === 0) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  if (!VALID_HOLDS.has(hold)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  return setOperatorHold({
    userId: session.user.id,
    instanceId,
    hold: hold as "HALTED" | "NONE",
  });
}
