# AlgoStudio - Visual Forex EA Builder

## Overview

A SaaS platform for building MetaTrader 5 Expert Advisors (trading bots) using a visual drag-and-drop strategy builder. Built with Next.js 16, React 19, and TypeScript.

## Features

- Visual node-based strategy builder powered by React Flow
- MQL5 code generation from visual strategies
- Version control for strategies
- Subscription plans (Free, Starter, Pro) with Stripe billing (monthly and yearly)
- Authentication via email/password, Google OAuth, and GitHub OAuth
- GDPR compliance including data export and account deletion
- Rate limiting with Upstash Redis
- Error monitoring with Sentry
- Transactional emails via Resend
- Structured logging with Pino
- Automated daily cleanup via Vercel Cron

## Tech Stack

| Category        | Technology                          |
| --------------- | ----------------------------------- |
| Framework       | Next.js 16 (App Router)            |
| Language        | TypeScript 5                        |
| UI              | React 19, Tailwind CSS v4          |
| Strategy Editor | React Flow (@xyflow/react)         |
| Database        | PostgreSQL (Neon compatible)       |
| ORM             | Prisma 6                            |
| Auth            | NextAuth v5 (Auth.js)              |
| Payments        | Stripe                              |
| Rate Limiting   | Upstash Redis                       |
| Email           | Resend                              |
| Monitoring      | Sentry                              |
| Logging         | Pino                                |
| Validation      | Zod                                 |
| Unit Testing    | Vitest, Testing Library             |
| E2E Testing     | Playwright                          |
| Deployment      | Vercel                              |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or [Neon](https://neon.tech) for serverless Postgres)

### Setup

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd forex-ea-builder
npm install
```

2. Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

At minimum you need to configure:
- `DATABASE_URL` -- PostgreSQL connection string
- `AUTH_SECRET` -- generate with `openssl rand -base64 32`
- `AUTH_URL` -- your app URL (e.g., `http://localhost:3000`)

Optional but recommended for full functionality:
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` -- Google OAuth credentials
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` -- GitHub OAuth credentials
- `RESEND_API_KEY` -- for transactional emails
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- for payments
- Stripe Price IDs for each plan and billing interval

3. Generate the Prisma client and push the schema to the database:

```bash
npx prisma generate
npx prisma db push
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `npm run dev`            | Start the Next.js development server               |
| `npm run build`          | Generate Prisma client and build for production     |
| `npm run start`          | Start the production server                         |
| `npm run lint`           | Run ESLint                                          |
| `npm run test`           | Run Vitest in watch mode                            |
| `npm run test:run`       | Run Vitest once (CI-friendly)                       |
| `npm run test:coverage`  | Run Vitest with coverage report                     |
| `npm run test:ui`        | Open the Vitest UI                                  |
| `npm run test:e2e`       | Run Playwright end-to-end tests                     |
| `npm run test:e2e:ui`    | Run Playwright tests with the UI                    |
| `npm run test:e2e:headed`| Run Playwright tests in headed browser mode         |
| `npm run test:e2e:debug` | Run Playwright tests in debug mode                  |
| `npm run prisma:generate`| Regenerate the Prisma client                        |
| `npm run prisma:migrate` | Create and apply a Prisma migration                 |
| `npm run prisma:push`    | Push the Prisma schema to the database              |
| `npm run prisma:studio`  | Open Prisma Studio (database GUI)                   |
| `npm run format`         | Format all files with Prettier                      |
| `npm run format:check`   | Check formatting without writing changes            |
| `npm run type-check`     | Run the TypeScript compiler with no output          |
| `npm run validate`       | Run type-check, lint, and unit tests in sequence    |

## Project Structure

```
src/
  app/              Next.js App Router pages and API routes
    api/            API route handlers (auth, strategies, stripe webhooks, cron)
    app/            Authenticated application pages (dashboard, editor)
    login/          Login page
    pricing/        Pricing page
    privacy/        Privacy policy
    terms/          Terms of service
  components/       Shared React components
  lib/              Shared utilities and configuration
    mql5-generator/ MQL5 code generation logic
    validations/    Zod schemas for input validation
    auth.ts         NextAuth configuration
    prisma.ts       Prisma client singleton
    stripe.ts       Stripe client and helpers
    rate-limit.ts   Upstash rate limiting
    email.ts        Email sending via Resend
    logger.ts       Pino logger setup
  test/             Test utilities and setup
  types/            TypeScript type definitions
prisma/
  schema.prisma     Database schema (PostgreSQL)
```

## Testing

### Unit Tests

Run unit tests with Vitest:

```bash
npm run test          # watch mode
npm run test:run      # single run
npm run test:coverage # with coverage
```

### End-to-End Tests

Run E2E tests with Playwright:

```bash
npm run test:e2e          # headless
npm run test:e2e:headed   # in a visible browser
npm run test:e2e:debug    # with Playwright debugger
```

### Full Validation

Run type checking, linting, and unit tests together:

```bash
npm run validate
```

## Deployment

The application is deployed on **Vercel**. The `build` script automatically runs `prisma generate` before `next build`.

A Vercel Cron job is configured in `vercel.json` to run a cleanup task daily at 03:00 UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Ensure all environment variables from `.env.example` are configured in the Vercel project settings before deploying.
