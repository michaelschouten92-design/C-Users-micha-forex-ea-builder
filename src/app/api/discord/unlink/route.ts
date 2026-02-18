import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { removeRole } from "@/lib/discord";
import { apiRateLimiter, checkRateLimit, formatRateLimitError } from "@/lib/rate-limit";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: formatRateLimitError(rateLimitResult) }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { authProviderId: true, discordId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Block unlinking if Discord is the user's primary login method
  if (user.authProviderId.startsWith("discord_")) {
    return NextResponse.json(
      { error: "Cannot disconnect Discord when it is your login method" },
      { status: 400 }
    );
  }

  if (!user.discordId) {
    return NextResponse.json({ error: "Discord is not connected" }, { status: 400 });
  }

  // Fire-and-forget: remove roles from Discord
  const discordId = user.discordId;
  if (env.DISCORD_PRO_ROLE_ID) {
    removeRole(discordId, env.DISCORD_PRO_ROLE_ID).catch(() => {});
  }
  if (env.DISCORD_ELITE_ROLE_ID) {
    removeRole(discordId, env.DISCORD_ELITE_ROLE_ID).catch(() => {});
  }

  // Clear Discord fields
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      discordId: null,
      discordAccessToken: null,
      discordRefreshToken: null,
    },
  });

  return NextResponse.json({ success: true });
}
