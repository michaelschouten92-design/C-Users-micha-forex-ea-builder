import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProofBundle } from "@/lib/track-record/proof-bundle";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// POST /api/track-record/share/[instanceId] — create a shared proof bundle (Pro+)
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { instanceId } = await params;

  // Check subscription tier (Pro+ only)
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { tier: true },
  });

  if (!subscription || subscription.tier === "FREE") {
    return NextResponse.json(
      { error: "Sharing track records requires a Pro or Elite subscription" },
      { status: 403 }
    );
  }

  // Verify ownership
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  // Check for existing non-expired bundle
  const existing = await prisma.sharedProofBundle.findFirst({
    where: {
      instanceId,
      userId: session.user.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { token: true },
  });

  if (existing) {
    return NextResponse.json({
      token: existing.token,
      shareUrl: `/verify/${existing.token}`,
    });
  }

  // Generate proof bundle
  const bundle = await generateProofBundle(instanceId);

  // Create shared bundle with 30-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const shared = await prisma.sharedProofBundle.create({
    data: {
      instanceId,
      userId: session.user.id,
      bundleJson: JSON.parse(JSON.stringify(bundle)),
      expiresAt,
    },
  });

  return NextResponse.json({
    token: shared.token,
    shareUrl: `/verify/${shared.token}`,
  });
}

// DELETE /api/track-record/share/[instanceId] — revoke shared bundle
export async function DELETE(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { instanceId } = await params;

  // Delete all shared bundles for this instance by this user
  await prisma.sharedProofBundle.deleteMany({
    where: { instanceId, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
