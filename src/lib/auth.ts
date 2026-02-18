import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env, features } from "./env";
import {
  registrationRateLimiter,
  loginRateLimiter,
  loginIpRateLimiter,
  checkRateLimit,
} from "./rate-limit";
import { sendWelcomeEmail, sendVerificationEmail, sendNewUserNotificationEmail } from "./email";
import { onboardDiscordUser } from "./discord";
import { verifyCaptcha } from "./turnstile";
import { randomBytes, createHash } from "crypto";
import { encrypt } from "./crypto";
import type { Provider } from "next-auth/providers";

class AccountExistsError extends CredentialsSignin {
  code = "account_exists";
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class PasswordTooShortError extends CredentialsSignin {
  code = "password_too_short";
}

class RateLimitError extends CredentialsSignin {
  code = "rate_limited";
}

export const SALT_ROUNDS = 12;

/**
 * Normalize email to prevent trial abuse via +tag aliases and dot tricks.
 * - Lowercases the entire email
 * - For Gmail/Googlemail: removes dots and +tag from local part
 * - For other providers: removes +tag from local part
 */
export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const [localPart, domain] = lower.split("@");
  if (!localPart || !domain) return lower;

  const isGmail = domain === "gmail.com" || domain === "googlemail.com";

  let normalized = localPart;

  // Remove +tag suffix
  const plusIndex = normalized.indexOf("+");
  if (plusIndex !== -1) {
    normalized = normalized.substring(0, plusIndex);
  }

  // Remove dots for Gmail (Gmail ignores dots in local part)
  if (isGmail) {
    normalized = normalized.replace(/\./g, "");
  }

  return `${normalized}@${domain}`;
}

// Build providers list dynamically based on available credentials
const providers: Provider[] = [];

// Only add Google if credentials are configured
if (features.googleAuth) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID!,
      clientSecret: env.AUTH_GOOGLE_SECRET!,
    })
  );
}

// Only add GitHub if credentials are configured
if (features.githubAuth) {
  providers.push(
    GitHub({
      clientId: env.AUTH_GITHUB_ID!,
      clientSecret: env.AUTH_GITHUB_SECRET!,
    })
  );
}

// Only add Discord if credentials are configured
if (features.discordAuth) {
  providers.push(
    Discord({
      clientId: env.DISCORD_CLIENT_ID!,
      clientSecret: env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds.join",
        },
      },
    })
  );
}

