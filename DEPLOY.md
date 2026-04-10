# Deployment Guide — Algo Studio

A step-by-step checklist for first-time production deployment on Vercel. Follow top-to-bottom.

**Target environment:** Vercel + Neon PostgreSQL + Upstash Redis + Resend.

**Required reading before starting:** [.env.example](./.env.example) — every env var listed here is documented there with generate instructions.

---

## Phase 1 — Prerequisites

Before touching Vercel, you need accounts + resources at these providers:

- [ ] **Neon** — PostgreSQL database with PITR backups enabled (Pro plan)
- [ ] **Upstash** — Redis database for distributed rate limiting (Free tier is fine for launch)
- [ ] **Stripe** — account with 3 products created (Pro, Elite, Institutional) and monthly recurring prices
- [ ] **Resend** — account with your custom domain verified (SPF + DKIM DNS records added)
- [ ] **Sentry** — project with separate client + server DSNs
- [ ] **Vercel** — account + project connected to your git repository
- [ ] **Domain** — registered and pointed at Vercel nameservers (or CNAME)

Optional (can defer to post-launch):

- Google OAuth credentials
- GitHub OAuth credentials
- Discord OAuth + bot for role sync
- Cloudflare Turnstile CAPTCHA
- OpenAI API key for AI Strategy Doctor
- Telegram bot via @BotFather

---

## Phase 2 — Generate secrets locally

Run these commands on your machine and save the output to a password manager. You'll paste them into Vercel in Phase 3.

```bash
# AUTH_SECRET (NextAuth session signing — min 32 chars)
openssl rand -base64 32

# CRON_SECRET (bearer token for all cron endpoints)
openssl rand -base64 32

# INTERNAL_API_KEY (machine-to-machine internal routes — min 32 chars)
openssl rand -base64 32

# ENCRYPTION_SALT (field-level encryption for telegram tokens etc.)
openssl rand -hex 32

# TRACK_RECORD_SIGNING_KEY (min 64 hex chars — cryptographic proof chain)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# TRACK_RECORD_SECRET (checkpoint HMAC)
openssl rand -hex 32

# INGEST_WEBHOOK_SECRET (internal trade ingest HMAC)
openssl rand -hex 32

# TELEGRAM_WEBHOOK_SECRET (only if using Telegram integration)
openssl rand -hex 32

# VAPID keys (only if using Web Push notifications)
npx web-push generate-vapid-keys
```

**Treat these like passwords.** Never commit them. Never paste them in chat. Never put them in `.env.example`.

---

## Phase 3 — Vercel environment variables

Set all of the following in **Vercel Dashboard → Project → Settings → Environment Variables**. Scope each to **Production** (and **Preview** if you want feature branches to work).

### 3.1 Database — REQUIRED

| Var                   | Value                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Neon pooled connection string — **with** `-pooler` in hostname                               |
| `DIRECT_DATABASE_URL` | Neon direct connection — **without** `-pooler` in hostname. Used by `prisma migrate deploy`. |

Copy both from Neon dashboard → Project → Connection Details. Use "Pooled connection" for `DATABASE_URL` and "Direct connection" for `DIRECT_DATABASE_URL`.

**Current region:** AWS `us-east-1` (N. Virginia). This is disclosed in the privacy policy under international data transfers (EU-US DPF + SCCs). Co-located with Vercel `iad1` and Upstash `us-east-1` for minimum query latency.

### 3.2 Auth — REQUIRED

