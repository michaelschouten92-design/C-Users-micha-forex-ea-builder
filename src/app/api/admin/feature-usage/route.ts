import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/feature-usage - Node type usage analytics
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    // Get latest build versions (one per project, capped at 5000 for performance)
    const builds = await prisma.buildVersion.findMany({
      distinct: ["projectId"],
      orderBy: { versionNo: "desc" },
      select: { buildJson: true },
      take: 5000,
    });

    // Parse nodes and count types
    const typeCounts: Record<string, number> = {};

    for (const build of builds) {
      try {
        const json = build.buildJson as {
          nodes?: Array<{ type?: string; data?: { nodeType?: string; label?: string } }>;
        };
        if (json?.nodes && Array.isArray(json.nodes)) {
          for (const node of json.nodes) {
            const nodeType = node.data?.nodeType || node.data?.label || node.type || "unknown";
            typeCounts[nodeType] = (typeCounts[nodeType] || 0) + 1;
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // Sort by count descending
    const sorted = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([type, count]) => ({ type, count }));

    return NextResponse.json(
      { data: sorted },
      { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" } }
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch feature usage");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
