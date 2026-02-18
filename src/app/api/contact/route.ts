import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { sanitizeText } from "@/lib/sanitize";
import { checkContentType, checkBodySize } from "@/lib/validations";
import {
  contactFormRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/turnstile";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required").max(200),
  subject: z.string().max(500).optional().default(""),
  message: z.string().min(1, "Message is required").max(5000),
  captchaToken: z.string().optional(),
});

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

  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();
    const validation = contactSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, subject, message, captchaToken } = validation.data;

    // Verify CAPTCHA (skips if not configured)
    const captchaValid = await verifyCaptcha(captchaToken, ip);
    if (!captchaValid) {
      return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
    }

    await sendContactFormEmail(
      sanitizeText(name.trim()),
      email.trim(),
      sanitizeText(subject.trim()),
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
