#!/usr/bin/env node
/**
 * AlgoStudio Production Smoke Test
 *
 * Phase 1: ~100 virtual users hitting public pages (concurrency 10, 120s)
 * Phase 2: 20 internal heartbeat requests (1-2s jitter)
 * Phase 3: 1 monitoring canary ingest
 * Phase 4: Proof chain integrity verification (post-ingest)
 *
 * Run:  node scripts/load-smoke-test.mjs
 * Requires: INTERNAL_API_KEY env var (never printed)
 *           DATABASE_URL or DIRECT_DATABASE_URL env var for Phase 4
 */

import pg from "pg";

const BASE = "https://algo-studio.com";
const STRATEGY_ID = "AS-10F10DCA";
const CONCURRENCY = 10;
const VIRTUAL_USERS = 100;
const PUBLIC_DURATION_MS = 120_000;
const HEARTBEAT_COUNT = 20;
const UA =
  "AlgoStudio-SmokeTest/1.0 (production canary; concurrency=10; non-abusive)";

// ─── Helpers ─────────────────────────────────────────────

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
function statusBucket(code) {
  if (code >= 200 && code < 300) return "2xx";
  if (code >= 300 && code < 400) return "3xx";
  if (code >= 400 && code < 500) return "4xx";
  return "5xx";
}

// ─── Concurrency pool ────────────────────────────────────