// Always add Credentials provider
providers.push(
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "you@email.com" },
      password: { label: "Password", type: "password" },
      isRegistration: { label: "Is Registration", type: "text" },
      captchaToken: { label: "Captcha Token", type: "text" },
    },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      try {
        const rawEmail = credentials.email as string;
        const password = credentials.password as string;
        const clientIsRegistration = credentials.isRegistration === "true";
        const captchaToken = credentials.captchaToken as string | undefined;

        // Normalize email consistently for both registration and login
        const email = normalizeEmail(rawEmail);

        // Validate password strength
        if (password.length < 8) {
          throw new PasswordTooShortError();
        }

        // Find existing user
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        // Server-side validation: ensure client flag matches reality
        const isRegistration = clientIsRegistration && !existingUser;

        // If client says register but user exists → account_exists error
        if (clientIsRegistration && existingUser) {
          throw new AccountExistsError();
        }

        if (isRegistration) {
          // Verify CAPTCHA for registration (skips if not configured)
          const regIpForCaptcha = request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim();
          const captchaValid = await verifyCaptcha(captchaToken, regIpForCaptcha);
          if (!captchaValid) {
            throw new InvalidCredentialsError();
          }

          // Rate limit registration attempts by email
          const rateLimitResult = await checkRateLimit(
            registrationRateLimiter,
            `register:${email}`
          );
          if (!rateLimitResult.success) {
            throw new RateLimitError();
          }

          // Also rate limit by IP to prevent mass account creation
          const regIp = request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim();
          if (regIp) {
            const ipResult = await checkRateLimit(registrationRateLimiter, `register-ip:${regIp}`);
            if (!ipResult.success) {
              throw new RateLimitError();
            }
          }

          // Hash password and create user
          const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

          const user = await prisma.user.create({
            data: {
              email,
              authProviderId: `credentials_${email}`,
              passwordHash,
              passwordChangedAt: new Date(),
              subscription: {
                create: {
                  tier: "FREE",
                },
              },
            },
          });

          // Send verification email (fire-and-forget, don't block registration)
          const verifyToken = randomBytes(32).toString("hex");
          const hashedToken = createHash("sha256").update(verifyToken).digest("hex");
          prisma.emailVerificationToken
            .create({
              data: {
                email,
                token: hashedToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
              },
            })
            .then(() => {
              const verifyUrl = `${env.AUTH_URL}/api/auth/verify-email?token=${verifyToken}`;
              sendVerificationEmail(email, verifyUrl).catch(() => {});
              // Send welcome email with verify link included
              sendWelcomeEmail(email, `${env.AUTH_URL}/app`, verifyUrl).catch(() => {});
            })
            .catch(() => {});

          // Notify admin of new signup (fire-and-forget)
          sendNewUserNotificationEmail(email, "credentials").catch(() => {});

          return {
            id: user.id,
            email: user.email,
          };
        } else {
          // Login flow — rate limit by email to prevent brute-force
          const loginRateResult = await checkRateLimit(
            loginRateLimiter,
            `login:${email.toLowerCase()}`
          );
          if (!loginRateResult.success) {
            throw new RateLimitError();
          }

          // Also rate limit by IP to prevent credential stuffing across emails
          const clientIp = request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim();
          if (clientIp) {
            const ipRateResult = await checkRateLimit(loginIpRateLimiter, `login-ip:${clientIp}`);
            if (!ipRateResult.success) {
              throw new RateLimitError();
            }
          }

          if (!existingUser || !existingUser.passwordHash) {
            // Use generic message to prevent email enumeration
            throw new InvalidCredentialsError();
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, existingUser.passwordHash);

          if (!isValidPassword) {
            throw new InvalidCredentialsError();
          }

          return {
            id: existingUser.id,
            email: existingUser.email,
          };
        }
      } catch (error) {
        // Re-throw known auth errors as-is
        if (error instanceof CredentialsSignin) {
          throw error;
        }
        // Log unexpected errors (DB, Redis, etc.) for debugging
        console.error("[auth] Unexpected error in authorize:", error);
        throw new InvalidCredentialsError();
      }
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // Handle OAuth sign-in: create or link user
      if (
        account?.provider === "google" ||
        account?.provider === "github" ||
        account?.provider === "discord"
      ) {
        if (!user.email) {
          console.error(`[auth] OAuth sign-in rejected: no email from ${account.provider}`);
          return false;
        }

        const normalizedEmail = normalizeEmail(user.email);
        const authProviderId = `${account.provider}_${account.providerAccountId}`;

        // Check if user exists by authProviderId
        let existingUser = await prisma.user.findUnique({
          where: { authProviderId },
        });

        let _isNewUser = false;

        if (!existingUser) {
          // Check if user exists by email (might have registered with credentials)
          existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (existingUser) {
            // SECURITY: Do NOT auto-link OAuth to existing accounts (verified or unverified).
            // This prevents both account takeover and the race condition where a credential
            // user hasn't verified their email yet. The findUnique on normalizedEmail above
            // catches all existing users regardless of verification status.
            console.error(
              `[auth] OAuth sign-in rejected: email ${normalizedEmail.substring(0, 3)}*** already linked to another account (provider: ${account.provider})`
            );
            return false;
          } else {
            // Create new user (OAuth users are pre-verified)
            existingUser = await prisma.user.create({
              data: {
                email: normalizedEmail,
                authProviderId,
                emailVerified: true,
                emailVerifiedAt: new Date(),
                subscription: {
                  create: {
                    tier: "FREE",
                  },
                },
              },
            });

            _isNewUser = true;

            // Send welcome email (fire-and-forget)
            sendWelcomeEmail(user.email, `${env.AUTH_URL}/app`).catch(() => {});

            // Notify admin of new signup (fire-and-forget)
            sendNewUserNotificationEmail(
              user.email,
              account.provider as "google" | "github" | "discord"
            ).catch(() => {});
          }
        }

        // For Discord logins: save discordId and access token, trigger onboarding
        if (account.provider === "discord") {
          const discordId = account.providerAccountId;
          const accessToken = account.access_token;

          // Update discordId + accessToken (even for existing users, refresh the token)
          await prisma.user
            .update({
              where: { id: existingUser.id },
              data: {
                discordId: discordId,
                ...(accessToken ? { discordAccessToken: encrypt(accessToken) } : {}),
              },
            })
            .catch((err) => {
              // Unique constraint violation — discordId already linked to another user
              if (err?.code === "P2002") {
                console.error("[auth] Discord ID already linked to another account");
              }
            });

          // Fire-and-forget: guild join + role sync
          if (accessToken) {
            onboardDiscordUser(existingUser.id, discordId, accessToken).catch(() => {});
          }
        }

        // Store the database user ID for the jwt callback
        user.id = existingUser.id;
      }

      return true;
    },
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        token.id = user.id;
        token.iat = Math.floor(Date.now() / 1000);
        // Track last login time (fire-and-forget)
        if (typeof user.id === "string") {
          prisma.user
            .update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(() => {});
        }
      }

      // Periodically check if password was changed (invalidates old sessions)
      if (token.id && typeof token.id === "string") {
        // Check every 60 seconds (short interval ensures revoked impersonation/roles are caught quickly)
        const lastChecked = (token.passwordCheckedAt as number) || 0;
        const now = Math.floor(Date.now() / 1000);
        if (now - lastChecked > 60) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { passwordChangedAt: true, role: true, suspended: true },
          });
          if (dbUser?.passwordChangedAt) {
            const changedAtSec = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
            const tokenIssuedAt = (token.iat as number) || 0;
            if (changedAtSec > tokenIssuedAt) {
              // Password was changed after this token was issued — invalidate
              return { ...token, id: undefined };
            }
          }
          // Store role and suspended status in token
          if (dbUser) {
            token.role = dbUser.role;
            token.suspended = dbUser.suspended;
          }
          token.passwordCheckedAt = now;

          // If impersonating, verify the impersonator still has ADMIN role
          if (token.impersonatorId) {
            const impersonator = await prisma.user.findUnique({
              where: { id: token.impersonatorId as string },
              select: { role: true },
            });
            if (!impersonator || impersonator.role !== "ADMIN") {
              // Impersonator lost admin privileges — end impersonation
              token.id = token.impersonatorId;
              delete token.impersonatorId;
              delete token.impersonatingEmail;
            }
          }
        }
      }

      // Handle session update (used for impersonation)
      if (trigger === "update" && updateData) {
        if (updateData.impersonate) {
          // Start impersonation: store admin's real ID and switch to target
          token.impersonatorId = token.id;
          token.impersonatingEmail = updateData.impersonate.email;
          token.id = updateData.impersonate.userId;
        } else if (updateData.stopImpersonation) {
          // Stop impersonation: restore admin's real ID
          token.id = token.impersonatorId;
          delete token.impersonatorId;
          delete token.impersonatingEmail;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      if (token.suspended) {
        session.user.suspended = true;
      }
      if (token.impersonatorId) {
        session.user.impersonatorId = token.impersonatorId as string;
        session.user.impersonatingEmail = token.impersonatingEmail as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days
    updateAge: 24 * 60 * 60, // Refresh token every 24 hours
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
