import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { decrypt, isEncrypted } from "@/lib/crypto";

// GET /api/auth/suspended-info - Get suspension reason for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ suspendedReason: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { suspendedReason: true },
  });

  // Decrypt if encrypted (backward-compatible with plaintext values)
  let reason = user?.suspendedReason ?? null;
  if (reason && isEncrypted(reason)) {
    reason = decrypt(reason);
  }

  return NextResponse.json({ suspendedReason: reason });
}
