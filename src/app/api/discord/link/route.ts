import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env, features } from "@/lib/env";
import { createApiLogger } from "@/lib/logger";

// Discord OAuth2 scopes needed for identity and guild management
const DISCORD_SCOPES = ["identify", "guilds.join"];
const DISCORD_AUTH_URL = "https://discord.com/api/oauth2/authorize";

// GET /api/discord/link - Redirect user to Discord OAuth2 authorization page
export async function GET() {
  const session = await auth();
  const log = createApiLogger("/api/discord/link", "GET", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", env.AUTH_URL));
  }

  if (!features.discordAuth) {
    log.warn("Discord link attempted but Discord integration is not configured");
    return NextResponse.redirect(new URL("/app/settings?discord=error", env.AUTH_URL));
  }

  const redirectUri = `${env.AUTH_URL}/api/discord/callback`;

  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DISCORD_SCOPES.join(" "),
  });

  const discordUrl = `${DISCORD_AUTH_URL}?${params.toString()}`;

  return NextResponse.redirect(discordUrl);
}
