import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { features } from "@/lib/env";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

// GET /api/discord/status - Return Discord connection status for current user
export async function GET() {
  const session = await auth();
  const log = createApiLogger("/api/discord/status", "GET", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  // If Discord integration is not configured, tell the frontend to hide the section
  if (!features.discordAuth) {
    return NextResponse.json({ enabled: false });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordId: true, authProviderId: true },
    });

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    const connected = Boolean(user.discordId);
    const isPrimaryLogin = user.authProviderId.startsWith("discord_");

    return NextResponse.json({
      enabled: true,
      connected,
      discordId: user.discordId ?? null,
      isPrimaryLogin,
    });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Failed to fetch Discord status");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch Discord status"), {
      status: 500,
    });
  }
}
