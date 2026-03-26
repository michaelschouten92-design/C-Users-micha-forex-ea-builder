# AlgoStudio Pre-Live Check

**Datum:** 26 maart 2026
**Scope:** Volledige systeemverificatie voor productie-launch
**Methode:** Code-review audit + runtime check runbook
**Vorige audit:** 16 maart 2026 (verdict: READY WITH CONDITIONS)

---

## Overall Verdict: CONDITIONAL GO

Het systeem is architecturaal solide en de kritieke paden zijn goed beveiligd. Er zijn **4 code-issues gevonden** die gefixt moeten worden voor launch, plus **1 operationele mismatch** om te adresseren.

---

## Gevonden Issues

### ISSUE 1: Missing deletedAt Guards op Internal API Routes (MEDIUM)

**Impact:** Soft-deleted instances kunnen verschijnen in admin/operator dashboards.
**Risico:** Operationeel verwarrend, geen data-integriteit risico (read-only context).

Ontbrekende `deletedAt: null` guards in:

| Bestand | Regel | Type |
|---------|-------|------|
| `src/app/api/internal/incidents/[id]/route.ts` | 74 | findFirst via strategyId |
| `src/app/api/internal/overrides/[id]/route.ts` | 77 | findFirst via strategyId |
| `src/app/api/internal/ops/overview/route.ts` | 91 | findMany (HALTED instances) |
| `src/app/api/internal/monitoring/override/reject/route.ts` | 117 | updateMany |
| `src/app/api/internal/strategies/[id]/overview/route.ts` | 44 | findFirst via strategyId |

**Mitigatie:** Deze routes zijn INTERNAL (vereisen `x-internal-api-key`), dus niet extern bereikbaar. Fix is wenselijk maar niet blocking.

**NB:** De telemetry routes (`/api/telemetry/trade`, `/api/telemetry/error`, `/api/telemetry/heartbeat`) zijn VEILIG - `authenticateTelemetry()` in `src/lib/telemetry-auth.ts:67` filtert al op `deletedAt: null` bij key validatie.

**Fix:** Voeg `deletedAt: null` toe aan de where-clause van elke bovenstaande query.

---

### ISSUE 2: Proof-Status Endpoint Gebruikt Count-Only Verificatie (HIGH)

**Impact:** `/api/live/[instanceId]/proof-status` endpoint meldt `chainIntegrity: true` zonder echte cryptografische chain verificatie.
**Risico:** Ladder level kan onterecht "VERIFIED" of "PROVEN" tonen als chain is getamperd.

**Bestand:** `src/app/api/live/[instanceId]/proof-status/route.ts`, regels 97-106

**Huidige code (onveilig):**
```typescript
const eventCount = await prisma.trackRecordEvent.count({
  where: { instanceId },
});
chainIntegrity = eventCount === trackRecordState.lastSeqNo;
```

**Alle andere proof endpoints gebruiken WEL echte verificatie:**
- `/api/proof/[strategyId]` - verifyChain()
- `/api/proof/chain/[strategyId]` - verifyProofChain()
- `/api/embed/[token]` - verifyChain()
- `/api/track-record/verify` - verifyChain()
- `/api/track-record/verify-report` - verifyProofBundle()

**Fix:** Vervang count-check met `verifyChain()` call:
```typescript
import { verifyChain } from "@/lib/track-record/chain-verifier";

const chainEvents = await prisma.trackRecordEvent.findMany({
  where: { instanceId },
  orderBy: { seqNo: "asc" },
  select: { instanceId: true, seqNo: true, eventType: true, eventHash: true, prevHash: true, payload: true, timestamp: true },
});
const chainResult = verifyChain(chainEvents as Parameters<typeof verifyChain>[0], instanceId);
chainIntegrity = chainResult.valid && chainResult.chainLength === trackRecordState.lastSeqNo;
```

**NB:** Dit endpoint is user-authenticated (niet publiek), maar het informeert ladder level berekening die WEL publiek zichtbaar is.

---

### ISSUE 3: Missing deletedAt Guard op Proof-Status Instance Lookup (MEDIUM)

**Bestand:** `src/app/api/live/[instanceId]/proof-status/route.ts`, regel 27-51

```typescript
const instance = await prisma.liveEAInstance.findFirst({
  where: { id: instanceId, userId: session.user.id },
  // MISSING: deletedAt: null
```

**Fix:** Voeg `deletedAt: null` toe aan de where-clause.

---

### ISSUE 4: Weekly-Report Cron Niet Gescheduled (LOW)

**Bestand:** `src/app/api/cron/weekly-report/route.ts` bestaat maar is NIET opgenomen in `vercel.json`.

**Impact:** Weekly report wordt nooit automatisch verstuurd.
**Actie:** Bewust besluit nemen - toevoegen aan vercel.json of verwijderen.

---

### ISSUE 5: Rate Limiting Env Mismatch (MEDIUM)

**Bevinding:** `src/lib/env.ts` (regels 201-211) VEREIST `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` in productie. Maar `src/lib/rate-limit.ts` gebruikt ALTIJD `InMemoryRateLimiter` - er is geen Redis-backed implementatie.

