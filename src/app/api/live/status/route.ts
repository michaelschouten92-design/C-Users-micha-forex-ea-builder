import { auth } from "@/lib/auth";
import { loadMonitorData } from "@/app/app/live/load-monitor-data";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { serializeLiveInstance } from "@/lib/live/serialize-live-instance";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const modeFilter = request.nextUrl.searchParams.get("mode");

    // Use the same loader as the initial page render so polling responses
    // include baseline, edgeScore, and deployments. Otherwise the client's
    // polling fallback freezes these fields until a full page reload
    // (see audit finding P0-2).
    const data = await loadMonitorData(session.user.id);
    if (!data) {
      return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Data unavailable"), {
        status: 500,
      });
    }

    const filtered = data.eaInstances.filter((ea) => {
      if (modeFilter === "LIVE" || modeFilter === "PAPER") return ea.mode === modeFilter;
      return true;
    });

    const serialized = filtered
      .sort((a, b) => {
        const ta = a.lastHeartbeat?.getTime() ?? 0;
        const tb = b.lastHeartbeat?.getTime() ?? 0;
        return tb - ta;
      })
      .map((ea) => serializeLiveInstance(ea, data.tradeAggregates, data.recentTrades));

    return NextResponse.json(
      { data: serialized },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch live EA status");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