| Var                   | Value                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `AUTH_SECRET`         | Generated above (`openssl rand -base64 32`)                                               |
| `AUTH_URL`            | Your production domain, e.g. `https://algo-studio.com` — **must not contain "localhost"** |
| `AUTH_TRUST_HOST`     | `true` — required for Vercel edge/proxy                                                   |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL`                                                                        |

### 3.3 Payments — REQUIRED

| Var                                     | Where to get it                                                       |
| --------------------------------------- | --------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                     | Stripe Dashboard → Developers → API keys → Secret key (`sk_live_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`    | Same page → Publishable key (`pk_live_...`)                           |
| `STRIPE_WEBHOOK_SECRET`                 | Configured during webhook setup (see Phase 5.2)                       |
| `STRIPE_PRO_MONTHLY_PRICE_ID`           | Stripe Dashboard → Products → Pro → price ID (`price_...`)            |
| `STRIPE_ELITE_MONTHLY_PRICE_ID`         | Same — Elite product                                                  |
| `STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID` | Same — Institutional product                                          |
| `STRIPE_TRIAL_DAYS`                     | Optional, e.g. `14` — days of free trial                              |

**Stripe account region:** Netherlands → Stripe Payments Europe Ltd (Dublin, Ireland). EU entity, GDPR-friendly. No separate DPA needed — covered by Stripe's standard terms which include SCCs.

### 3.4 Email — REQUIRED

| Var              | Value                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| `RESEND_API_KEY` | Resend Dashboard → API Keys                                                       |
| `EMAIL_FROM`     | `Algo Studio <noreply@algo-studio.com>` — **must use the verified custom domain** |

**Status:** `algo-studio.com` is already verified in Resend (eu-west-1, Dublin EU region). SPF/DKIM DNS records are in place. You can use `noreply@algo-studio.com` directly.

**Do NOT use** `onboarding@resend.dev` in production — the env schema will reject it with a hard fail.

### 3.5 Rate limiting — REQUIRED

| Var                        | Where to get it                                    |
| -------------------------- | -------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Upstash Dashboard → your database → REST API → URL |
| `UPSTASH_REDIS_REST_TOKEN` | Same page → REST API → Token                       |

**Current setup:** database `algostudio-ratelimit` in AWS us-east-1 (Virginia), Free Tier plan, Global replication enabled. Endpoint: `intimate-sturgeon-48085.upstash.io`. Free tier (500k commands/month) is sufficient for launch.

### 3.6 Cryptographic secrets — REQUIRED

| Var                        | Value           |
| -------------------------- | --------------- |
| `CRON_SECRET`              | Generated above |
| `INTERNAL_API_KEY`         | Generated above |
| `ENCRYPTION_SALT`          | Generated above |
| `TRACK_RECORD_SIGNING_KEY` | Generated above |
| `TRACK_RECORD_SECRET`      | Generated above |
| `INGEST_WEBHOOK_SECRET`    | Generated above |

### 3.7 Error monitoring — REQUIRED (recommended)

| Var                      | Where to get it                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| `SENTRY_DSN`             | Sentry → Project Settings → Client Keys (DSN) — server DSN         |
| `NEXT_PUBLIC_SENTRY_DSN` | Same page — client-side DSN. Can use the same DSN as `SENTRY_DSN`. |

**Current setup:** Sentry organization "algo-studio" in EU region (`de.sentry.io` — Frankfurt). Project: `algo-studio`. Developer plan (free tier: 5k errors/month, 50 session replays, email alerts on high-priority issues).

**DSN format check:** your DSN URL must contain `.ingest.de.sentry.io` (EU region). If it contains `ingest.sentry.io` (US) or `ingest.us.sentry.io`, the account is in the wrong region and must be recreated.

### 3.8 Admin bootstrap — REQUIRED

| Var             | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| `ADMIN_EMAIL`   | Your email address — this user gets automatic admin access on first login |
| `SUPPORT_EMAIL` | Public support contact, e.g. `support@algo-studio.com`                    |

### 3.9 Optional integrations

Set these ONLY if you're enabling the corresponding feature:

**OAuth providers** (enables social login):

- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_PRO_ROLE_ID`, `DISCORD_ELITE_ROLE_ID`

**CAPTCHA** (bot protection on register/login):

- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

**AI Strategy Doctor**:

- `OPENAI_API_KEY`

**Telegram alert channel**:

- `ALGO_TELEGRAM_BOT_TOKEN`, `ALGO_TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`

**Web Push notifications**:

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

---

## Phase 4 — Database migration

Before the first deploy, run Prisma migrations against production.

```bash
# On your local machine, with DATABASE_URL and DIRECT_DATABASE_URL
# set to the production Neon URLs (or via Vercel CLI):

vercel env pull .env.production.local
DATABASE_URL=$(grep DIRECT_DATABASE_URL .env.production.local | cut -d '=' -f2-) \
  npx prisma migrate deploy
```

**Never use `prisma migrate dev` on production** — it can drop data.

---

## Phase 5 — First deploy

### 5.1 Push to main branch

```bash
git push origin main
```

Vercel builds automatically. Watch the build logs for any env validation errors. If the schema validation fails, you'll see something like:

```
Environment validation failed:
  STRIPE_SECRET_KEY: Stripe keys are required in production
```

Fix the missing vars and redeploy.

### 5.2 Configure Stripe webhook

Once the first deploy succeeds, set up the Stripe webhook endpoint:

