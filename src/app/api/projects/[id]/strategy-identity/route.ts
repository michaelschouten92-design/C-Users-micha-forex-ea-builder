import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeStrategyFingerprint,
  ensureStrategyIdentity,
  recordStrategyVersion,
} from "@/lib/strategy-identity";

type Props = {
  params: Promise<{ id: string }>;
};

// GET /api/projects/[id]/strategy-identity — get strategy identity + version history
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const identity = await prisma.strategyIdentity.findUnique({
    where: { projectId: id },
    include: {
      versions: {
        orderBy: { versionNo: "desc" },
        include: {
          backtestBaseline: { select: { id: true, createdAt: true } },
          _count: { select: { instances: true } },
        },
      },
    },
  });

  if (!identity) {
    return NextResponse.json({ identity: null });
  }

  return NextResponse.json({ identity });
}

// POST /api/projects/[id]/strategy-identity — create/update strategy identity
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    include: {
      versions: { orderBy: { versionNo: "desc" }, take: 1 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.versions.length === 0) {
    return NextResponse.json({ error: "No build version found" }, { status: 400 });
  }

  const version = project.versions[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildJson = version.buildJson as any;

  const fingerprintResult = computeStrategyFingerprint(buildJson);

  const result = await prisma.$transaction(async (tx) => {
    const identity = await ensureStrategyIdentity(tx, project.id, fingerprintResult.fingerprint);
    const strategyVersion = await recordStrategyVersion(
      tx,
      identity.id,
      version.id,
      fingerprintResult
    );

    return {
      identity,
      version: strategyVersion,
      fingerprint: fingerprintResult,
    };
  });

  return NextResponse.json(result);
}
