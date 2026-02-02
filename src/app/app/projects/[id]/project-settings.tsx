"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description: string | null;
};

export function ProjectSettings({ project }: { project: Project }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/app");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border-b border-[rgba(79,70,229,0.2)] pb-4">
      <h3 className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
        Settings
      </h3>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
              Description
            </label>
            <textarea
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
              className="bg-[#4F46E5] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#6366F1] disabled:opacity-50 transition-all duration-200"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
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
        <div className="space-y-1">
          <button
            onClick={() => setIsEditing(true)}
            className="w-full text-left px-3 py-2 text-xs text-[#CBD5E1] hover:bg-[rgba(79,70,229,0.1)] hover:text-white rounded-lg transition-all duration-200"
          >
            Edit Project
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full text-left px-3 py-2 text-xs text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] rounded-lg disabled:opacity-50 transition-all duration-200"
          >
            {deleting ? "Deleting..." : "Delete Project"}
          </button>
        </div>
      )}
    </div>
  );
}