async function pool(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

// ─── Phase 1: Public traffic ─────────────────────────────

const PUBLIC_TARGETS = [
  { url: `${BASE}/`, label: "/" },
  { url: `${BASE}/p/demo`, label: "/p/demo" },
  { url: `${BASE}/proof/AS-10F10DCA`, label: "/proof/*" },
  { url: `${BASE}/strategies`, label: "/strategies" },
  { url: `${BASE}/api/strategies/public`, label: "/api/strategies/public" },
];

async function runPublicPhase() {
  console.log("\n=== PHASE 1: Public Traffic ===");
  console.log(
    `${VIRTUAL_USERS} virtual users, ${CONCURRENCY} concurrency, ~${PUBLIC_DURATION_MS / 1000}s`
  );

  /** @type {Map<string, {latencies: number[], statuses: Record<string, number>, count429: number}>} */
  const metrics = new Map();
  for (const t of PUBLIC_TARGETS) {
    metrics.set(t.label, { latencies: [], statuses: {}, count429: 0 });
  }

  // Build task list: 100 users, each 3-5 requests with think time
  const tasks = [];
  const startDelay = PUBLIC_DURATION_MS / VIRTUAL_USERS; // stagger starts ~1.2s apart

  for (let u = 0; u < VIRTUAL_USERS; u++) {
    const reqCount = randInt(3, 5);
    tasks.push(async () => {
      // stagger user arrival
      await sleep(u * startDelay * (0.5 + Math.random()));

      for (let r = 0; r < reqCount; r++) {
        const target =
          PUBLIC_TARGETS[randInt(0, PUBLIC_TARGETS.length - 1)];
        const m = metrics.get(target.label);
        const t0 = performance.now();
        try {
          const resp = await fetch(target.url, {
            headers: {
              "User-Agent": UA,
              Accept: "text/html,application/json",
              "Accept-Encoding": "gzip",
            },
            redirect: "follow",
          });
          const latency = Math.round(performance.now() - t0);
          m.latencies.push(latency);
          const bucket = statusBucket(resp.status);
          m.statuses[bucket] = (m.statuses[bucket] || 0) + 1;
          if (resp.status === 429) m.count429++;
          // consume body to release connection
          await resp.text();
        } catch (err) {
          const latency = Math.round(performance.now() - t0);
          m.latencies.push(latency);
          m.statuses["5xx"] = (m.statuses["5xx"] || 0) + 1;
        }

        if (r < reqCount - 1) await sleep(randInt(200, 1200));
      }
    });
  }

  const phaseStart = performance.now();
  await pool(tasks, CONCURRENCY);
  const phaseDuration = Math.round(performance.now() - phaseStart);

  // Compute report
  let totalReqs = 0;
  const rows = [];
  for (const t of PUBLIC_TARGETS) {
    const m = metrics.get(t.label);
    const sorted = [...m.latencies].sort((a, b) => a - b);
    const count = sorted.length;
    totalReqs += count;
    rows.push({
      url: t.label,
      requests: count,
      "2xx": m.statuses["2xx"] || 0,
      "3xx": m.statuses["3xx"] || 0,
      "4xx": m.statuses["4xx"] || 0,
      "5xx": m.statuses["5xx"] || 0,
      "429": m.count429,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
    });
  }

  console.log(`\nCompleted in ${(phaseDuration / 1000).toFixed(1)}s`);
  console.log(`Total requests: ${totalReqs}`);
  console.log(
    `Throughput: ${(totalReqs / (phaseDuration / 1000)).toFixed(1)} req/s\n`
  );
  console.table(rows);

  return { rows, totalReqs, phaseDuration };
}

// ─── Phase 2: Internal heartbeat ─────────────────────────

async function runHeartbeatPhase() {
  console.log("\n=== PHASE 2: Internal Heartbeat ===");
  console.log(`${HEARTBEAT_COUNT} requests, 1-2s jitter`);

  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) {
    console.log("SKIP: INTERNAL_API_KEY not set");
    return null;
  }
  console.log(`API key loaded (${apiKey.length} chars, not printed)\n`);

  const results = [];
  for (let i = 1; i <= HEARTBEAT_COUNT; i++) {
    const t0 = performance.now();
    let status = 0,
      action = "",
      reasonCode = "";
    try {
      const resp = await fetch(`${BASE}/api/internal/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
          "User-Agent": UA,
        },
        body: JSON.stringify({ strategyId: STRATEGY_ID }),
      });
      status = resp.status;
      const body = await resp.json();
      action = body.action || "";
      reasonCode = body.reasonCode || "";
    } catch {
      status = 0;
      action = "ERROR";
      reasonCode = "FETCH_FAILED";
    }
    const latency = Math.round(performance.now() - t0);
    const ts = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    results.push({ i, ts, status, action, reasonCode, latency });

    const color = status === 200 ? "" : " <<<";
    console.log(
      `${ts} | ${String(i).padStart(2)}/${HEARTBEAT_COUNT} | ${status} | ${action.padEnd(6)} | ${reasonCode.padEnd(22)} | ${latency}ms${color}`
    );

    if (status === 429) {
      console.log("STOP: rate limited");
      break;
    }
    if (status !== 200) {
      console.log(`STOP: non-200 (${status})`);
      break;
    }
    if (i < HEARTBEAT_COUNT) await sleep(randInt(1000, 2000));
  }

  // Summary
  const latencies = results.map((r) => r.latency).sort((a, b) => a - b);
  const statusDist = {};
  const actionDist = {};
  const reasonDist = {};
  for (const r of results) {
    statusDist[r.status] = (statusDist[r.status] || 0) + 1;
    actionDist[r.action] = (actionDist[r.action] || 0) + 1;
    reasonDist[r.reasonCode] = (reasonDist[r.reasonCode] || 0) + 1;
  }

  console.log("\nHeartbeat summary:");
  console.log("  Status distribution:", statusDist);
  console.log("  Action distribution:", actionDist);
  console.log("  Reason distribution:", reasonDist);
  console.log(
    `  Latency p50=${percentile(latencies, 50)}ms  p95=${percentile(latencies, 95)}ms`
  );

  return {
    results,
    statusDist,
    actionDist,
    reasonDist,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
  };
}

// ─── Phase 3: Monitoring canary ingest ───────────────────

async function runIngestPhase() {
  console.log("\n=== PHASE 3: Monitoring Canary Ingest ===");

  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) {
    console.log("SKIP: INTERNAL_API_KEY not set");
    return null;
  }

  const ticket = 300001 + randInt(0, 999);
  console.log(`Ingesting 1 LIVE trade (ticket=${ticket})...`);

  const t0 = performance.now();
  let status = 0,
    body = {};
  try {
    const resp = await fetch(`${BASE}/api/internal/trades/import-csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": apiKey,
        "User-Agent": UA,
      },
      body: JSON.stringify({
        strategyId: STRATEGY_ID,
        source: "LIVE",
        initialBalance: 10000,
        symbolFallback: "EURUSD",
        csv: `ticket,openTime,type,volume,price,profit\n${ticket},2026-03-05 12:00:00,buy,0.01,1.08900,4.20`,
      }),
    });
    status = resp.status;
    body = await resp.json();
  } catch (err) {
    status = 0;
    body = { error: err.message };
  }
  const latency = Math.round(performance.now() - t0);

  console.log(`  Status: ${status} (${latency}ms)`);
  console.log(
    `  Response: insertedCount=${body.insertedCount ?? "N/A"}, skippedCount=${body.skippedCount ?? "N/A"}, recordId=${body.recordId ?? "N/A"}`
  );
  if (body.error) console.log(`  Error: ${body.error}`);

  console.log("\n--- SQL queries to run in Neon for evidence ---\n");
  console.log(`-- Latest MonitoringRun rows
SELECT id, status, verdict, reasons::text, "errorMessage",
       "configVersion", "requestedAt", "completedAt"
FROM "MonitoringRun"
WHERE "strategyId" = '${STRATEGY_ID}'
ORDER BY "requestedAt" DESC
LIMIT 5;

-- Latest proof events (ingest + monitoring)
SELECT type, "createdAt",
       meta->>'eventType' AS "eventType",
       meta->>'monitoringVerdict' AS "verdict",
       meta->>'insertedCount' AS "insertedCount",
       meta->>'configVersion' AS "configVersion"
FROM "ProofEventLog"
WHERE "strategyId" = '${STRATEGY_ID}'
  AND type IN ('TRADE_FACTS_INGESTED', 'MONITORING_RUN_COMPLETED')
ORDER BY "createdAt" DESC
LIMIT 10;
`);

  return { status, body, latency };
}

