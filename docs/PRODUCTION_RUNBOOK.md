# PRODUCTION RUNBOOK (Neon + Vercel + Prisma)

Doel: production stabiel houden met zo min mogelijk onderhoud.
Stack: Vercel (Next.js) + Neon Postgres + Prisma + NextAuth.

## Golden rules

- Deel NOOIT database-URL’s of credentials.
- Runtime gebruikt Neon **pooled** URL.
- Migrations gebruiken Neon **direct** URL.
- Migrations draaien alleen op **Production** deploys.
- Als login/monitor faalt: eerst checken of Vercel naar de juiste Neon branch/db wijst.

---

## 1) Required Vercel environment variables

### Production

- `DATABASE_URL` = Neon **POOLED** connection string (branch: `primary`)
- `DIRECT_DATABASE_URL` = Neon **DIRECT** connection string (branch: `primary`)

### Preview

- `DATABASE_URL` = Preview/Dev database (of dezelfde, als je dat bewust wil)
- `DIRECT_DATABASE_URL` = **NIET zetten** (zodat preview nooit migrations draait)

---

## 2) Password rotate (Neon) – procedure

### A) Rotate in Neon

Neon Console → Project → Branch `primary` → Connection Details → “Reset/Rotate password”.

### B) Update Vercel env vars

Vercel → Project → Settings → Environment Variables:

- update `DATABASE_URL` (pooled, primary)
- update `DIRECT_DATABASE_URL` (direct, primary)

### C) Redeploy

Vercel → Deployments → latest → Redeploy

### D) Quick verification

Neon SQL editor (branch `primary`):

```sql
select count(*) as users from "User";
```
