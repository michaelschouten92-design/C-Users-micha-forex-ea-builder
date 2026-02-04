import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Provider } from "next-auth/providers";

const SALT_ROUNDS = 12;

// Build providers list dynamically based on available credentials
const providers: Provider[] = [];

// Only add Google if credentials are configured
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

// Only add GitHub if credentials are configured
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
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

        return {
          id: user.id,
          email: user.email,
        };
      } else {
        // Login flow
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
            // Link OAuth to existing account by updating authProviderId
            // Note: This allows OAuth login for existing email accounts
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { authProviderId },
            });
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
  },
});
