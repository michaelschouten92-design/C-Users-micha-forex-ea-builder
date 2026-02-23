import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env, features } from "@/lib/env";
import { exchangeCodeForToken, getDiscordUser, onboardDiscordUser } from "@/lib/discord";
import { encrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/discord/callback" });

const SETTINGS_URL = "/app/settings";

// GET /api/discord/callback - Handle Discord OAuth2 callback
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", env.AUTH_URL));
  }

  if (!features.discordAuth) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}?discord=error`, env.AUTH_URL));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied the OAuth prompt
  if (error === "access_denied" || !code) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}?discord=denied`, env.AUTH_URL));
  }

  try {
    const redirectUri = `${env.AUTH_URL}/api/discord/callback`;
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const discordUser = await getDiscordUser(tokenData.access_token);

    // Check if this Discord account is already linked to a different user
    const existingLink = await prisma.user.findUnique({
      where: { discordId: discordUser.id },
      select: { id: true },
    });

    if (existingLink && existingLink.id !== session.user.id) {
      log.warn(
        { userId: session.user.id, discordId: discordUser.id },
        "Discord account already linked to another user"
      );
      return NextResponse.redirect(new URL(`${SETTINGS_URL}?discord=already_linked`, env.AUTH_URL));
    }

    // Store encrypted tokens and Discord ID
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        discordId: discordUser.id,
        discordAccessToken: encrypt(tokenData.access_token),
        discordRefreshToken: encrypt(tokenData.refresh_token),
      },
    });

    // Run guild join and role sync in the background (fire-and-forget)
    onboardDiscordUser(session.user.id, discordUser.id, tokenData.access_token).catch(() => {});

    log.info(
      { userId: session.user.id, discordId: discordUser.id },
      "Discord account linked successfully"
    );

    return NextResponse.redirect(new URL(`${SETTINGS_URL}?discord=connected`, env.AUTH_URL));
  } catch (err) {
    log.error({ userId: session.user.id, error: err }, "Discord callback failed");
    return NextResponse.redirect(new URL(`${SETTINGS_URL}?discord=error`, env.AUTH_URL));
  }
}
