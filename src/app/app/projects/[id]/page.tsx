import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ProjectSettings } from "./project-settings";
import { LazyStrategyBuilder } from "./builder/lazy-strategy-builder";
import { CollapsibleSidebar } from "./collapsible-sidebar";
import { getUserPlanLimits } from "@/lib/plan-limits";
import type { BuildJsonSchema } from "@/types/builder";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      versions: {
        orderBy: { versionNo: "desc" },
        take: 5,
      },
      _count: {
        select: { versions: true, exports: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Get the latest version with full buildJson for the builder
  const latestVersion = project.versions[0]
    ? {
        id: project.versions[0].id,
        versionNo: project.versions[0].versionNo,
        buildJson: project.versions[0].buildJson as unknown as BuildJsonSchema,
      }
    : null;

  // Get user's plan limits for export permissions
  const planLimits = await getUserPlanLimits(session.user.id);

  return (
    <div className="h-screen flex flex-col">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] flex-shrink-0 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/app"
                className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-white">{project.name}</h1>
                <span className="text-xs text-[#A78BFA] font-medium">AlgoStudio</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]"></span>
                {project._count.versions} versions
              </span>
              <span className="text-[rgba(79,70,229,0.4)]">|</span>
              <span>{project._count.exports} exports</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex min-h-0">
        {/* Main content area - Strategy Builder */}
        <div className="flex-1 min-w-0">
          <LazyStrategyBuilder
            projectId={project.id}
            latestVersion={latestVersion}
            canExportMQL5={planLimits.limits.canExportMQL5}
            isPro={planLimits.limits.canUseTradeManagement}
          />
        </div>

        {/* Sidebar */}
        <CollapsibleSidebar projectName={project.name}>
          {/* Project Info */}
          <div className="border-b border-[rgba(79,70,229,0.2)] pb-4">
            <h3 className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
              Project Info
            </h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-xs text-[#64748B]">Created</dt>
                <dd className="text-xs text-[#CBD5E1]">
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Project Settings */}
          <ProjectSettings project={project} />

          {/* Recent Versions */}
          {project.versions.length > 0 && (
            <div className="border-t border-[rgba(79,70,229,0.2)] pt-4">
              <h3 className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
                Recent Versions
              </h3>
              <ul className="space-y-1">
                {project.versions.map((version, idx) => (
                  <li
                    key={version.id}
                    className={`text-xs flex justify-between py-2 px-3 rounded-lg transition-all duration-200 ${
                      idx === 0
                        ? "bg-[rgba(34,211,238,0.1)] text-[#22D3EE] border border-[rgba(34,211,238,0.2)]"
                        : "text-[#CBD5E1] hover:bg-[rgba(79,70,229,0.1)]"
                    }`}
                  >
                    <span className="font-medium">v{version.versionNo}</span>
                    <span className={idx === 0 ? "text-[#22D3EE]" : "text-[#64748B]"}>
                      {new Date(version.createdAt).toLocaleDateString("en-US")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleSidebar>
      </main>
    </div>
  );
}
