import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env, features } from "./env";
import {
  registrationRateLimiter,
  loginRateLimiter,
  loginIpRateLimiter,
  checkRateLimit,
} from "./rate-limit";
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendNewUserNotificationEmail,
  sendOAuthLinkRejectedEmail,
} from "./email";
import { verifyCaptcha } from "./turnstile";
import { randomBytes, createHash } from "crypto";
import { logger } from "./logger";
import type { Provider } from "next-auth/providers";

const authLog = logger.child({ module: "auth" });

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

// Always add Credentials provider
providers.push(
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "you@email.com" },
      password: { label: "Password", type: "password" },
      isRegistration: { label: "Is Registration", type: "text" },
      captchaToken: { label: "Captcha Token", type: "text" },
      referralCode: { label: "Referral Code", type: "text" },
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

          // Generate unique referral code
          const referralCode = randomBytes(6)
            .toString("base64url")
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(0, 8)
            .toUpperCase();

          // Validate referral code from the referring user
          let validatedReferredBy: string | undefined;
          const incomingReferralCode = (credentials.referralCode as string) || "";
          if (incomingReferralCode) {
            const referrer = await prisma.user.findFirst({
              where: { referralCode: incomingReferralCode },
              select: { email: true, referralCode: true },
            });
            // Only accept if code exists and is not a self-referral
            if (referrer && referrer.email !== email) {
              validatedReferredBy = referrer.referralCode!;
            }
          }

          const user = await prisma.user.create({
            data: {
              email,
              authProviderId: `credentials_${email}`,
              passwordHash,
              passwordChangedAt: new Date(),
              referralCode,
              referredBy: validatedReferredBy,
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

          // Rehash password if bcrypt rounds have been upgraded
          const hashRounds = bcrypt.getRounds(existingUser.passwordHash);
          if (hashRounds < SALT_ROUNDS) {
            const upgraded = await bcrypt.hash(password, SALT_ROUNDS);
            prisma.user
              .update({
                where: { id: existingUser.id },
                data: { passwordHash: upgraded, passwordChangedAt: new Date() },
              })
              .catch(() => {});
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
        authLog.error({ error }, "Unexpected error in authorize");
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
      if (account?.provider === "google") {
        if (!user.email) {
          authLog.error({ provider: account.provider }, "OAuth sign-in rejected: no email");
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
            authLog.warn(
              { email: normalizedEmail.substring(0, 3) + "***", provider: account.provider },
              "OAuth sign-in rejected: email already linked to another account"
            );
            // Notify the existing account owner (fire-and-forget)
            sendOAuthLinkRejectedEmail(normalizedEmail, account.provider).catch(() => {});
            return false;
          } else {
            // Generate unique referral code for new OAuth user
            const oauthReferralCode = randomBytes(6)
              .toString("base64url")
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 8)
              .toUpperCase();

            // Read referral code from cookie (set by middleware)
            let oauthReferredBy: string | undefined;
            try {
              const { cookies: getCookies } = await import("next/headers");
              const cookieStore = await getCookies();
              const refCookie = cookieStore.get("referral_code")?.value;
              if (refCookie) {
                const referrer = await prisma.user.findFirst({
                  where: { referralCode: refCookie },
                  select: { email: true, referralCode: true },
                });
                if (referrer && referrer.email !== normalizedEmail) {
                  oauthReferredBy = referrer.referralCode!;
                }
              }
            } catch {
              // Cookie reading may fail in edge cases — continue without referral
            }

            // Create new user (OAuth users are pre-verified)
            existingUser = await prisma.user.create({
              data: {
                email: normalizedEmail,
                authProviderId,
                emailVerified: true,
                emailVerifiedAt: new Date(),
                referralCode: oauthReferralCode,
                referredBy: oauthReferredBy,
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
            sendNewUserNotificationEmail(user.email, "google").catch(() => {});
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

      // Handle session updates (impersonation start/stop)
      if (trigger === "update" && updateData) {
        const data = updateData as Record<string, unknown>;

        // Start impersonation
        if (data.impersonate && typeof data.impersonate === "object") {
          const imp = data.impersonate as { userId: string; email: string };
          token.impersonatorId = token.id as string;
          token.impersonatingEmail = imp.email;
          token.id = imp.userId;
        }

        // Stop impersonation
        if (data.stopImpersonation && token.impersonatorId) {
          token.id = token.impersonatorId;
          delete token.impersonatorId;
          delete token.impersonatingEmail;
        }
      }

      // Periodically check if password was changed (invalidates old sessions)
      if (token.id && typeof token.id === "string") {
        // Check every 60 seconds (ensures revoked roles are caught quickly)
        const lastChecked = (token.passwordCheckedAt as number) || 0;
        const now = Math.floor(Date.now() / 1000);
        if (now - lastChecked > 60) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { passwordChangedAt: true, role: true, suspended: true, emailVerified: true },
          });
          if (dbUser?.passwordChangedAt) {
            const changedAtSec = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
            const tokenIssuedAt = (token.iat as number) || 0;
            if (changedAtSec > tokenIssuedAt) {
              // Password was changed after this token was issued — destroy session
              return null as unknown as typeof token;
            }
          }
          // Store role, suspended, and emailVerified status in token
          if (dbUser) {
            token.role = dbUser.role;
            token.suspended = dbUser.suspended;
            token.emailVerified = !!dbUser.emailVerified;
          }
          token.passwordCheckedAt = now;
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
      if (token.emailVerified) {
        session.user.emailVerified = new Date();
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
        maxAge: 14 * 24 * 60 * 60, // Match session maxAge (14 days)
      },
    },
  },
});
