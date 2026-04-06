import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/crypto";
import { validateTelegramConfig } from "@/lib/telegram";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { botToken: rawBotToken, chatId } = body;

    let botToken = rawBotToken as string | undefined;

    // If no bot token provided in request, use the stored one
    if (!botToken) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { telegramBotToken: true },
      });
      if (!user?.telegramBotToken) {
        return NextResponse.json(
          { error: "No bot token configured. Save your Telegram settings first." },
          { status: 400 }
        );
      }
      const stored = user.telegramBotToken;
      botToken = isEncrypted(stored) ? (decrypt(stored) ?? undefined) : stored;
    }

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "Bot token and chat ID are required" }, { status: 400 });
    }

    const error = await validateTelegramConfig(botToken, chatId);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Test message sent to Telegram.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
