import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";
import { sseConnectionRateLimiter, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return new Response("Live EA monitoring requires a Pro or Elite subscription", { status: 403 });
  }

  // Rate limit SSE connections to prevent DB overload from multiple concurrent streams
  const rl = await checkRateLimit(sseConnectionRateLimiter, `sse:${session.user.id}`);
  if (!rl.success) {
    return new Response("Too many stream connections. Please wait before reconnecting.", {
      status: 429,
    });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial full state
      try {
        const instances = await prisma.liveEAInstance.findMany({
          where: { userId, deletedAt: null },
          include: {
            heartbeats: { orderBy: { createdAt: "desc" }, take: 20 },
            trades: { orderBy: { createdAt: "desc" }, take: 20 },
          },
        });

        const initData = instances.map((inst) => ({
          id: inst.id,
          eaName: inst.eaName,
          symbol: inst.symbol,
          timeframe: inst.timeframe,
          broker: inst.broker,
          accountNumber: inst.accountNumber,
          status: inst.status,
          mode: inst.mode,
          paused: inst.paused,
          lastHeartbeat: inst.lastHeartbeat?.toISOString() ?? null,
          lastError: inst.lastError,
          balance: inst.balance,
          equity: inst.equity,
          openTrades: inst.openTrades,
          totalTrades: inst.totalTrades,
          totalProfit: inst.totalProfit,
          heartbeats: inst.heartbeats.map((h) => ({
            equity: h.equity,
            createdAt: h.createdAt.toISOString(),
          })),
          trades: inst.trades.map((t) => ({
            profit: t.profit,
            closeTime: t.closeTime?.toISOString() ?? null,
          })),
        }));

        controller.enqueue(encoder.encode(`event: init\ndata: ${JSON.stringify(initData)}\n\n`));
      } catch {
        controller.close();
        return;
      }

      // Poll for deltas every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          // Backpressure check: if the stream is full or closed, stop enqueuing
          if (controller.desiredSize === null || controller.desiredSize <= 0) {
            return;
          }

          const since = lastCheck;
          lastCheck = new Date();

          const userInstanceFilter = { userId, deletedAt: null };

          // Check for new heartbeats
          const newHeartbeats = await prisma.eAHeartbeat.findMany({
            where: {
              instance: userInstanceFilter,
              createdAt: { gt: since },
            },
            include: {
              instance: {
                select: {
                  id: true,
                  status: true,
                  balance: true,
                  equity: true,
                  openTrades: true,
                  totalTrades: true,
                  totalProfit: true,
                  paused: true,
                  lastHeartbeat: true,
                  lastError: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          });

          if (newHeartbeats.length > 0) {
            // Group by instance, send latest per instance
            const byInstance = new Map<string, (typeof newHeartbeats)[0]>();
            for (const hb of newHeartbeats) {
              byInstance.set(hb.instanceId, hb);
            }
            for (const [, hb] of byInstance) {
              controller.enqueue(
                encoder.encode(
                  `event: heartbeat\ndata: ${JSON.stringify({
                    instanceId: hb.instanceId,
                    balance: hb.instance.balance,
                    equity: hb.instance.equity,
                    openTrades: hb.instance.openTrades,
                    totalTrades: hb.instance.totalTrades,
                    totalProfit: hb.instance.totalProfit,
                    status: hb.instance.status,
                    paused: hb.instance.paused,
                    lastHeartbeat: hb.instance.lastHeartbeat?.toISOString() ?? null,
                    lastError: hb.instance.lastError,
                    heartbeat: {
                      equity: hb.equity,
                      createdAt: hb.createdAt.toISOString(),
                    },
                  })}\n\n`
                )
              );
            }
          }

          // Check for new trades
          const newTrades = await prisma.eATrade.findMany({
            where: {
              instance: userInstanceFilter,
              createdAt: { gt: since },
            },
            orderBy: { createdAt: "asc" },
          });

          for (const trade of newTrades) {
            controller.enqueue(
              encoder.encode(
                `event: trade\ndata: ${JSON.stringify({
                  instanceId: trade.instanceId,
                  ticket: trade.ticket,
                  symbol: trade.symbol,
                  type: trade.type,
                  profit: trade.profit,
                  closeTime: trade.closeTime?.toISOString() ?? null,
                })}\n\n`
              )
            );
          }

          // Check for new errors
          const newErrors = await prisma.eAError.findMany({
            where: {
              instance: userInstanceFilter,
              createdAt: { gt: since },
            },
            orderBy: { createdAt: "asc" },
          });

          for (const error of newErrors) {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({
                  instanceId: error.instanceId,
                  errorCode: error.errorCode,
                  message: error.message,
                })}\n\n`
              )
            );
          }
        } catch {
          // Stream likely closed — clean up intervals to stop leaked polling
          clearInterval(pollInterval);
          clearInterval(keepAlive);
        }
      }, 5000);

      // Keep-alive every 30s
      const keepAlive = setInterval(() => {
        try {
          if (controller.desiredSize === null || controller.desiredSize <= 0) {
            clearInterval(keepAlive);
            return;
          }
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(pollInterval);
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
