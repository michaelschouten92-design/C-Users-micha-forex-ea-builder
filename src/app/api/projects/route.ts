import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectLimit } from "@/lib/plan-limits";
import { createProjectSchema, formatZodErrors } from "@/lib/validations";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// GET /api/projects - List all projects for current user
export async function GET() {
  try {
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
  } catch (error) {
    logger.error({ error }, "Failed to list projects");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
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
    const validation = createProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: session.user.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create project");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
