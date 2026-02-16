import { z } from "zod";

/**
 * Environment variable validation schema.
 * This validates all required environment variables at startup.
 *
 * Server-side variables are only validated on the server.
 * Client-side variables (NEXT_PUBLIC_*) are available everywhere.
 */

// Detect if we're running on the server
const isServer = typeof window === "undefined";

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database (required)
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid URL"),

  // NextAuth (required)
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters - generate with: openssl rand -base64 32"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL").default("http://localhost:3000"),
  AUTH_TRUST_HOST: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // Google OAuth (optional - both must be set or neither)
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // GitHub OAuth (optional - both must be set or neither)
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  // Resend Email (optional in dev, recommended in prod)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("AlgoStudio <onboarding@resend.dev>"),

  // Stripe (optional in dev, required in prod for payments)
  STRIPE_SECRET_KEY: z.string().optional().or(z.literal("")),
  STRIPE_WEBHOOK_SECRET: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),

  // Stripe Price IDs (required when Stripe is enabled)
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ELITE_YEARLY_PRICE_ID: z.string().optional(),

  // Sentry (optional - for error tracking)
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal("")),

  // Upstash Redis (optional - for production rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Cron secret (optional in dev, required in prod)
  CRON_SECRET: z.string().optional(),

  // Discord OAuth (optional - for Discord login + guild management)
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_PRO_ROLE_ID: z.string().optional(),
  DISCORD_ELITE_ROLE_ID: z.string().optional(),

  // Support email (optional - defaults to support@algo-studio.com)
  SUPPORT_EMAIL: z.string().email().optional(),

  // Admin email (bootstrap admin access)
  ADMIN_EMAIL: z.string().email().optional(),

  // Cloudflare Turnstile CAPTCHA (optional)
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Stripe trial period (optional, days)
  STRIPE_TRIAL_DAYS: z.coerce.number().int().min(0).max(90).optional(),
});

// Refinements for conditional requirements
const refinedEnvSchema = envSchema
  .refine(
    (data) => {
      // If Google ID is set, Secret must also be set
      if (data.AUTH_GOOGLE_ID && !data.AUTH_GOOGLE_SECRET) return false;
      if (data.AUTH_GOOGLE_SECRET && !data.AUTH_GOOGLE_ID) return false;
      return true;
    },
    {
      message: "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must both be set or both be empty",
      path: ["AUTH_GOOGLE_ID"],
    }
  )
  .refine(
    (data) => {
      // If GitHub ID is set, Secret must also be set
      if (data.AUTH_GITHUB_ID && !data.AUTH_GITHUB_SECRET) return false;
      if (data.AUTH_GITHUB_SECRET && !data.AUTH_GITHUB_ID) return false;
      return true;
    },
    {
      message: "AUTH_GITHUB_ID and AUTH_GITHUB_SECRET must both be set or both be empty",
      path: ["AUTH_GITHUB_ID"],
    }
  )
  .refine(
    (data) => {
      // If Discord ID is set, Secret must also be set
      if (data.DISCORD_CLIENT_ID && !data.DISCORD_CLIENT_SECRET) return false;
      if (data.DISCORD_CLIENT_SECRET && !data.DISCORD_CLIENT_ID) return false;
      return true;
    },
    {
      message: "DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must both be set or both be empty",
      path: ["DISCORD_CLIENT_ID"],
    }
  )
  .refine(
    (data) => {
      // In production, Stripe keys are required (treat empty string as not set)
      if (data.NODE_ENV === "production") {
        if (!data.STRIPE_SECRET_KEY || data.STRIPE_SECRET_KEY === "") return false;
        if (!data.STRIPE_WEBHOOK_SECRET || data.STRIPE_WEBHOOK_SECRET === "") return false;
        if (
          !data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
          data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === ""
        )
          return false;
      }
      return true;
    },
    {
      message:
        "Stripe keys (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) are required in production",
      path: ["STRIPE_SECRET_KEY"],
    }
  )
  .refine(
    (data) => {
      // If Stripe is enabled (non-empty), all price IDs are required
      if (data.STRIPE_SECRET_KEY && data.STRIPE_SECRET_KEY !== "") {
        if (!data.STRIPE_PRO_MONTHLY_PRICE_ID) return false;
        if (!data.STRIPE_PRO_YEARLY_PRICE_ID) return false;
        if (!data.STRIPE_ELITE_MONTHLY_PRICE_ID) return false;
        if (!data.STRIPE_ELITE_YEARLY_PRICE_ID) return false;
      }
      return true;
    },
    {
      message: "When STRIPE_SECRET_KEY is set, all Stripe price IDs are required",
      path: ["STRIPE_PRO_MONTHLY_PRICE_ID"],
    }
  )
  .refine(
    (data) => {
      // In production, RESEND_API_KEY is required for password reset
      if (data.NODE_ENV === "production" && !data.RESEND_API_KEY) {
        return false;
      }
      return true;
    },
    {
      message: "RESEND_API_KEY is required in production for email functionality",
      path: ["RESEND_API_KEY"],
    }
  )
  .refine(
    (data) => {
      // In production, Upstash Redis is required for rate limiting across instances
      if (data.NODE_ENV === "production") {
        if (!data.UPSTASH_REDIS_REST_URL || !data.UPSTASH_REDIS_REST_TOKEN) return false;
      }
      return true;
    },
    {
      message:
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production for distributed rate limiting",
      path: ["UPSTASH_REDIS_REST_URL"],
    }
  )
  .refine(
    (data) => {
      // In production, CRON_SECRET is required for cron job authentication
      if (data.NODE_ENV === "production" && !data.CRON_SECRET) return false;
      return true;
    },
    {
      message: "CRON_SECRET is required in production for cron job authentication",
      path: ["CRON_SECRET"],
    }
  );

