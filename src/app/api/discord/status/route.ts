import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { features } from "@/lib/env";

export async function GET() {
  if (!features.discordAuth) {
    return NextResponse.json({ enabled: false });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { discordId: true, authProviderId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    enabled: true,
    connected: !!user.discordId,
    discordId: user.discordId,
    isPrimaryLogin: user.authProviderId.startsWith("discord_"),
  });
}
