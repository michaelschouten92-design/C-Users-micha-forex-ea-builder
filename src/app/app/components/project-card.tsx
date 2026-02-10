"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  // ESC key + focus management for delete confirmation modal
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDeleteConfirm(false);
    };
    window.addEventListener("keydown", handleKey);
    // Focus the cancel button when modal opens
    const cancelBtn = deleteModalRef.current?.querySelector<HTMLButtonElement>("button");
    cancelBtn?.focus();
    return () => window.removeEventListener("keydown", handleKey);
  }, [showDeleteConfirm]);

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, {
        method: "POST",
        headers: getCsrfHeaders(),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.message || data.details || "Failed to duplicate project");
      }
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      setDuplicating(false);
      setShowMenu(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.message || data.details || "Failed to delete project");
      }
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
      setShowMenu(false);
      setShowDeleteConfirm(false);
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
          <h3 className="font-semibold text-white truncate flex-1">{project.name}</h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            aria-label="Project options"
            className="text-[#64748B] hover:text-[#CBD5E1] p-2 -mr-2 -mt-1 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {project.description && (
          <p className="text-sm text-[#94A3B8] mt-1 line-clamp-2">{project.description}</p>
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
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div
            role="menu"
            className="absolute right-4 mt-[-60px] bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.4)] z-20 py-1 min-w-[120px]"
          >
            <button
              role="menuitem"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="w-full text-left px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[rgba(79,70,229,0.1)] disabled:opacity-50 transition-colors duration-200"
            >
              {duplicating ? "Duplicating..." : "Duplicate"}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setShowMenu(false);
                setShowDeleteConfirm(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors duration-200"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            ref={deleteModalRef}
            role="alertdialog"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-desc"
            className="bg-[#1A0626] border border-[rgba(239,68,68,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[#EF4444]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3
              id="delete-modal-title"
              className="text-lg font-semibold text-white text-center mb-2"
            >
              Delete Project
            </h3>
            <p id="delete-modal-desc" className="text-sm text-[#94A3B8] text-center mb-6">
              Are you sure you want to delete{" "}
              <span className="text-white font-medium">&ldquo;{project.name}&rdquo;</span>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#CBD5E1] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
