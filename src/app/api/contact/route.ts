import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { sanitizeText } from "@/lib/sanitize";
import {
  contactFormRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const log = logger.child({ route: "/api/contact" });

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = await checkRateLimit(contactFormRateLimiter, `contact:${ip}`);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (
      name.length > 200 ||
      email.length > 200 ||
      (subject && subject.length > 500) ||
      message.length > 5000
    ) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    await sendContactFormEmail(
      sanitizeText(name.trim()),
      email.trim(),
      typeof subject === "string" ? sanitizeText(subject.trim()) : "",
      sanitizeText(message.trim())
    );

    log.info({ from: email.substring(0, 3) + "***" }, "Contact form submitted");

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Contact form submission failed");
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
