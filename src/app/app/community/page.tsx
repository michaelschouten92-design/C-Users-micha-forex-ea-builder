import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UseTemplateButton } from "./use-template-button";

/**
 * Mask an email address for public display.
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***@***.com";
  const visible = localPart.substring(0, 3);
  return `${visible}***@${domain}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function CommunityPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const templates = await prisma.userTemplate.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors"
              >
                AlgoStudio
              </Link>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Community
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#CBD5E1] hidden sm:inline">{session.user.email}</span>
              <Link
                href="/app"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/app/settings"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Settings
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Community Templates</h2>
          <p className="mt-2 text-[#94A3B8]">
            Browse strategies shared by the community. Use any template to create a new project.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-[#4F46E5]/40 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No community templates yet</h3>
            <p className="text-[#94A3B8] max-w-md mx-auto">
              Be the first to share a strategy! You can make your templates public from the template
              settings in your project.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 flex flex-col hover:border-[rgba(79,70,229,0.4)] transition-colors duration-200"
              >
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                  {template.name}
                </h3>
                {template.description && (
                  <p className="text-sm text-[#94A3B8] mb-4 line-clamp-3">{template.description}</p>
                )}
                <div className="mt-auto pt-4 border-t border-[rgba(79,70,229,0.15)]">
                  <div className="flex items-center justify-between text-xs text-[#7C8DB0] mb-3">
                    <span>{maskEmail(template.user.email)}</span>
                    <span>{formatDate(template.createdAt)}</span>
                  </div>
                  <UseTemplateButton
                    templateName={template.name}
                    buildJson={template.buildJson as object}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