1. Go to **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
3. Events to send (at minimum):
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `customer.subscription.paused`
   - `customer.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
   - `invoice.marked_uncollectible`
   - `charge.refunded`
   - `charge.dispute.created`
   - `charge.dispute.closed`
   - `subscription_schedule.completed`
   - `subscription_schedule.canceled`
   - `subscription_schedule.released`
4. Copy the **Signing secret** (`whsec_...`) into Vercel as `STRIPE_WEBHOOK_SECRET`
5. Redeploy so the new secret is picked up

### 5.3 Configure Vercel Cron (if not already)

The project has 9 cron endpoints. Vercel Cron should trigger each one. Check `vercel.json` for the schedule configuration. Each cron call sends `Authorization: Bearer ${CRON_SECRET}` which matches your `CRON_SECRET` env var.

---

## Phase 6 — Post-deploy smoke tests

Work through this checklist on the live site. Don't ship until all green.

### 6.1 Basic connectivity

- [ ] Homepage loads without errors
- [ ] No errors in Sentry dashboard immediately after deploy
- [ ] Pricing page shows 3 plans with correct EUR prices

### 6.2 Account flow

- [ ] Register with a fresh email → receive verification email within 30s
- [ ] Email comes from your verified domain (NOT `resend.dev`)
- [ ] Click verify link → lands on verified state
- [ ] Log out, log back in → session persists
- [ ] Request password reset → email arrives → reset works

### 6.3 Stripe checkout (use test mode first!)

- [ ] Start checkout for Pro plan
- [ ] Stripe checkout page loads with correct product + price
- [ ] Use Stripe test card `4242 4242 4242 4242` → checkout succeeds
- [ ] Redirect back to app → subscription shows as active
- [ ] Check Stripe Dashboard → subscription created + webhook event `200 OK`
- [ ] Check Vercel logs → no webhook handler errors
- [ ] Cancel subscription in app → UI shows "Ends on [date]" banner
- [ ] Reactivate → banner disappears

### 6.4 Rate limiting (Upstash)

- [ ] Hit any API endpoint ~100x rapidly → gets `429 Too Many Requests`
- [ ] Check Upstash dashboard → commands counter increased

### 6.5 Cron trigger

Manually trigger one cron endpoint as smoke test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/cleanup
```

Should return `200` with success payload. Any `401` = `CRON_SECRET` mismatch.

### 6.6 Referral flow (if enabled)

- [ ] Copy your referral link from /app/referrals
- [ ] Open in incognito → click through → register
- [ ] Verify referral attribution appears in admin panel

### 6.7 Critical features

- [ ] Export a strategy → MQL5 file downloads
- [ ] Upload a backtest → evaluation runs
- [ ] Run AI Strategy Doctor (if `OPENAI_API_KEY` set) → returns analysis
- [ ] Verify a public track record page renders with the disclaimer banner

---

## Phase 7 — Monitoring setup (week 1)

Not blocking launch, but do within the first week:

- [ ] Set up Sentry alert rules: email you on any `5xx` rate >1% in 5min
- [ ] Set up Sentry release tracking so stack traces map to source
- [ ] Add uptime monitoring (BetterUptime, Pingdom, or UptimeRobot) hitting `/` every minute
- [ ] Review Vercel Analytics for initial traffic patterns
- [ ] Review Stripe webhook delivery log for any failures
- [ ] Review Upstash Redis usage to forecast billing
- [ ] Review Neon database size and query performance

---

## Troubleshooting

### Build fails with "Environment validation failed"

Read the error carefully — it lists exactly which env var is missing or invalid. The most common causes:

- `AUTH_URL` still set to `http://localhost:3000` in Vercel
- `AUTH_TRUST_HOST` not set to `"true"`
- `EMAIL_FROM` still using `resend.dev` default
- Missing one of the required cryptographic secrets

### Stripe webhooks all return 400 "Invalid signature"

`STRIPE_WEBHOOK_SECRET` in Vercel doesn't match the one in Stripe webhook endpoint settings. Copy it fresh from Stripe dashboard.

### `/api/internal/*` returns 401

`INTERNAL_API_KEY` missing or mismatched between the caller and Vercel env.

### Cron jobs all fail silently

`CRON_SECRET` missing or Vercel Cron isn't sending the `Authorization: Bearer` header. Check `vercel.json` cron config.

### Emails not being delivered

- `EMAIL_FROM` domain not verified in Resend
- DNS records (SPF/DKIM) not propagated — wait 30 min
- Check Resend dashboard → Activity for delivery failures

### Rate limits never trigger

`UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` wrong. The app silently falls back to in-memory rate limiting which doesn't work on serverless.

---

## Secret rotation (post-launch)

Rotate every 6 months or immediately if a secret is exposed:

1. Generate new secret using Phase 2 commands
2. Update in Vercel (keeps old one in env temporarily if using rotation support)
3. Redeploy
4. Verify smoke tests still pass
5. Remove old secret from env

For `ENCRYPTION_SALT` specifically: set the old value as `ENCRYPTION_SALT_PREVIOUS` during rotation so existing encrypted data can still be decrypted while new data uses the new salt.
