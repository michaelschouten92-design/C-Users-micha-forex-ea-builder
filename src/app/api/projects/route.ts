import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectLimit } from "@/lib/plan-limits";
import { NextResponse } from "next/server";

// GET /api/projects - List all projects for current user
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { versions: true },
      },
    },
  });

  return NextResponse.json(projects);
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check project limit
  const projectLimit = await checkProjectLimit(session.user.id);
  if (!projectLimit.allowed) {
    return NextResponse.json(
      {
        error: "Project limit reached",
        details: `You've reached the maximum of ${projectLimit.max} projects on your current plan. Upgrade to Pro for unlimited projects.`,
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
