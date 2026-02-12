"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

type Project = {
  id: string;
  name: string;
  description: string | null;
};

export function ProjectSettings({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ESC key + focus management for delete modal
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDeleteConfirm(false);
    };
    window.addEventListener("keydown", handleKey);
    const cancelBtn = deleteModalRef.current?.querySelector<HTMLButtonElement>("button");
    cancelBtn?.focus();
    return () => window.removeEventListener("keydown", handleKey);
  }, [showDeleteConfirm]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        showError("Failed to update project");
        return;
      }

      setShowEdit(false);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
      });

      if (!res.ok) {
        showError("Failed to delete project");
        return;
      }

      router.push("/app");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) setShowEdit(false);
        }}
        className="text-[#94A3B8] hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-[rgba(79,70,229,0.15)]"
        title="Project settings"
        aria-label="Project settings"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50">
          {showEdit ? (
            <div className="p-3 space-y-3">
              <div>
                <label
                  htmlFor="edit-project-name"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1"
                >
                  Name
                </label>
                <input
                  id="edit-project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all duration-200"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-project-desc"
                  className="block text-xs font-medium text-[#CBD5E1] mb-1"
                >
                  Description
                </label>
                <textarea
                  id="edit-project-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all duration-200"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="bg-[#4F46E5] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowEdit(false);
                    setName(project.name);
                    setDescription(project.description || "");
                  }}
                  className="text-[#94A3B8] px-3 py-1.5 rounded-lg text-xs hover:text-white transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="py-1">
              <button
                onClick={() => setShowEdit(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-[#CBD5E1] hover:bg-[rgba(79,70,229,0.15)] hover:text-white flex items-center gap-2.5 transition-all duration-200"
              >
                <svg
                  className="w-4 h-4 text-[#64748B]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                  />
                </svg>
                Edit Project
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setShowDeleteConfirm(true);
                }}
                disabled={deleting}
                className="w-full text-left px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Delete Project
              </button>
            </div>
          )}
        </div>
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
            aria-labelledby="settings-delete-title"
            aria-describedby="settings-delete-desc"
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
              id="settings-delete-title"
              className="text-lg font-semibold text-white text-center mb-2"
            >
              Delete Project
            </h3>
            <p id="settings-delete-desc" className="text-sm text-[#94A3B8] text-center mb-6">
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
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