// ─── Phase 4: Proof chain integrity verification ────────
//
// Why: After ingest, we verify the per-strategy proof chain was written
// correctly to ProofChainHead + ProofEventLog. This confirms the
// append-only, tamper-evident hash chain is intact in production.
//
// GENESIS = 64 zero-chars. It's the prevEventHash for sequence=1
// (the first event in any chain). If we see it at sequence > 1,
// the chain is broken.

const GENESIS =
  "0000000000000000000000000000000000000000000000000000000000000000";

// Sentinel used to break out of the try block when a prerequisite
// assertion fails — caught and silently swallowed in the catch.
class SkipRemaining {}

async function runProofChainVerification(ingestResult) {
  console.log("\n=== PHASE 4: Proof Chain Integrity Verification ===");
  console.log(`Strategy: ${STRATEGY_ID}`);

  // If ingest didn't succeed, skip — no chain writes expected
  if (!ingestResult || ingestResult.status !== 200) {
    console.log("SKIP: ingest did not succeed — nothing to verify");
    return null;
  }

  const connStr =
    process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!connStr) {
    console.log(
      "SKIP: neither DIRECT_DATABASE_URL nor DATABASE_URL is set"
    );
    return null;
  }

  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  const failures = [];

  try {
    await client.connect();

    // ── A) ProofChainHead assertions ───────────────────────
    // After a successful LIVE ingest the pipeline writes at least:
    //   seq N:   TRADE_FACTS_INGESTED   (from runCsvIngestPipeline)
    //   seq N+1: MONITORING_RUN_COMPLETED (from triggerMonitoringAfterIngest)
    // The monitoring event is async (triggerMonitoringAfterIngest),
    // so we retry up to 3 times with 250ms delay to let it land.
    console.log("\n  [A] ProofChainHead check...");

    const HEAD_QUERY = `SELECT "lastSequence", "lastEventHash", "updatedAt"
       FROM "ProofChainHead"
       WHERE "strategyId" = $1`;
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 250;
    let head = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const headResult = await client.query(HEAD_QUERY, [STRATEGY_ID]);

      if (headResult.rows.length === 0) {
        console.log(`      attempt ${attempt}/${MAX_ATTEMPTS}: no row yet`);
      } else {
        head = headResult.rows[0];
        console.log(
          `      attempt ${attempt}/${MAX_ATTEMPTS}: lastSequence=${head.lastSequence}`
        );
        if (head.lastSequence >= 2) break;
      }

      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }

    if (!head) {
      failures.push("ProofChainHead row does not exist");
      console.log("      FAIL: no ProofChainHead row found");
      // Skip B and C — all subsequent checks depend on the head row
      throw new SkipRemaining();
    }

    const lastSeq = head.lastSequence;
    const lastHash = head.lastEventHash;
    console.log(`      lastSequence  = ${lastSeq}`);
    console.log(`      lastEventHash = ${lastHash.slice(0, 8)}...`);
    console.log(`      updatedAt     = ${head.updatedAt.toISOString()}`);

    if (lastSeq < 2) {
      failures.push(
        `lastSequence=${lastSeq}, expected >= 2 — expected monitoring proof event but chain has only ${lastSeq} event(s)`
      );
    }
    if (!lastHash || !/^[a-f0-9]{64}$/.test(lastHash)) {
      failures.push(
        `lastEventHash is not valid hex64: ${lastHash?.slice(0, 16)}`
      );
    }
    if (lastHash === GENESIS) {
      failures.push("lastEventHash is still GENESIS (all zeros)");
    }

    // ── B) ProofEventLog: verify the last 2 events in the chain ──
    // Fetch exactly the two most recent sequence numbers from the
    // chain head. This avoids scanning legacy rows and tests the
    // link between the penultimate and ultimate events.
    const prevSeq = lastSeq - 1;
    console.log(`\n  [B] ProofEventLog linkage check (seq ${prevSeq}→${lastSeq})...`);
    const eventsResult = await client.query(
      `SELECT sequence, "eventHash", "prevEventHash", type
       FROM "ProofEventLog"
       WHERE "strategyId" = $1 AND sequence IN ($2, $3)
       ORDER BY sequence`,
      [STRATEGY_ID, prevSeq, lastSeq]
    );

    const events = eventsResult.rows;
    const bySeq = new Map(events.map((e) => [e.sequence, e]));
    const prevRow = bySeq.get(prevSeq);
    const lastRow = bySeq.get(lastSeq);

    if (!lastRow) {
      failures.push(
        `ProofEventLog row for sequence ${lastSeq} not found`
      );
    }
    if (!prevRow) {
      failures.push(
        `ProofEventLog row for sequence ${prevSeq} not found`
      );
    }

    if (lastRow && prevRow) {
      console.log(
        `      seq ${prevSeq}: type=${prevRow.type}  hash=${prevRow.eventHash.slice(0, 8)}...`
      );
      console.log(
        `      seq ${lastSeq}: type=${lastRow.type}  hash=${lastRow.eventHash.slice(0, 8)}...`
      );

      // Last event must chain to previous event
      if (lastRow.prevEventHash !== prevRow.eventHash) {
        failures.push(
          `Seq ${lastSeq} prevEventHash (${lastRow.prevEventHash.slice(0, 8)}...) != seq ${prevSeq} eventHash (${prevRow.eventHash.slice(0, 8)}...)`
        );
      } else {
        console.log(`      Seq ${prevSeq}→${lastSeq} linkage OK`);
      }

      // Since lastSeq >= 2, the last event's prevEventHash must not be GENESIS
      if (lastRow.prevEventHash === GENESIS) {
        failures.push(
          `Seq ${lastSeq} has GENESIS prevEventHash — chain broken`
        );
      }
    } else if (lastRow) {
      // prevRow missing but lastRow exists — print what we have
      console.log(
        `      seq ${lastSeq}: type=${lastRow.type}  hash=${lastRow.eventHash.slice(0, 8)}...`
      );
    }

    // ── C) Bounded chain integrity scan via lag() ─────────
    // Scan only the recent window (last 50 sequences) to avoid
    // touching legacy data from before per-strategy chaining.
    const startSeq = Math.max(1, lastSeq - 50);
    console.log(
      `\n  [C] Chain integrity scan (seq ${startSeq}..${lastSeq})...`
    );
    const breakResult = await client.query(
      `SELECT sequence, "prevEventHash", expected_prev
       FROM (
         SELECT
           sequence,
           "prevEventHash",
           lag("eventHash") OVER (ORDER BY sequence) AS expected_prev
         FROM "ProofEventLog"
         WHERE "strategyId" = $1
           AND sequence BETWEEN $2 AND $3
       ) t
       WHERE sequence > $2
         AND "prevEventHash" IS DISTINCT FROM expected_prev`,
      [STRATEGY_ID, startSeq, lastSeq]
    );

    const breaks = breakResult.rows;
    if (breaks.length > 0) {
      for (const b of breaks) {
        failures.push(
          `Chain break at sequence ${b.sequence}: prevEventHash=${b.prevEventHash?.slice(0, 8)}... expected=${b.expected_prev?.slice(0, 8)}...`
        );
      }
      console.log(`      FAIL: ${breaks.length} break(s) detected`);
    } else {
      console.log("      No breaks detected — chain is intact");
    }
  } catch (err) {
    if (!(err instanceof SkipRemaining)) {
      failures.push(`DB query error: ${err.message}`);
      console.log(`      ERROR: ${err.message}`);
    }
  } finally {
    await client.end().catch(() => {});
  }

  // Summary
  console.log(
    `\n  Proof chain verification: ${failures.length === 0 ? "PASS" : "FAIL"} (${failures.length} failure(s))`
  );
  for (const f of failures) {
    console.log(`    - ${f}`);
  }

  return { failures };
}

