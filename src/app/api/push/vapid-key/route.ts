import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  if (!env.VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: "Push notifications not configured" }, { status: 503 });
  }

  return NextResponse.json({ publicKey: env.VAPID_PUBLIC_KEY });
}