**Impact:** False sense of security - Upstash variabelen zijn vereist maar worden alleen gebruikt voor health checks, niet voor rate limiting.
**Actie:** Ofwel Redis-backed rate limiting implementeren, ofwel de productie-vereiste uit env.ts verwijderen en documenteren dat in-memory rate limiting wordt gebruikt.

---

## Bevestigde Fixes (Sinds Vorige Audit)

| Fix | Commit | Status |
|-----|--------|--------|
| deletedAt guards op heartbeat/monitoring routes | `4e028d7` | VERIFIED - Guards aanwezig op alle kritieke paden |
| Stale heartbeat prevention | `4ff046f` | VERIFIED - Session tracking + seqNo validatie |
| Real chain verification op public endpoints | `07b20a6` | VERIFIED - verifyChain() op 5/6 public endpoints |
| Lifecycle alignment (manual-only recovery) | `19c612a` | VERIFIED - EDGE_AT_RISK recovery is manual-only |
| OVERRIDE_PENDING release | `19c612a` | VERIFIED - Code staat release toe |
| Outbox deduplication | `a0250f3` | VERIFIED - P2002 unique constraint + silent absorb |
| Backoff infinity overflow cap | Process-outbox | VERIFIED - Math.min(attempts, 10) cap |
| EA binary update | `a011528` | VERIFIED - Bestand aanwezig |

---

## Operationele Status

### Cron Jobs
7 van 8 cron routes zijn gescheduled in vercel.json. Alle routes valideren CRON_SECRET correct.

### Telemetry Security
- Pre-auth rate limiting: 300 req/min per IP (voorkomt key enumeration)
- Post-auth rate limiting: 120 req/min per instance
- Per-instance API key authenticatie via HMAC-SHA256
- Timing-safe comparison op key validatie
- deletedAt guard in auth-laag

### Chain Verification
5 van 6 proof-gerelateerde endpoints gebruiken echte cryptografische verificatie. 1 endpoint (proof-status) gebruikt count-only check (ISSUE 2).

### Circuit Breakers
- Anthropic, OpenAI, Resend: circuit breaker aanwezig
- Stripe, Sentry: geen circuit breaker (acceptabel - niet in hot path)

---

## Bekende Risico's - Accept Beslissingen

| Risico | Beoordeling | Beslissing |
|--------|-------------|------------|
| In-memory rate limiting | Per-instance counters, niet distributed | ACCEPT - adequate voor launch-schaal |
| next-auth v5 beta | Wijdverspreid in productie | ACCEPT - versie pinnen |
| Silent cron failures | admin-alerts cron is vangnet | ACCEPT - monitoring na launch |
| DB pool exhaustion | Monitoring in prisma.ts aanwezig | ACCEPT |
| P2034 conflicts | Alleen logging, geen auto-retry | ACCEPT |

---

## Runtime Check Runbook

De volgende checks moeten gedraaid worden op een machine met Node.js 20+:

### Stap 1: Build Verificatie
```bash
npm run type-check        # Must: exit 0
npm run lint              # Must: exit 0
npx prisma generate       # Must: exit 0
npx prisma validate       # Must: exit 0
npm run build             # Must: exit 0
```

### Stap 2: Unit Tests
```bash
npm run test:run          # Must: 0 failures
```

### Stap 3: Specifieke Fix Tests
```bash
npx vitest run src/app/api/telemetry/heartbeat/route.test.ts
npx vitest run src/domain/heartbeat/decide-heartbeat-action.test.ts
npx vitest run src/domain/heartbeat/assert-heartbeat-consistency.test.ts
npx vitest run src/lib/track-record/chain-verifier.test.ts
npx vitest run src/lib/strategy-lifecycle/transition-service.test.ts
npx vitest run src/domain/monitoring/decide-monitoring-transition.test.ts
npx vitest run src/lib/outbox.test.ts
```

### Stap 4: E2E Tests (vereist dev server)
```bash
npm run dev &
npx playwright test       # Must: 0 failures
```

### Stap 5: Production Smoke Test
```bash
node scripts/load-smoke-test.mjs  # Must: PASS verdict
```

### Stap 6: Vercel Environment Check
```bash
vercel env ls production  # Verifieer alle MUST-HAVE variabelen
```

---

## Actieplan voor GO

1. **FIX (voor launch):** Issue 2 - Proof-status chain verificatie
2. **FIX (voor launch):** Issue 3 - deletedAt guard op proof-status
3. **FIX (wenselijk):** Issue 1 - deletedAt guards op internal routes
4. **BESLUIT:** Issue 4 - Weekly-report cron wel/niet schedulen
5. **DOCUMENTEER:** Issue 5 - Rate limiting is in-memory (niet distributed)
6. **DRAAI:** Runtime check runbook (Stappen 1-6)
7. **VERIFIEER:** Alle Vercel env vars geconfigureerd
8. **VERIFIEER:** Stripe webhook endpoint geregistreerd
9. **VERIFIEER:** Neon PITR ingeschakeld