// ─── Verdict engine ──────────────────────────────────────

function computeVerdict(publicResult, heartbeatResult, ingestResult, proofChainResult) {
  console.log("\n" + "=".repeat(60));
  console.log("=== VERDICT ===");
  console.log("=".repeat(60));

  const verdicts = [];

  // Public pages
  const pageLabels = ["/", "/p/demo", "/proof/*", "/strategies"];
  const apiLabel = "/api/strategies/public";

  for (const row of publicResult.rows) {
    const total = row.requests || 1;
    const err5xx = row["5xx"] / total;
    const isApi = row.url === apiLabel;
    const label = row.url;

    if (isApi) {
      if (
        err5xx <= 0.005 &&
        row.p95 <= 1200 &&
        row.p50 <= 400 &&
        row["429"] === 0
      ) {
        verdicts.push({ label, verdict: "PASS" });
      } else if (err5xx <= 0.01 && row.p95 <= 2000 && row["429"] === 0) {
        verdicts.push({
          label,
          verdict: "WARN",
          reason: `p50=${row.p50} p95=${row.p95} 5xx=${row["5xx"]}`,
        });
      } else {
        verdicts.push({
          label,
          verdict: "FAIL",
          reason: `p50=${row.p50} p95=${row.p95} 5xx=${row["5xx"]} 429=${row["429"]}`,
        });
      }
    } else if (pageLabels.includes(row.url)) {
      if (
        err5xx <= 0.005 &&
        row.p95 <= 1500 &&
        row.p50 <= 600 &&
        row["429"] === 0
      ) {
        verdicts.push({ label, verdict: "PASS" });
      } else if (err5xx <= 0.01 && row.p95 <= 2500 && row["429"] === 0) {
        verdicts.push({
          label,
          verdict: "WARN",
          reason: `p50=${row.p50} p95=${row.p95} 5xx=${row["5xx"]}`,
        });
      } else {
        verdicts.push({
          label,
          verdict: "FAIL",
          reason: `p50=${row.p50} p95=${row.p95} 5xx=${row["5xx"]} 429=${row["429"]}`,
        });
      }
    }
  }

  // Heartbeat
  if (heartbeatResult) {
    const all200 = heartbeatResult.statusDist[200] === heartbeatResult.results.length;
    const hasAuth = heartbeatResult.statusDist[401] || heartbeatResult.statusDist[403];
    const has5xx = heartbeatResult.statusDist[500] || heartbeatResult.statusDist[502] || heartbeatResult.statusDist[503];
    const spikes = heartbeatResult.results.filter((r) => r.latency > 2000).length;

    if (all200 && heartbeatResult.p95 <= 500) {
      verdicts.push({ label: "heartbeat", verdict: "PASS" });
    } else if (hasAuth || has5xx || spikes >= 3) {
      verdicts.push({
        label: "heartbeat",
        verdict: "FAIL",
        reason: `200=${heartbeatResult.statusDist[200] || 0} p95=${heartbeatResult.p95} auth_err=${!!hasAuth} spikes=${spikes}`,
      });
    } else {
      verdicts.push({
        label: "heartbeat",
        verdict: "WARN",
        reason: `p95=${heartbeatResult.p95}ms`,
      });
    }
  } else {
    verdicts.push({
      label: "heartbeat",
      verdict: "FAIL",
      reason: "SKIPPED (no API key)",
    });
  }

  // Ingest
  if (ingestResult) {
    if (ingestResult.status === 200) {
      verdicts.push({
        label: "ingest",
        verdict: "PASS",
        reason: "200 OK — run SQL queries for monitoring evidence",
      });
    } else {
      verdicts.push({
        label: "ingest",
        verdict: "FAIL",
        reason: `status=${ingestResult.status}`,
      });
    }
  } else {
    verdicts.push({
      label: "ingest",
      verdict: "FAIL",
      reason: "SKIPPED (no API key)",
    });
  }

  // Proof chain — fail-closed: any failure is FAIL, not WARN
  if (proofChainResult) {
    if (proofChainResult.failures.length === 0) {
      verdicts.push({ label: "proof-chain", verdict: "PASS" });
    } else {
      verdicts.push({
        label: "proof-chain",
        verdict: "FAIL",
        reason: `${proofChainResult.failures.length} assertion(s) failed`,
      });
    }
  } else if (ingestResult && ingestResult.status === 200) {
    // Ingest succeeded but proof chain was skipped (no DB URL) — FAIL
    verdicts.push({
      label: "proof-chain",
      verdict: "FAIL",
      reason: "SKIPPED (no DATABASE_URL)",
    });
  }
  // If ingest itself failed/skipped, we don't add a proof-chain verdict
  // (already covered by the ingest FAIL verdict)

  // Print
  for (const v of verdicts) {
    const tag =
      v.verdict === "PASS"
        ? "PASS"
        : v.verdict === "WARN"
          ? "WARN"
          : "FAIL";
    console.log(
      `  [${tag}] ${v.label}${v.reason ? ` — ${v.reason}` : ""}`
    );
  }

  const hasFail = verdicts.some((v) => v.verdict === "FAIL");
  const hasWarn = verdicts.some((v) => v.verdict === "WARN");
  const overall = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";

  console.log(`\n  OVERALL: ${overall}\n`);
  return overall;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("AlgoStudio Production Smoke Test");
  console.log(`Target: ${BASE}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const publicResult = await runPublicPhase();
  const heartbeatResult = await runHeartbeatPhase();
  const ingestResult = await runIngestPhase();
  const proofChainResult = await runProofChainVerification(ingestResult);

  computeVerdict(publicResult, heartbeatResult, ingestResult, proofChainResult);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
