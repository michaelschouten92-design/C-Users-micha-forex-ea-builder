import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env, features } from "@/lib/env";
import { apiRateLimiter, checkRateLimit, formatRateLimitError } from "@/lib/rate-limit";
import { randomBytes, createHash } from "crypto";

export async function GET() {
  if (!features.discordAuth) {
    return NextResponse.json({ error: "Discord not configured" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", env.AUTH_URL));
  }

  const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: formatRateLimitError(rateLimitResult) }, { status: 429 });
  }

  // Generate state parameter for CSRF protection
  const state = randomBytes(32).toString("hex");
  const hashedState = createHash("sha256").update(state).digest("hex");

  const redirectUri = `${env.AUTH_URL}/api/discord/callback`;
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds.join",
    state,
  });

  const response = NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`
  );

  // Store hashed state in httpOnly cookie (5 min TTL)
  response.cookies.set("discord_oauth_state", hashedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutes
  });

  return response;
}
