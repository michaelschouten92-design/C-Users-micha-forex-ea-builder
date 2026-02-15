import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
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
import { randomBytes, createHash } from "crypto";
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

const SALT_ROUNDS = 12;

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

// Always add Credentials provider
providers.push(
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "you@email.com" },
      password: { label: "Password", type: "password" },
      isRegistration: { label: "Is Registration", type: "text" },
    },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      try {
        const rawEmail = credentials.email as string;
        const password = credentials.password as string;
        const isRegistration = credentials.isRegistration === "true";

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

        if (isRegistration) {
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

          // Registration flow
          if (existingUser) {
            throw new AccountExistsError();
          }

          // Hash password and create user
          const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

          const user = await prisma.user.create({
            data: {
              email,
              authProviderId: `credentials_${email}`,
              passwordHash,
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
            })
            .catch(() => {});

          // Send welcome email (fire-and-forget, don't block registration)
          sendWelcomeEmail(email, `${env.AUTH_URL}/app`).catch(() => {});

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
      if (account?.provider === "google" || account?.provider === "github") {
        if (!user.email) {
          return false;
        }

        const normalizedEmail = normalizeEmail(user.email);
        const authProviderId = `${account.provider}_${account.providerAccountId}`;

        // Check if user exists by authProviderId
        let existingUser = await prisma.user.findUnique({
          where: { authProviderId },
        });

        if (!existingUser) {
          // Check if user exists by email (might have registered with credentials)
          existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (existingUser) {
            // SECURITY: Do NOT auto-link OAuth to existing credential-based accounts.
            // An attacker could register the same email via OAuth and take over the account.
            // The user must log in with their original method.
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

            // Send welcome email (fire-and-forget)
            sendWelcomeEmail(user.email, `${env.AUTH_URL}/app`).catch(() => {});

            // Notify admin of new signup (fire-and-forget)
            sendNewUserNotificationEmail(user.email, account.provider as "google" | "github").catch(
              () => {}
            );
          }
        }

        // Store the database user ID for the jwt callback
        user.id = existingUser.id;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
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
