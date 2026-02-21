import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPrivateUrl } from "@/app/api/account/webhook/route";

const WEBHOOK_TEST_TIMEOUT_MS = 10000;

/**
 * POST /api/webhook/test
 * Sends a test payload to the user's webhook URL to verify connectivity.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { webhookUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const webhookUrl = body.webhookUrl?.trim();
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    return NextResponse.json({ error: "Invalid webhook URL format" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Webhook URL must use HTTPS" }, { status: 400 });
  }

  if (isPrivateUrl(webhookUrl)) {
    return NextResponse.json(
      { error: "Webhook URL must not point to a private or internal address" },
      { status: 400 }
    );
  }

  // Send test payload
  const testPayload = {
    type: "TEST",
    source: "AlgoStudio",
    timestamp: new Date().toISOString(),
    message: "This is a test webhook from AlgoStudio. Your webhook is configured correctly.",
    data: {
      userId: session.user.id,
      testId: crypto.randomUUID(),
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TEST_TIMEOUT_MS);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok || response.status < 400) {
      return NextResponse.json({
        success: true,
        message: `Webhook responded with status ${response.status}. Connection verified.`,
        statusCode: response.status,
      });
    }

    return NextResponse.json({
      success: false,
      error: `Webhook returned status ${response.status}. Check your endpoint configuration.`,
      statusCode: response.status,
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    const message = isTimeout
      ? `Webhook did not respond within ${WEBHOOK_TEST_TIMEOUT_MS / 1000} seconds. Check the URL and ensure the server is running.`
      : "Failed to reach webhook URL. Ensure the server is running and accessible.";

    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
