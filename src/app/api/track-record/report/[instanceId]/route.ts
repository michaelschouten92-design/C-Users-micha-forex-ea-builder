import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProofBundle } from "@/lib/track-record/proof-bundle";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// GET /api/track-record/report/[instanceId] — generate investor-proof report with verification
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { instanceId } = await params;

  // Verify the user owns this instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true, eaName: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  // Parse optional seqNo range from query params
  const fromSeqNo = request.nextUrl.searchParams.get("fromSeqNo");
  const toSeqNo = request.nextUrl.searchParams.get("toSeqNo");

  try {
    const bundle = await generateProofBundle(
      instanceId,
      fromSeqNo ? parseInt(fromSeqNo, 10) : undefined,
      toSeqNo ? parseInt(toSeqNo, 10) : undefined
    );

    const fileName = `proof-bundle-${instance.eaName.replace(/[^a-zA-Z0-9]/g, "_")}.json`;

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Track record report error:", error);
    return NextResponse.json({ error: "Failed to generate proof bundle" }, { status: 500 });
  }
}
