import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

// POST /api/discord/unlink - Disconnect Discord from the current user's account
export async function POST(_request: NextRequest) {
  const session = await auth();
  const log = createApiLogger("/api/discord/unlink", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordId: true, authProviderId: true },
    });

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    if (!user.discordId) {
      return NextResponse.json({ error: "No Discord account connected" }, { status: 400 });
    }

    // Prevent unlinking if Discord is the user's primary login method
    if (user.authProviderId.startsWith("discord_")) {
      return NextResponse.json(
        { error: "Discord is your login method and cannot be disconnected" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        discordId: null,
        discordAccessToken: null,
        discordRefreshToken: null,
      },
    });

    log.info({ userId: session.user.id }, "Discord account unlinked");

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Failed to unlink Discord");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Failed to disconnect Discord"), {
      status: 500,
    });
  }
}
