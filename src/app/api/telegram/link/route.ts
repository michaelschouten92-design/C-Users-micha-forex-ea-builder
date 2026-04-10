import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * POST: Generate a one-time Telegram linking token.
 * Returns the deep link URL that opens the bot in Telegram.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tier gate: Telegram alerts require a paid subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { tier: true },
  });
  if (!subscription || subscription.tier === "FREE") {
    return NextResponse.json(
      { error: "Telegram alerts require a paid subscription. Upgrade to enable." },
      { status: 403 }
    );
  }

  const botUsername = process.env.ALGO_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return NextResponse.json({ error: "Telegram bot not configured" }, { status: 503 });
  }

  const linkToken = randomUUID();
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramLinkToken: linkToken,
      telegramLinkExpiresAt: expiresAt,
    },
  });

  const deepLink = `https://t.me/${botUsername}?start=${linkToken}`;

  return NextResponse.json({ deepLink, expiresAt: expiresAt.toISOString() });
}

/**
 * GET: Check if Telegram linking has completed.
 * Returns connected: true/false and the chat ID if connected.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true, telegramLinkToken: true },
  });

  return NextResponse.json({
    connected: !!user?.telegramChatId,
    chatId: user?.telegramChatId ?? null,
    pending: !!user?.telegramLinkToken,
  });
}

/**
 * DELETE: Disconnect Telegram (remove chat ID).
 */
export async function DELETE(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramChatId: null,
      telegramLinkToken: null,
      telegramLinkExpiresAt: null,
    },
  });

  return NextResponse.json({ success: true });
}
