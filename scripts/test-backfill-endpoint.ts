/**
 * Manual test: POST one known LWVB trade to the backfill endpoint and check
 * whether the server accepts it. Isolates "endpoint works" vs "EA filter
 * broken" failure modes.
 *
 * Usage: set env vars then run.
 *   $env:API_KEY="<monitor api key from EA inputs>"
 *   $env:BASE_URL="https://algo-studio.com"   # or http://localhost:3000
 *   npx tsx scripts/test-backfill-endpoint.ts
 */

const BASE_URL = process.env.BASE_URL ?? "https://algo-studio.com";
const API_KEY: string | undefined = process.env.API_KEY;

if (!API_KEY) {
  console.error("Set API_KEY env var to the Monitor EA's X-EA-Key value.");
  process.exit(1);
}
const apiKey: string = API_KEY;

async function main() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    trades: [
      {
        ticket: "999_test_lwvb_1",
        symbol: "XAUUSD",
        type: "BUY",
        openPrice: 2400.0,
        closePrice: 2405.5,
        lots: 0.01,
        profit: 5.5,
        openTime: now - 3600,
        closeTime: now - 60,
        magicNumber: 243421,
        mode: "PAPER",
      },
    ],
  };

  console.log(`POST ${BASE_URL}/api/telemetry/terminal/history-backfill`);
  console.log("payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(`${BASE_URL}/api/telemetry/terminal/history-backfill`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EA-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log(`\nstatus: ${res.status}`);
  console.log(`body: ${text}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
