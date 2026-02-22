import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { z } from "zod";

/**
 * Check if a URL hostname resolves to a private/internal IP range.
 * Blocks SSRF attacks by rejecting URLs targeting internal infrastructure.
 */
export function isPrivateUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true; // Reject unparseable URLs
  }

  // Only allow http:// and https:// schemes
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost variants
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return true;
  }

  // Reject IPs in private/internal ranges
  // Check if hostname looks like an IPv4 address
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);

    // 0.0.0.0/8
    if (a === 0) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 127.0.0.0/8 (localhost)
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (private)
    if (a === 192 && b === 168) return true;
  }

  // Reject IPv6 private/loopback in bracket notation
  if (hostname.startsWith("[")) {
    const ipv6 = hostname.slice(1, -1).toLowerCase();
    if (
      ipv6 === "::1" ||
      ipv6 === "::0" ||
      ipv6.startsWith("fc") ||
      ipv6.startsWith("fd") ||
      ipv6.startsWith("fe80")
    ) {
      return true;
    }
  }

  return false;
}

const webhookUpdateSchema = z.object({
  webhookUrl: z
    .string()
    .url("Must be a valid URL")
    .max(2048, "URL must be 2048 characters or less")
    .nullable()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      return val.trim();
    })
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        // Only allow http:// and https:// schemes
        try {
          const parsed = new URL(val);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Webhook URL must use http:// or https://" }
    )
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        return !isPrivateUrl(val);
      },
      { message: "Webhook URL must not point to a private or internal address" }
    ),
  telegramBotToken: z
    .string()
    .max(256, "Bot token too long")
    .nullable()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      return val.trim();
    }),
  telegramChatId: z
    .string()
    .max(64, "Chat ID too long")
    .nullable()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      return val.trim();
    }),
});

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { webhookUrl: true, telegramChatId: true },
  });

  return NextResponse.json({
    webhookUrl: user?.webhookUrl ?? null,
    telegramChatId: user?.telegramChatId ?? null,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleUpdate(request);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return handleUpdate(request);
}

async function handleUpdate(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = webhookUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const updateData: {
      webhookUrl?: string | null;
      telegramBotToken?: string | null;
      telegramChatId?: string | null;
    } = {};
    if (parsed.data.webhookUrl !== undefined) {
      updateData.webhookUrl = parsed.data.webhookUrl ?? null;
    }
    if (parsed.data.telegramBotToken !== undefined) {
      // Encrypt the bot token before storing in the database
      const rawToken = parsed.data.telegramBotToken ?? null;
      updateData.telegramBotToken = rawToken ? encrypt(rawToken) : null;
    }
    if (parsed.data.telegramChatId !== undefined) {
      updateData.telegramChatId = parsed.data.telegramChatId ?? null;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { webhookUrl: true, telegramChatId: true },
    });

    return NextResponse.json({
      success: true,
      webhookUrl: updated.webhookUrl,
      telegramChatId: updated.telegramChatId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
