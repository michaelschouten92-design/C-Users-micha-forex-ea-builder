import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/crypto";
import { sendTelegramAlert } from "@/lib/telegram";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { chatId: providedChatId } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { telegramBotToken: true, telegramChatId: true },
    });

    const chatId = providedChatId ?? user?.telegramChatId;
    if (!chatId) {
      return NextResponse.json(
        { error: "Telegram is not connected. Connect it first." },
        { status: 400 }
      );
    }

    // Use central bot token; fall back to user's own bot (legacy)
    const centralToken = process.env.ALGO_TELEGRAM_BOT_TOKEN;
    const rawUserToken = user?.telegramBotToken;
    const userToken = rawUserToken
      ? isEncrypted(rawUserToken)
        ? (decrypt(rawUserToken) ?? null)
        : rawUserToken
      : null;
    const botToken = centralToken || userToken;

    if (!botToken) {
      return NextResponse.json({ error: "No bot token configured." }, { status: 500 });
    }

    const sent = await sendTelegramAlert(
      botToken,
      chatId,
      "Algo Studio test message — your alerts are working!"
    );

    if (!sent) {
      return NextResponse.json(
        { error: "Could not deliver the message. The chat may no longer be active." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test message sent to Telegram.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
