import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendTelegramAlert } from "@/lib/telegram";

const log = logger.child({ module: "telegram-webhook" });

/**
 * Telegram Bot API webhook handler.
 * Receives Update objects from Telegram when users interact with the bot.
 * Processes /start {linkToken} commands to link Telegram accounts.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify webhook secret to prevent spoofed requests
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const botToken = process.env.ALGO_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    log.error("ALGO_TELEGRAM_BOT_TOKEN not configured");
    return NextResponse.json({ ok: true }); // 200 so Telegram doesn't retry
  }

  let body: TelegramUpdate;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = body.message;
  if (!message?.text || !message.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Handle /start {linkToken}
  if (text.startsWith("/start")) {
    const linkToken = text.replace("/start", "").trim();

    if (!linkToken) {
      await sendTelegramAlert(
        botToken,
        chatId,
        'Welcome to Algo Studio! To connect your account, use the "Connect Telegram" button in your Algo Studio settings.'
      );
      return NextResponse.json({ ok: true });
    }

    // Find user with this link token
    const user = await prisma.user.findFirst({
      where: {
        telegramLinkToken: linkToken,
        telegramLinkExpiresAt: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      await sendTelegramAlert(
        botToken,
        chatId,
        "This link has expired or is invalid. Please generate a new one from your Algo Studio settings."
      );
      return NextResponse.json({ ok: true });
    }

    // Link the Telegram account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId,
        telegramLinkToken: null,
        telegramLinkExpiresAt: null,
      },
    });

    log.info({ userId: user.id }, "Telegram account linked");

    await sendTelegramAlert(
      botToken,
      chatId,
      "Connected! You'll receive strategy alerts here.\n\nManage your alerts at https://algo-studio.com/app/settings"
    );

    return NextResponse.json({ ok: true });
  }

  // Unknown command
  await sendTelegramAlert(
    botToken,
    chatId,
    "I only process alerts from Algo Studio. Manage your settings at https://algo-studio.com/app/settings"
  );

  return NextResponse.json({ ok: true });
}

// Telegram Update type (subset of fields we need)
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    text?: string;
    from?: { id: number; first_name?: string };
  };
}
