"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  maintenance: "bg-red-500/20 text-red-400 border-red-500/50",
};

export function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState("info");
  const [formExpiry, setFormExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchAnnouncements() {
    try {
      const res = await apiClient.get<{ data: Announcement[] }>("/api/admin/announcements");
      setAnnouncements(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function handleCreate() {
    if (!formTitle.trim() || !formMessage.trim() || creating) return;
    setCreating(true);
    try {
      await apiClient.post("/api/admin/announcements", {
        title: formTitle,
        message: formMessage,
        type: formType,
        active: true,
        ...(formExpiry && { expiresAt: new Date(formExpiry).toISOString() }),
      });
      showSuccess("Created", "Announcement published");
      setShowForm(false);
      setFormTitle("");
      setFormMessage("");
      setFormType("info");
      setFormExpiry("");
      fetchAnnouncements();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await apiClient.patch("/api/admin/announcements", { id, active: !active });
      fetchAnnouncements();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/api/admin/announcements?id=${id}`);
      showSuccess("Deleted", "Announcement removed");
      setDeletingId(null);
      fetchAnnouncements();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  function getStatusLabel(ann: Announcement): { label: string; color: string } {
    if (!ann.active) return { label: "Inactive", color: "text-[#64748B]" };
    if (ann.expiresAt && new Date(ann.expiresAt) < new Date())
      return { label: "Expired", color: "text-amber-400" };
    return { label: "Active", color: "text-emerald-400" };
  }

  if (loading) {
    return <div className="text-[#94A3B8] py-8 text-center">Loading announcements...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Announcements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {showForm ? "Cancel" : "New Announcement"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors"
            />
            <textarea
              placeholder="Message"
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              rows={3}
              className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors resize-none"
            />
            <div className="flex gap-3">
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <input
                type="datetime-local"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
                placeholder="Expires at (optional)"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !formTitle.trim() || !formMessage.trim()}
                className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                {creating ? "Creating..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6 text-center text-[#64748B]">
          No announcements yet
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => {
            const status = getStatusLabel(ann);
            return (
              <div
                key={ann.id}
                className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{ann.title}</h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${TYPE_BADGE[ann.type] || TYPE_BADGE.info}`}
                      >
                        {ann.type}
                      </span>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="text-sm text-[#94A3B8] mb-2">{ann.message}</p>
                    <div className="text-xs text-[#64748B]">
                      Created {new Date(ann.createdAt).toLocaleString()}
                      {ann.expiresAt && ` · Expires ${new Date(ann.expiresAt).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(ann.id, ann.active)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        ann.active
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-[rgba(79,70,229,0.2)] text-[#94A3B8] hover:bg-[rgba(79,70,229,0.3)]"
                      }`}
                    >
                      {ann.active ? "Deactivate" : "Activate"}
                    </button>
                    {deletingId === ann.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-[#94A3B8] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeletingId(ann.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
