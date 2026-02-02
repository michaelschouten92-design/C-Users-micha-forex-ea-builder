import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMQL5Code } from "@/lib/mql5-generator";
import { checkExportLimit, canExportMQL5 } from "@/lib/plan-limits";
import type { BuildJsonSchema } from "@/types/builder";

type Props = {
  params: Promise<{ id: string }>;
};

// POST /api/projects/[id]/export - Generate MQL5 code
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { versionId, exportType = "MQ5" } = body as {
      versionId?: string;
      exportType?: "MQ5" | "EX5";
    };

    // Check export limits
    const exportLimit = await checkExportLimit(session.user.id);
    if (!exportLimit.allowed) {
      return NextResponse.json(
        {
          error: "Export limit reached",
          details: `You've used ${exportLimit.current} of ${exportLimit.max} exports this month. Upgrade to Pro for unlimited exports.`,
        },
        { status: 403 }
      );
    }

    // Check MQL5 export permission
    if (exportType === "MQ5") {
      const canExport = await canExportMQL5(session.user.id);
      if (!canExport) {
        return NextResponse.json(
          {
            error: "MQL5 export not available",
            details: "MQL5 source code export is only available on the Pro plan. Upgrade to access source code.",
          },
          { status: 403 }
        );
      }
    }

    // Fetch the project with the specified version
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        versions: versionId
          ? { where: { id: versionId } }
          : { orderBy: { versionNo: "desc" }, take: 1 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.versions.length === 0) {
      return NextResponse.json(
        { error: "No version found. Please save your strategy first." },
        { status: 400 }
      );
    }

    const version = project.versions[0];
    const buildJson = version.buildJson as unknown as BuildJsonSchema;

    // Validate the build JSON has necessary components
    const validationErrors = validateBuildJson(buildJson);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Strategy validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Generate MQL5 code
    const mql5Code = generateMQL5Code(buildJson, project.name);

    // Create export job record
    const exportJob = await prisma.exportJob.create({
      data: {
        userId: session.user.id,
        projectId: project.id,
        buildVersionId: version.id,
        exportType: "MQ5",
        status: "DONE",
        outputName: `${sanitizeFileName(project.name)}.mq5`,
      },
    });

    return NextResponse.json({
      success: true,
      exportId: exportJob.id,
      fileName: exportJob.outputName,
      code: mql5Code,
      versionNo: version.versionNo,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate MQL5 code" },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/export - Get export history
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exports = await prisma.exportJob.findMany({
      where: {
        projectId: id,
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        buildVersion: {
          select: { versionNo: true },
        },
      },
    });

    return NextResponse.json(exports);
  } catch (error) {
    console.error("Error fetching exports:", error);
    return NextResponse.json(
      { error: "Failed to fetch export history" },
      { status: 500 }
    );
  }
}

function validateBuildJson(buildJson: BuildJsonSchema): string[] {
  const errors: string[] = [];

  if (!buildJson.nodes || buildJson.nodes.length === 0) {
    errors.push("No nodes found. Add at least one indicator and entry condition.");
    return errors;
  }

  // Check by node type OR by data properties (for flexibility)
  const indicatorTypes = ["moving-average", "rsi", "macd", "bollinger-bands", "atr", "adx"];
  const hasIndicator = buildJson.nodes.some(
    (n) => indicatorTypes.includes(n.type as string) || (n.data && "indicatorType" in n.data)
  );

  const hasEntryCondition = buildJson.nodes.some(
    (n) =>
      n.type === "entry-condition" ||
      (n.data && "conditionType" in n.data && n.data.conditionType === "entry") ||
      (n.data && n.data.category === "condition" && n.data.direction)  // Entry conditions have direction
  );

  if (!hasIndicator) {
    errors.push("No indicator nodes found. Add at least one indicator (MA, RSI, MACD, or Bollinger Bands).");
  }

  if (!hasEntryCondition) {
    // Provide more detail about what nodes we found
    const nodeTypes = buildJson.nodes.map(n => n.type || "unknown").join(", ");
    const nodeCategories = buildJson.nodes.map(n => n.data?.category || "no-category").join(", ");
    errors.push(`No entry condition found. Add an Entry Condition node to define when to open trades. (Found ${buildJson.nodes.length} nodes: types=[${nodeTypes}], categories=[${nodeCategories}])`);
  }

  // Check if entry condition is connected to any indicator
  if (hasEntryCondition && hasIndicator) {
    const entryNode = buildJson.nodes.find(
      (n) =>
        n.type === "entry-condition" ||
        ("conditionType" in n.data && n.data.conditionType === "entry")
    );
    if (entryNode) {
      const hasConnection = buildJson.edges.some((e) => e.target === entryNode.id);
      if (!hasConnection) {
        errors.push("Entry condition is not connected to any indicator. Connect an indicator to define the entry logic.");
      }
    }
  }

  return errors;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}
