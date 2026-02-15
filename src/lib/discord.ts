import { env } from "./env";
import { prisma } from "./prisma";
import { logger } from "./logger";

const log = logger.child({ module: "discord" });

const DISCORD_API = "https://discord.com/api/v10";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  avatar?: string;
}

/**
 * Exchange an OAuth2 authorization code for an access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<DiscordTokenResponse> {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID!,
      client_secret: env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Fetch the authenticated Discord user's profile.
 */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord user fetch failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Add a user to the Discord guild using their OAuth access token.
 * Requires the `guilds.join` scope and bot with MANAGE_GUILD permissions.
 */
export async function addToGuild(discordUserId: string, accessToken: string): Promise<void> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return;

  const res = await fetch(
    `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    }
  );

  // 201 = added, 204 = already a member
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    log.error({ discordUserId, status: res.status, body: text }, "Failed to add user to guild");
  }
}

/**
 * Add a role to a guild member.
 */
export async function addRole(discordUserId: string, roleId: string): Promise<void> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return;

  const res = await fetch(
    `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    log.error({ discordUserId, roleId, status: res.status, body: text }, "Failed to add role");
  }
}

/**
 * Remove a role from a guild member.
 */
export async function removeRole(discordUserId: string, roleId: string): Promise<void> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return;

  const res = await fetch(
    `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    log.error({ discordUserId, roleId, status: res.status, body: text }, "Failed to remove role");
  }
}

/**
 * Sync Discord roles to match the user's subscription tier.
 * Removes old tier roles and adds the correct one.
 */
export async function syncRolesForTier(discordUserId: string, tier: string): Promise<void> {
  const proRoleId = env.DISCORD_PRO_ROLE_ID;
  const eliteRoleId = env.DISCORD_ELITE_ROLE_ID;

  // Remove all tier roles first
  if (proRoleId) await removeRole(discordUserId, proRoleId);
  if (eliteRoleId) await removeRole(discordUserId, eliteRoleId);

  // Add the appropriate role
  if (tier === "PRO" && proRoleId) {
    await addRole(discordUserId, proRoleId);
  } else if (tier === "ELITE" && eliteRoleId) {
    await addRole(discordUserId, eliteRoleId);
  }
}

/**
 * Full onboarding flow: look up user tier, join guild, sync roles.
 * Called after Discord account linking or Discord login.
 */
export async function onboardDiscordUser(
  userId: string,
  discordUserId: string,
  accessToken: string
): Promise<void> {
  try {
    // Join the guild
    await addToGuild(discordUserId, accessToken);

    // Look up subscription tier
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true },
    });

    const tier = subscription?.tier ?? "FREE";
    await syncRolesForTier(discordUserId, tier);

    log.info({ userId, discordUserId, tier }, "Discord onboarding complete");
  } catch (error) {
    log.error({ userId, discordUserId, error }, "Discord onboarding failed");
  }
}

/**
 * Sync Discord roles for a user after a tier change (e.g., from Stripe webhook).
 * Looks up the user's discordId and syncs roles accordingly.
 */
export async function syncDiscordRoleForUser(userId: string, newTier: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { discordId: true },
    });

    if (!user?.discordId) return;

    await syncRolesForTier(user.discordId, newTier);
    log.info({ userId, discordId: user.discordId, newTier }, "Discord role synced for tier change");
  } catch (error) {
    log.error({ userId, newTier, error }, "Failed to sync Discord role for tier change");
  }
}
