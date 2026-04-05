import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { sseConnectionRateLimiter, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
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
  let instanceIds: string[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      // Signal the client that the stream is ready (client already has data from server render)
      controller.enqueue(encoder.encode(`event: init\ndata: []\n\n`));

      // Poll for deltas every 15 seconds
      const pollInterval = setInterval(async () => {
        try {
          // Backpressure check: if the stream is full or closed, stop enqueuing
          if (controller.desiredSize === null || controller.desiredSize <= 0) {
            return;
          }

          const since = lastCheck;
          const pollStart = new Date();

          // Refresh instance list each tick to pick up instances registered mid-session
          const freshInstances = await prisma.liveEAInstance.findMany({
            where: { userId, deletedAt: null },
            select: { id: true },
          });
          instanceIds = freshInstances.map((i) => i.id);

          if (instanceIds.length === 0) return;

          // Check for new heartbeats (direct instanceId filter for index efficiency)
          const newHeartbeats = await prisma.eAHeartbeat.findMany({
            where: {
              instanceId: { in: instanceIds },
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
                  tradingState: true,
                  lastHeartbeat: true,
                  lastError: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
            take: 100,
          });

          if (newHeartbeats.length > 0) {
            // Group by instance, send latest per instance
            const byInstance = new Map<string, (typeof newHeartbeats)[0]>();
            for (const hb of newHeartbeats) {
              byInstance.set(hb.instanceId, hb);
            }
            for (const [, hb] of byInstance) {
              if (!hb.instance) continue;
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
                    tradingState: hb.instance.tradingState,
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
              instanceId: { in: instanceIds },
              createdAt: { gt: since },
            },
            orderBy: { createdAt: "asc" },
            take: 100,
          });

          for (const trade of newTrades) {
            controller.enqueue(
              encoder.encode(
                `event: trade\ndata: ${JSON.stringify({
                  instanceId: trade.instanceId,
                  ticket: trade.ticket,
                  symbol: trade.symbol,
                  type: trade.type,
                  openPrice: trade.openPrice,
                  closePrice: trade.closePrice ?? null,
                  lots: trade.lots,
                  profit: trade.profit,
                  closeTime: trade.closeTime?.toISOString() ?? null,
                })}\n\n`
              )
            );
          }

          // Check for new errors
          const newErrors = await prisma.eAError.findMany({
            where: {
              instanceId: { in: instanceIds },
              createdAt: { gt: since },
            },
            orderBy: { createdAt: "asc" },
            take: 50,
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

          // Update lastCheck only after all queries completed — prevents
          // missing heartbeats that arrive while queries are in-flight
          lastCheck = pollStart;
        } catch {
          // Stream likely closed — clean up intervals to stop leaked polling
          clearInterval(pollInterval);
          clearInterval(keepAlive);
        }
      }, 15000);

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
