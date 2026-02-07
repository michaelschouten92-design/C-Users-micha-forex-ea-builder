import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env, features } from "./env";
import { registrationRateLimiter, loginRateLimiter, checkRateLimit } from "./rate-limit";
import { sendWelcomeEmail } from "./email";
import type { Provider } from "next-auth/providers";

const SALT_ROUNDS = 12;

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
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = credentials.email as string;
      const password = credentials.password as string;
      const isRegistration = credentials.isRegistration === "true";

      // Validate password strength
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      // Find existing user
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (isRegistration) {
        // Rate limit registration attempts by email
        const rateLimitResult = await checkRateLimit(registrationRateLimiter, `register:${email}`);
        if (!rateLimitResult.success) {
          throw new Error("Too many registration attempts. Please try again later.");
        }

        // Registration flow
        if (existingUser) {
          throw new Error("An account with this email already exists");
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

        // Send welcome email (fire-and-forget, don't block registration)
        sendWelcomeEmail(email, `${env.AUTH_URL}/app`).catch(() => {});

        return {
          id: user.id,
          email: user.email,
        };
      } else {
        // Login flow — rate limit by email to prevent brute-force
        const loginRateResult = await checkRateLimit(loginRateLimiter, `login:${email.toLowerCase()}`);
        if (!loginRateResult.success) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        if (!existingUser) {
          throw new Error("No account found with this email address");
        }

        if (!existingUser.passwordHash) {
          throw new Error("This account uses a different login method");
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, existingUser.passwordHash);

        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        return {
          id: existingUser.id,
          email: existingUser.email,
        };
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

        const authProviderId = `${account.provider}_${account.providerAccountId}`;

        // Check if user exists by authProviderId
        let existingUser = await prisma.user.findUnique({
          where: { authProviderId },
        });

        if (!existingUser) {
          // Check if user exists by email (might have registered with credentials)
          existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            // SECURITY: Do NOT auto-link OAuth to existing credential-based accounts.
            // An attacker could register the same email via OAuth and take over the account.
            // The user must log in with their original method.
            return false;
          } else {
            // Create new user
            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                authProviderId,
                subscription: {
                  create: {
                    tier: "FREE",
                  },
                },
              },
            });

            // Send welcome email (fire-and-forget)
            sendWelcomeEmail(user.email, `${env.AUTH_URL}/app`).catch(() => {});
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
      name: process.env.NODE_ENV === "production"
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
