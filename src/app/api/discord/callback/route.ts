import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env, features } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, getDiscordUser, onboardDiscordUser } from "@/lib/discord";
import { encrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { apiRateLimiter, checkRateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";

const log = logger.child({ route: "/api/discord/callback" });

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/app/settings", env.AUTH_URL);

  if (!features.discordAuth) {
    settingsUrl.searchParams.set("discord", "error");
    return NextResponse.redirect(settingsUrl);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", env.AUTH_URL));
  }

  const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    settingsUrl.searchParams.set("discord", "error");
    return NextResponse.redirect(settingsUrl);
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // User denied the OAuth prompt
  if (errorParam === "access_denied") {
    settingsUrl.searchParams.set("discord", "denied");
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set("discord", "error");
    return NextResponse.redirect(settingsUrl);
  }

  // Validate state against cookie
  const storedHash = request.cookies.get("discord_oauth_state")?.value;
  const stateHash = createHash("sha256").update(state).digest("hex");

  if (!storedHash || storedHash !== stateHash) {
    settingsUrl.searchParams.set("discord", "error");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = `${env.AUTH_URL}/api/discord/callback`;
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const discordUser = await getDiscordUser(tokenData.access_token);

    // Check if this Discord account is already linked to another user
    const existingLink = await prisma.user.findUnique({
      where: { discordId: discordUser.id },
      select: { id: true },
    });

    if (existingLink && existingLink.id !== session.user.id) {
      settingsUrl.searchParams.set("discord", "already_linked");
      const response = NextResponse.redirect(settingsUrl);
      response.cookies.delete("discord_oauth_state");
      return response;
    }

    // Save Discord info on user (encrypt access token at rest)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        discordId: discordUser.id,
        discordAccessToken: encrypt(tokenData.access_token),
        discordRefreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      },
    });

    // Fire-and-forget: guild join + role sync
    onboardDiscordUser(session.user.id, discordUser.id, tokenData.access_token).catch(() => {});

    settingsUrl.searchParams.set("discord", "connected");
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete("discord_oauth_state");
    return response;
  } catch (error) {
    log.error({ error }, "Discord callback failed");
    settingsUrl.searchParams.set("discord", "error");
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete("discord_oauth_state");
    return response;
  }
}
