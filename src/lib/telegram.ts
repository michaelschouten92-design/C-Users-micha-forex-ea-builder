/**
 * Telegram Bot API integration for sending trade alerts.
 * Uses the Telegram Bot HTTP API to deliver messages to a chat.
 */

import { logger } from "./logger";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Send a text message via the Telegram Bot API.
 * Returns true if the message was delivered successfully, false otherwise.
 */
export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  if (!botToken || !chatId) {
    logger.warn("sendTelegramAlert: missing botToken or chatId");
    return false;
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error({ status: response.status, body }, "Telegram API error");
      return false;
    }

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error({ error }, "Failed to send Telegram alert");
    return false;
  }
}

/**
 * Validate that a bot token and chat ID are correct by calling getMe and sending a test message.
 * Returns null on success, or an error message string on failure.
 */
export async function validateTelegramConfig(
  botToken: string,
  chatId: string
): Promise<string | null> {
  if (!botToken) return "Bot token is required";
  if (!chatId) return "Chat ID is required";

  // Validate bot token format (numeric:alphanumeric)
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(botToken)) {
    return "Invalid bot token format. Expected format: 123456789:ABCDefGhIjKlMnOpQrStUvWxYz";
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/getMe`;

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return "Invalid bot token - could not authenticate with Telegram API";
    }

    // Try sending a test message
    const sent = await sendTelegramAlert(
      botToken,
      chatId,
      "AlgoStudio connected successfully. You will receive trade alerts here."
    );

    if (!sent) {
      return "Bot token is valid but could not send to the specified chat ID. Make sure you have started a conversation with the bot.";
    }

    return null;
  } catch {
    return "Could not connect to Telegram API. Please check your network connection.";
  }
}