// Client-safe schema (only NEXT_PUBLIC_* variables)
const clientEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
  // On the client, only validate client-safe variables
  if (!isServer) {
    const clientResult = clientEnvSchema.safeParse({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    });

    if (!clientResult.success) {
      console.error("Client environment validation failed:", clientResult.error.issues);
    }

    // Return a partial env object for client-side use
    // Server-only variables will be undefined
    return {
      NODE_ENV: process.env.NODE_ENV || "development",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
      // Provide empty defaults for server-only vars (they won't be used on client)
      DATABASE_URL: "",
      AUTH_SECRET: "",
      AUTH_URL: "http://localhost:3000",
      AUTH_TRUST_HOST: false,
      AUTH_GOOGLE_ID: undefined,
      AUTH_GOOGLE_SECRET: undefined,
      AUTH_GITHUB_ID: undefined,
      AUTH_GITHUB_SECRET: undefined,
      RESEND_API_KEY: undefined,
      EMAIL_FROM: "AlgoStudio <onboarding@resend.dev>",
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      STRIPE_PRO_MONTHLY_PRICE_ID: undefined,
      STRIPE_PRO_YEARLY_PRICE_ID: undefined,
      STRIPE_ELITE_MONTHLY_PRICE_ID: undefined,
      STRIPE_ELITE_YEARLY_PRICE_ID: undefined,
      SENTRY_DSN: undefined,
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      CRON_SECRET: undefined,
      DISCORD_CLIENT_ID: undefined,
      DISCORD_CLIENT_SECRET: undefined,
      DISCORD_BOT_TOKEN: undefined,
      DISCORD_GUILD_ID: undefined,
      DISCORD_PRO_ROLE_ID: undefined,
      DISCORD_ELITE_ROLE_ID: undefined,
      ADMIN_EMAIL: undefined,
      TURNSTILE_SECRET_KEY: undefined,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined,
      STRIPE_TRIAL_DAYS: undefined,
    } as z.infer<typeof refinedEnvSchema>;
  }

  // During build (next build), env vars may not all be available.
  // Only warn during build, enforce at runtime.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  // On the server, do full validation
  const result = refinedEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    if (isBuildPhase) {
      // During build: warn but don't crash — runtime secrets aren't available yet
      console.warn("⚠ Environment validation warnings (build phase):");
      console.warn(errorMessages);
      console.warn("These variables must be set at runtime.");

      // Return defaults for build phase — real values will be available at runtime
      return {
        NODE_ENV: process.env.NODE_ENV || "production",
        DATABASE_URL:
          process.env.DATABASE_URL ||
          "postgresql://placeholder:placeholder@localhost:5432/placeholder",
        AUTH_SECRET: process.env.AUTH_SECRET || "build-phase-placeholder",
        AUTH_URL: process.env.AUTH_URL || "http://localhost:3000",
        AUTH_TRUST_HOST: false,
        AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
        AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
        AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
        AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM || "AlgoStudio <onboarding@resend.dev>",
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
        STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
        STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
        STRIPE_ELITE_MONTHLY_PRICE_ID: process.env.STRIPE_ELITE_MONTHLY_PRICE_ID,
        STRIPE_ELITE_YEARLY_PRICE_ID: process.env.STRIPE_ELITE_YEARLY_PRICE_ID,
        SENTRY_DSN: process.env.SENTRY_DSN,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        CRON_SECRET: process.env.CRON_SECRET,
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
        DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
        DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
        DISCORD_PRO_ROLE_ID: process.env.DISCORD_PRO_ROLE_ID,
        DISCORD_ELITE_ROLE_ID: process.env.DISCORD_ELITE_ROLE_ID,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        STRIPE_TRIAL_DAYS: process.env.STRIPE_TRIAL_DAYS
          ? Number(process.env.STRIPE_TRIAL_DAYS)
          : undefined,
      } as z.infer<typeof refinedEnvSchema>;
    }

    console.error("Environment validation failed:");
    console.error("");

    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      console.error(`  ${path}: ${issue.message}`);
    }

    console.error("");
    console.error("Please check your .env file and ensure all required variables are set.");
    console.error("See .env.example for reference.");

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
  }

  return result.data;
}

// Validate on module load
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof refinedEnvSchema>;

// Helper to check if a feature is enabled (treat empty strings as disabled)
// On client-side, these will be false since server env vars are not available
export const features = {
  googleAuth:
    isServer &&
    Boolean(
      env.AUTH_GOOGLE_ID &&
      env.AUTH_GOOGLE_ID !== "" &&
      env.AUTH_GOOGLE_SECRET &&
      env.AUTH_GOOGLE_SECRET !== ""
    ),
  githubAuth:
    isServer &&
    Boolean(
      env.AUTH_GITHUB_ID &&
      env.AUTH_GITHUB_ID !== "" &&
      env.AUTH_GITHUB_SECRET &&
      env.AUTH_GITHUB_SECRET !== ""
    ),
  discordAuth:
    isServer &&
    Boolean(
      env.DISCORD_CLIENT_ID &&
      env.DISCORD_CLIENT_ID !== "" &&
      env.DISCORD_CLIENT_SECRET &&
      env.DISCORD_CLIENT_SECRET !== ""
    ),
  stripe: isServer && Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY !== ""),
  email: isServer && Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY !== ""),
  captcha: isServer && Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SECRET_KEY !== ""),
} as const;
