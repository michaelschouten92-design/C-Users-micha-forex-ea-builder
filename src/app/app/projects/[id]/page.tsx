import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ProjectSettings } from "./project-settings";
import { ShareButton } from "./share-button";
import { LazyStrategyBuilder } from "./builder/lazy-strategy-builder";
import { getUserPlanLimits } from "@/lib/plan-limits";
import { migrateProjectData } from "@/lib/migrations";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: session.user.id,
      deletedAt: null,
    },
    include: {
      versions: {
        orderBy: { versionNo: "desc" },
        take: 1,
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
        buildJson: migrateProjectData(project.versions[0].buildJson),
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
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/app"
                  className="hidden sm:inline text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Dashboard
                </Link>
                <span className="hidden sm:inline text-[#64748B]/50 text-xs">/</span>
                <h1
                  className="text-lg font-bold text-white truncate max-w-[200px] sm:max-w-none"
                  title={project.name}
                >
                  {project.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#64748B]">
              {/* Workflow Stepper - full on md+, compact on mobile */}
              <div className="hidden md:flex items-center gap-1 mr-2">
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-[#4F46E5]/20 text-[#A78BFA] text-[10px] font-semibold">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[8px]">
                    1
                  </span>
                  Build
                </span>
                <svg
                  className="w-3 h-3 text-[#4F46E5]/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <Link
                  href="/app/monitor"
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#7C8DB0] hover:text-[#A78BFA] hover:bg-[#4F46E5]/10 transition-all"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-[#7C8DB0]/40 flex items-center justify-center text-[8px]">
                    2
                  </span>
                  Deploy
                </Link>
                <svg
                  className="w-3 h-3 text-[#4F46E5]/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <Link
                  href="/app/journal"
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#7C8DB0] hover:text-[#A78BFA] hover:bg-[#4F46E5]/10 transition-all"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-[#7C8DB0]/40 flex items-center justify-center text-[8px]">
                    3
                  </span>
                  Monitor
                </Link>
              </div>
              {/* Mobile stepper - dots only */}
              <div className="flex md:hidden items-center gap-1.5 mr-2">
                <span className="w-2 h-2 rounded-full bg-[#4F46E5]" title="Build (current)" />
                <Link
                  href="/app/monitor"
                  className="w-2 h-2 rounded-full bg-[#7C8DB0]/40 hover:bg-[#A78BFA] transition-colors"
                  title="Deploy"
                />
                <Link
                  href="/app/journal"
                  className="w-2 h-2 rounded-full bg-[#7C8DB0]/40 hover:bg-[#A78BFA] transition-colors"
                  title="Monitor"
                />
              </div>
              <span className="hidden md:inline text-[rgba(79,70,229,0.4)]">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]"></span>
                {project._count.versions} versions
              </span>
              <span className="text-[rgba(79,70,229,0.4)]">|</span>
              <span>{project._count.exports} exports</span>
              <span className="text-[rgba(79,70,229,0.4)]">|</span>
              <ShareButton projectId={project.id} />
              <span className="text-[rgba(79,70,229,0.4)]">|</span>
              <ProjectSettings project={project} />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 min-h-0">
        <LazyStrategyBuilder
          projectId={project.id}
          latestVersion={latestVersion}
          canExportMQL5={planLimits.limits.canExportMQL5}
          tier={planLimits.tier}
        />
      </main>
    </div>
  );
}
