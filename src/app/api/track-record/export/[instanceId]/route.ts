import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { generateVerifiedExport } from "@/lib/track-record/export";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// GET /api/track-record/export/[instanceId] — download verified track record JSON
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

  try {
    const record = await generateVerifiedExport(instanceId);

    // Return as downloadable JSON (filename max 64 chars to prevent header injection)
    const sanitizedName = instance.eaName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
    const fileName = `track-record-${sanitizedName}.json`;

    return new NextResponse(JSON.stringify(record, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Track record export error"
    );
    return NextResponse.json({ error: "Failed to generate track record export" }, { status: 500 });
  }
}
