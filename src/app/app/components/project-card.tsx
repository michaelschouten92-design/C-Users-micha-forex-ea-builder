"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    versions: number;
  };
};

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  }

  const updatedAt = new Date(project.updatedAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="relative bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-all duration-200 hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)]">
      <Link href={`/app/projects/${project.id}`} className="block p-6">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white truncate flex-1">
            {project.name}
          </h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            className="text-[#64748B] hover:text-[#CBD5E1] p-1 -mr-2 -mt-1 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {project.description && (
          <p className="text-sm text-[#94A3B8] mt-1 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]"></span>
            {project._count.versions} versions
          </span>
          <span>Updated: {updatedAt}</span>
        </div>
      </Link>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 mt-[-60px] bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.4)] z-20 py-1 min-w-[120px]">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full text-left px-4 py-2 text-sm text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] disabled:opacity-50 transition-colors duration-200"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
