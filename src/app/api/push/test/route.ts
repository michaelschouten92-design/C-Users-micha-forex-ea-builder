import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushNotification } from "@/lib/push";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sendPushNotification(session.user.id, {
    title: "Algo Studio — Test Notification",
    body: "Push notifications are working correctly.",
    url: "/app/settings",
    tag: "test-notification",
  });

  return NextResponse.json({ success: true });
}
