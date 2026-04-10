import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { fireWebhook } from "@/lib/webhook";
import { checkNewTradeAlerts } from "@/lib/alerts";
import { logger } from "@/lib/logger";
import { apiError, ErrorCode } from "@/lib/error-codes";
import { resolveTradeDeploymentAttribution } from "@/lib/deployment/trade-attribution";
import { z } from "zod";

/** Convert a timestamp (string or number) to a Date. Handles Unix seconds vs milliseconds. */
function toDate(value: string | number): Date {
  if (typeof value === "string") return new Date(value);
  // Unix seconds are < 1e12 (year ~33658 in ms); treat small numbers as seconds
  return new Date(value < 1e12 ? value * 1000 : value);
}

const tradeSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  // Normalize to uppercase at the ingest boundary so the ledger stays consistent
  // with LiveEAInstance.symbol and terminal deployment keys, both of which also
  // uppercase. Prevents attribution misses when a broker reports mixed case.
  symbol: z
    .string()
    .max(32)
    .transform((s) => s.toUpperCase()),
  type: z.string().max(16),
  openPrice: z.number().finite().min(0).max(1e8),
  closePrice: z.number().finite().min(0).max(1e8).nullable().optional(),
  lots: z.number().finite().min(0.01).max(1000),
  profit: z.number().finite().min(-1e8).max(1e8).default(0),
  openTime: z.string().or(z.number()),
  closeTime: z.string().or(z.number()).nullable().optional(),
  mode: z.string().max(16).optional(),
  magicNumber: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const parsed = tradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Invalid trade data",
          parsed.error.issues.map((i) => i.message)
        ),
        { status: 400 }
      );
    }

    const {
      ticket,
      symbol,
      type,
      openPrice,
      closePrice,
      lots,
      profit,
      openTime,
      closeTime,
      magicNumber,
    } = parsed.data;

    // Security: auth.instanceId is derived from the API key (one key = one instance).
    // The request body has no instanceId field, preventing a leaked key from affecting other instances.

    // Fetch instance once: used for the governance gate below AND for webhook/
    // alert fan-out after the upsert.
    const instance = await prisma.liveEAInstance.findUnique({
      where: { id: auth.instanceId, deletedAt: null },
      select: {
        lifecycleState: true,
        eaName: true,
        user: { select: { webhookUrl: true } },
      },
    });

    if (!instance) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
        status: 404,
      });
    }

    // Governance gate: reject trades from invalidated instances. The proof layer
    // and the EATrade ledger must be sealed at the moment of invalidation —
    // post-invalidation events would corrupt the audit trail and skew dashboard
    // metrics. Non-compliant EAs that ignore the heartbeat STOP action cannot
    // sneak trades in through this endpoint.
    if (instance.lifecycleState === "INVALIDATED") {
      return NextResponse.json(
        apiError(
          ErrorCode.FORBIDDEN,
          "Strategy is invalidated — trading authority revoked",
          "STRATEGY_INVALIDATED"
        ),
        { status: 403 }
      );
    }

    // Resolve deployment attribution (write-once at ingestion time)
    const attribution = await resolveTradeDeploymentAttribution(
      auth.instanceId,
      symbol,
      magicNumber ?? null
    );

    // Upsert trade based on unique [instanceId, ticket]
    await prisma.eATrade.upsert({
      where: {
        instanceId_ticket: {
          instanceId: auth.instanceId,
          ticket,
        },
      },
      create: {
        instanceId: auth.instanceId,
        ticket,
        symbol,
        type,
        openPrice,
        closePrice: closePrice ?? null,
        lots,
        profit,
        openTime: toDate(openTime),
        closeTime: closeTime ? toDate(closeTime) : null,
        mode: parsed.data.mode ?? null,
        magicNumber: magicNumber ?? null,
        terminalDeploymentId: attribution.terminalDeploymentId,
      },
      update: {
        closePrice: closePrice != null ? closePrice : undefined,
        profit,
        closeTime: closeTime ? toDate(closeTime) : undefined,
        mode: parsed.data.mode ?? undefined,
      },
    });

    // Fire webhook notification + alert checks (fire-and-forget). Reuses the
    // `instance` fetched above for the governance gate.
    {
      if (instance.user.webhookUrl) {
        fireWebhook(instance.user.webhookUrl, {
          event: "trade",
          data: {
            eaName: instance.eaName,
            symbol,
            type,
            profit,
            openPrice,
            closePrice: closePrice ?? null,
          },
        }).catch((err) => {
          logger.error({ err, instanceId: auth.instanceId }, "Failed to fire trade webhook");
        });
      }

      // Check user-configured new trade alerts (fire-and-forget)
      checkNewTradeAlerts(
        auth.userId,
        auth.instanceId,
        instance.eaName,
        symbol,
        type,
        profit
      ).catch((err) => {
        logger.error({ err, instanceId: auth.instanceId }, "Failed to check new trade alerts");
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err, instanceId: auth.instanceId }, "Trade processing failed");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal error"), { status: 500 });
  }
}
