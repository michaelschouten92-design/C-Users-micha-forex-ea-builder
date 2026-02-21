"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError, showSuccess } from "@/lib/toast";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    versions: number;
  };
  versions?: { buildJson: unknown }[];
  tags?: { tag: string }[];
};

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [tags, setTags] = useState<string[]>(project.tags?.map((t) => t.tag) ?? []);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const duplicateModalRef = useRef<HTMLDivElement>(null);

  // ESC key + focus management for delete confirmation modal
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

  // ESC key + focus management for duplicate confirmation modal
  useEffect(() => {
    if (!showDuplicateConfirm) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDuplicateConfirm(false);
    };
    window.addEventListener("keydown", handleKey);
    const cancelBtn = duplicateModalRef.current?.querySelector<HTMLButtonElement>("button");
    cancelBtn?.focus();
    return () => window.removeEventListener("keydown", handleKey);
  }, [showDuplicateConfirm]);

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, {
        method: "POST",
        headers: getCsrfHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        showSuccess("Project duplicated");
        router.push(`/app/projects/${data.id}`);
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
        showSuccess("Project deleted");
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

  async function saveTags(newTags: string[]) {
    setSavingTags(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ tags: newTags }),
      });
      if (res.ok) {
        setTags(newTags);
        showSuccess("Tags saved");
      } else {
        showError("Failed to save tags");
      }
    } catch {
      showError("Failed to save tags");
    } finally {
      setSavingTags(false);
    }
  }

  function handleAddTag() {
    const trimmed = tagInput.trim().toLowerCase().slice(0, 20);
    if (!trimmed || tags.length >= 5 || tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    const newTags = [...tags, trimmed];
    setTagInput("");
    saveTags(newTags);
  }

  function handleRemoveTag(tag: string) {
    const newTags = tags.filter((t) => t !== tag);
    saveTags(newTags);
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
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate" title={project.name}>
              {project.name}
            </h3>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.15)] text-[#A78BFA] border border-[rgba(79,70,229,0.2)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            aria-label="Project options"
            className="text-[#7C8DB0] hover:text-[#CBD5E1] p-2 -mr-2 -mt-1 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {project.description && (
          <p className="text-sm text-[#94A3B8] mt-1 line-clamp-2">{project.description}</p>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-[#7C8DB0]">
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
              onClick={() => {
                setShowMenu(false);
                setShowDuplicateConfirm(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[rgba(79,70,229,0.1)] transition-colors duration-200"
            >
              Duplicate
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setShowMenu(false);
                setShowTagEditor(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[rgba(79,70,229,0.1)] transition-colors duration-200"
            >
              Edit Tags
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

      {/* Tag Editor Modal */}
      {showTagEditor && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowTagEditor(false)}
        >
          <div
            className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Edit Tags</h3>
            <div className="flex flex-wrap gap-1.5 mb-4 min-h-[32px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[rgba(79,70,229,0.15)] text-[#A78BFA] border border-[rgba(79,70,229,0.2)]"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    disabled={savingTags}
                    className="hover:text-white transition-colors ml-0.5"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-xs text-[#7C8DB0]">No tags yet</span>}
            </div>
            {tags.length < 5 && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  maxLength={20}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || savingTags}
                  className="px-3 py-2 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            )}
            <p className="text-[10px] text-[#7C8DB0] mb-4">
              Max 5 tags, 20 characters each. Press Enter to add.
            </p>
            <button
              onClick={() => setShowTagEditor(false)}
              className="w-full px-4 py-2.5 text-sm font-medium text-[#CBD5E1] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDuplicateConfirm(false)}
        >
          <div
            ref={duplicateModalRef}
            role="alertdialog"
            aria-labelledby="duplicate-modal-title"
            aria-describedby="duplicate-modal-desc"
            className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[rgba(79,70,229,0.15)] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[#A78BFA]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3
              id="duplicate-modal-title"
              className="text-lg font-semibold text-white text-center mb-2"
            >
              Duplicate Project
            </h3>
            <p id="duplicate-modal-desc" className="text-sm text-[#94A3B8] text-center mb-6">
              Create a copy of{" "}
              <span className="text-white font-medium">&ldquo;{project.name}&rdquo;</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#CBD5E1] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDuplicateConfirm(false);
                  handleDuplicate();
                }}
                disabled={duplicating}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 transition-colors"
              >
                {duplicating ? "Duplicating..." : "Duplicate"}
              </button>
            </div>
          </div>
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
