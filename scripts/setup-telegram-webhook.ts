/**
 * Register (or remove) the Telegram Bot API webhook for the Algo Studio bot.
 *
 * Usage:
 *   npx tsx scripts/setup-telegram-webhook.ts                # register webhook
 *   npx tsx scripts/setup-telegram-webhook.ts --delete       # remove webhook
 *
 * Required env vars (set in .env or pass inline):
 *   ALGO_TELEGRAM_BOT_TOKEN     — Bot token from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET     — Random secret for verifying inbound updates
 *   NEXT_PUBLIC_APP_URL         — Your app's public URL (e.g. https://algo-studio.com)
 */
export {}; // force module scope so top-level identifiers don't collide with other scripts

const BOT_TOKEN = process.env.ALGO_TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://algo-studio.com";

if (!BOT_TOKEN) {
  console.error("Missing ALGO_TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function deleteWebhook() {
  const res = await fetch(`${API}/deleteWebhook`);
  const data = await res.json();
  console.log("deleteWebhook:", data);
}

async function setWebhook() {
  if (!WEBHOOK_SECRET) {
    console.error("Missing TELEGRAM_WEBHOOK_SECRET — generate one with: openssl rand -hex 32");
    process.exit(1);
  }

  const webhookUrl = `${APP_URL}/api/telegram/webhook`;

  const res = await fetch(`${API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ["message"],
    }),
  });
  const data = await res.json();
  console.log("setWebhook:", data);

  if (data.ok) {
    console.log(`\nWebhook registered: ${webhookUrl}`);
    console.log("Secret header: x-telegram-bot-api-secret-token");
  }
}

async function getWebhookInfo() {
  const res = await fetch(`${API}/getWebhookInfo`);
  const data = await res.json();
  console.log("\nCurrent webhook info:", JSON.stringify(data.result, null, 2));
}

async function main() {
  const isDelete = process.argv.includes("--delete");

  if (isDelete) {
    await deleteWebhook();
  } else {
    await setWebhook();
  }

  await getWebhookInfo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
